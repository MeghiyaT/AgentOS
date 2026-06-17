import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

import { xaiSchema } from "../prompts/agent-prompts";

export const contextDoctorInputSchema = z
  .object({
    githubUrl: z.string().url(),
    description: z.string().min(1),
    screenshot: z.string().min(1).nullable(),
  });

export const contextDoctorAgentOutputSchema = z
  .object({
    diagnosis: z.string().min(1),
    missing_items: z.array(z.string().min(1)),
    severity: z.enum(["low", "medium", "high"]),
    confidence: z.number().min(0).max(1),
    xai: xaiSchema,
  });

export type ContextDoctorInput = z.infer<typeof contextDoctorInputSchema>;
export type ContextDoctorAgentOutput = z.infer<typeof contextDoctorAgentOutputSchema>;

type GitHubRepositoryMetadata = {
  source: "github_api" | "mock";
  url: string;
  owner: string | null;
  repo: string | null;
  defaultBranch: string | null;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number | null;
  forks: number | null;
  openIssues: number | null;
  license: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  pushedAt: string | null;
  rootFiles: RepositoryFileSummary[];
  error?: string;
};

type RepositoryFileSummary = {
  path: string;
  type: "file" | "dir" | "symlink" | "submodule" | "unknown";
  size: number | null;
};

type ContextDoctorOptions = {
  openai?: OpenAI;
  model?: string;
  fetchImpl?: typeof fetch;
  allowMockFallback?: boolean;
};

const DEFAULT_MODEL = "gpt-4o";
const GITHUB_API_VERSION = "2022-11-28";

const CONTEXT_DOCTOR_SYSTEM_PROMPT = [
  "You are Context Doctor, the first live intelligence agent in AgentOS Inspector.",
  "Diagnose missing project context from repository metadata, the user description, and the optional screenshot reference.",
  "Prioritize missing docs, API specs, architecture diagrams, environment setup, contracts, runbooks, and demo blockers.",
  "Return only JSON that matches the provided schema.",
  "Keep missing_items short, concrete, and directly actionable.",
  "Set severity to low, medium, or high based on how much the missing context blocks accurate execution.",
  "Always populate the XAI decision, reason, evidence, and confidence (0-100) fields.",
].join(" ");

const aiContextDoctorSchema = z.object({
  diagnosis: z.string().min(1),
  missing_items: z.array(z.string().min(1)),
  severity: z.enum(["low", "medium", "high"]),
  xai: z.object({
    decision: z.string().min(1),
    reason: z.string().min(1),
    evidence: z.array(z.string().min(1)).min(1),
    confidence: z.number().min(0).max(100),
  }),
});

export async function runContextDoctor(
  rawInput: ContextDoctorInput,
  options: ContextDoctorOptions = {},
): Promise<ContextDoctorAgentOutput> {
  const startTime = Date.now();
  const input = contextDoctorInputSchema.parse(rawInput);
  const fetchImpl = options.fetchImpl ?? fetch;
  const metadata = await fetchRepositoryMetadata(input.githubUrl, fetchImpl);

  let attempts = 0;
  const MAX_RETRIES = 2;
  const TIMEOUT_MS = 30000;

  while (attempts <= MAX_RETRIES) {
    attempts++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const client = createOpenAIClient(options.openai);
      const completion = await client.chat.completions.create(
        {
          model: options.model ?? DEFAULT_MODEL,
          messages: buildMessages(input, metadata),
          response_format: zodResponseFormat(
            aiContextDoctorSchema,
            "context_doctor_diagnosis",
          ),
          temperature: 0.2,
        },
        { signal: controller.signal },
      );

      clearTimeout(timeoutId);

      const content = completion.choices[0]?.message.content;
      if (!content) {
        throw new Error("OpenAI response did not include message content.");
      }

      const parsed = aiContextDoctorSchema.parse(JSON.parse(content));
      const latencyMs = Date.now() - startTime;
      const tokens = completion.usage?.total_tokens ?? 0;

      return contextDoctorAgentOutputSchema.parse({
        diagnosis: parsed.diagnosis,
        missing_items: parsed.missing_items,
        severity: parsed.severity,
        confidence: parsed.xai.confidence / 100,
        xai: {
          decision: parsed.xai.decision,
          reason: parsed.xai.reason,
          evidence: [
            ...parsed.xai.evidence,
            `[Telemetry] Latency: ${latencyMs}ms`,
            `[Telemetry] Tokens: ${tokens}`,
          ],
          confidence: parsed.xai.confidence / 100,
        },
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (attempts > MAX_RETRIES) {
        if (options.allowMockFallback !== false) {
          return buildGracefulFallback(input, metadata, getErrorMessage(error), Date.now() - startTime);
        }
        throw error;
      }
      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
    }
  }

  return buildGracefulFallback(input, metadata, "Max retries exceeded", Date.now() - startTime);
}

export async function fetchRepositoryMetadata(
  githubUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GitHubRepositoryMetadata> {
  const parsed = parseGitHubRepositoryUrl(githubUrl);

  if (!parsed) {
    return buildMockRepositoryMetadata(
      githubUrl,
      "Unable to parse a GitHub owner and repository from the provided URL.",
    );
  }

  const headers = buildGitHubHeaders();

  try {
    const repositoryResponse = await fetchImpl(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
      { headers },
    );

    if (!repositoryResponse.ok) {
      throw new Error(
        `GitHub repository request failed with ${repositoryResponse.status}`,
      );
    }

    const repositoryJson: unknown = await repositoryResponse.json();
    const repository = repositoryApiResponseSchema.parse(repositoryJson);
    const defaultBranch = repository.default_branch ?? null;
    const rootFiles = defaultBranch
      ? await fetchRootFiles(parsed.owner, parsed.repo, defaultBranch, headers, fetchImpl)
      : [];

    return {
      source: "github_api",
      url: githubUrl,
      owner: parsed.owner,
      repo: parsed.repo,
      defaultBranch,
      description: repository.description ?? null,
      language: repository.language ?? null,
      topics: repository.topics ?? [],
      stars: repository.stargazers_count ?? null,
      forks: repository.forks_count ?? null,
      openIssues: repository.open_issues_count ?? null,
      license:
        repository.license?.spdx_id ??
        repository.license?.name ??
        null,
      createdAt: repository.created_at ?? null,
      updatedAt: repository.updated_at ?? null,
      pushedAt: repository.pushed_at ?? null,
      rootFiles,
    };
  } catch (error) {
    return buildMockRepositoryMetadata(githubUrl, getErrorMessage(error), parsed);
  }
}

function buildMessages(
  input: ContextDoctorInput,
  metadata: GitHubRepositoryMetadata,
): ChatCompletionMessageParam[] {
  const userPrompt = buildUserPrompt(input, metadata);

  if (input.screenshot && isRemoteImageReference(input.screenshot)) {
    return [
      { role: "system", content: CONTEXT_DOCTOR_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: input.screenshot } },
        ],
      },
    ];
  }

  return [
    { role: "system", content: CONTEXT_DOCTOR_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];
}

function buildUserPrompt(
  input: ContextDoctorInput,
  metadata: GitHubRepositoryMetadata,
): string {
  const screenshotContext = input.screenshot
    ? isRemoteImageReference(input.screenshot)
      ? "A screenshot image reference is attached as visual context."
      : `Screenshot context was provided as text or a local reference: ${input.screenshot.slice(0, 1_000)}`
    : "No screenshot was provided.";

  return [
    `Repository URL: ${input.githubUrl}`,
    `User description: ${input.description}`,
    screenshotContext,
    "GitHub repository metadata:",
    JSON.stringify(metadata, null, 2),
    "Return a diagnosis of missing context with severity, confidence, and XAI evidence.",
  ].join("\n\n");
}

function createOpenAIClient(client?: OpenAI): OpenAI {
  if (client) {
    return client;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for live Context Doctor runs.");
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function buildGracefulFallback(
  input: ContextDoctorInput,
  metadata: GitHubRepositoryMetadata,
  fallbackReason: string,
  latencyMs: number,
): ContextDoctorAgentOutput {
  return contextDoctorAgentOutputSchema.parse({
    diagnosis: `Context Doctor diagnosis degraded. Proceeding with caution.`,
    missing_items: [
      "AI diagnosis system was unreachable or timed out.",
      "Unable to verify environment setup or architecture docs dynamically."
    ],
    severity: "high",
    confidence: 0.1,
    xai: {
      decision: "Triggered graceful degraded fallback.",
      reason: `Context Doctor failed after retries: ${fallbackReason}`,
      evidence: [
        `Repository metadata source: ${metadata.source}`,
        `Root files inspected: ${metadata.rootFiles.length}`,
        `[Telemetry] Failed after ${latencyMs}ms`,
      ],
      confidence: 0.1,
    },
  });
}

async function fetchRootFiles(
  owner: string,
  repo: string,
  ref: string,
  headers: HeadersInit,
  fetchImpl: typeof fetch,
): Promise<RepositoryFileSummary[]> {
  const response = await fetchImpl(
    `https://api.github.com/repos/${owner}/${repo}/contents?ref=${encodeURIComponent(ref)}`,
    { headers },
  );

  if (!response.ok) {
    return [];
  }

  const contentsJson: unknown = await response.json();
  const contents = repositoryContentsApiResponseSchema.parse(contentsJson);

  return contents.map((item) => ({
    path: item.path ?? "unknown",
    type: toRepositoryFileType(item.type),
    size: item.size ?? null,
  }));
}

function parseGitHubRepositoryUrl(
  githubUrl: string,
): { owner: string; repo: string } | null {
  try {
    const url = new URL(githubUrl);
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (!url.hostname.endsWith("github.com") || pathParts.length < 2) {
      return null;
    }

    const [owner, rawRepo] = pathParts;

    if (!owner || !rawRepo) {
      return null;
    }

    return {
      owner,
      repo: rawRepo.replace(/\.git$/u, ""),
    };
  } catch {
    return null;
  }
}

function buildMockRepositoryMetadata(
  githubUrl: string,
  error: string,
  parsed?: { owner: string; repo: string } | null,
): GitHubRepositoryMetadata {
  return {
    source: "mock",
    url: githubUrl,
    owner: parsed?.owner ?? null,
    repo: parsed?.repo ?? null,
    defaultBranch: null,
    description: null,
    language: null,
    topics: [],
    stars: null,
    forks: null,
    openIssues: null,
    license: null,
    createdAt: null,
    updatedAt: null,
    pushedAt: null,
    rootFiles: [],
    error,
  };
}

function buildGitHubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "agentos-inspector-context-doctor",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

function toRepositoryFileType(
  value: string | undefined,
): RepositoryFileSummary["type"] {
  if (
    value === "file" ||
    value === "dir" ||
    value === "symlink" ||
    value === "submodule"
  ) {
    return value;
  }

  return "unknown";
}

function isRemoteImageReference(value: string): boolean {
  return /^https?:\/\//iu.test(value) || /^data:image\//iu.test(value);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "AbortError") return "API request timed out";
    return error.message;
  }
  return "Unknown error";
}

const repositoryApiResponseSchema = z
  .object({
    full_name: z.string().optional(),
    default_branch: z.string().optional(),
    description: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    topics: z.array(z.string()).optional(),
    stargazers_count: z.number().optional(),
    forks_count: z.number().optional(),
    open_issues_count: z.number().optional(),
    license: z
      .object({
        spdx_id: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    pushed_at: z.string().optional(),
  })
  .passthrough();

const repositoryContentsApiResponseSchema = z.array(
  z
    .object({
      path: z.string().optional(),
      type: z.string().optional(),
      size: z.number().optional(),
    })
    .passthrough(),
);
