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
  })
  .strict();

export const contextDoctorAgentOutputSchema = z
  .object({
    diagnosis: z.string().min(1),
    missing_items: z.array(z.string().min(1)),
    severity: z.enum(["low", "medium", "high"]),
    confidence: z.number().min(0).max(1),
    xai: xaiSchema,
  })
  .strict();

export type ContextDoctorInput = z.infer<typeof contextDoctorInputSchema>;
export type ContextDoctorAgentOutput = z.infer<
  typeof contextDoctorAgentOutputSchema
>;

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
  "Set confidence from 0 to 1 and mirror the same calibrated confidence inside xai.confidence.",
].join(" ");

export async function runContextDoctor(
  rawInput: ContextDoctorInput,
  options: ContextDoctorOptions = {},
): Promise<ContextDoctorAgentOutput> {
  const input = contextDoctorInputSchema.parse(rawInput);
  const fetchImpl = options.fetchImpl ?? fetch;
  const metadata = await fetchRepositoryMetadata(input.githubUrl, fetchImpl);

  try {
    const client = createOpenAIClient(options.openai);
    const output = await requestContextDoctorDiagnosis(client, input, metadata, {
      model: options.model ?? DEFAULT_MODEL,
    });

    return contextDoctorAgentOutputSchema.parse(output);
  } catch (error) {
    if (options.allowMockFallback === false) {
      throw error;
    }

    return buildMockContextDoctorOutput(input, metadata, getErrorMessage(error));
  }
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

async function requestContextDoctorDiagnosis(
  client: OpenAI,
  input: ContextDoctorInput,
  metadata: GitHubRepositoryMetadata,
  options: { model: string },
): Promise<ContextDoctorAgentOutput> {
  const completion = await client.chat.completions.create({
    model: options.model,
    messages: buildMessages(input, metadata),
    response_format: zodResponseFormat(
      contextDoctorAgentOutputSchema,
      "context_doctor_diagnosis",
    ),
    temperature: 0.2,
  });

  const content = completion.choices[0]?.message.content;

  if (!content) {
    throw new Error("OpenAI response did not include message content.");
  }

  const parsed: unknown = JSON.parse(content);
  return contextDoctorAgentOutputSchema.parse(parsed);
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

function buildMockContextDoctorOutput(
  input: ContextDoctorInput,
  metadata: GitHubRepositoryMetadata,
  fallbackReason: string,
): ContextDoctorAgentOutput {
  const rootPaths = new Set(
    metadata.rootFiles.map((file) => file.path.toLowerCase()),
  );
  const missingItems = inferMissingItems(rootPaths, metadata);
  const severity = determineSeverity(missingItems, metadata);
  const confidence = metadata.source === "github_api" ? 0.66 : 0.48;

  return contextDoctorAgentOutputSchema.parse({
    diagnosis:
      missingItems.length > 0
        ? `Context Doctor found ${missingItems.length} missing context item(s) for ${input.githubUrl}.`
        : `Context Doctor did not find obvious missing top-level context for ${input.githubUrl}.`,
    missing_items: missingItems,
    severity,
    confidence,
    xai: {
      decision: "Used deterministic mock fallback for Context Doctor diagnosis.",
      reason: fallbackReason,
      evidence: [
        `Repository metadata source: ${metadata.source}`,
        `Root files inspected: ${metadata.rootFiles.length}`,
        `Description length: ${input.description.length}`,
      ],
      confidence,
    },
  });
}

function inferMissingItems(
  rootPaths: Set<string>,
  metadata: GitHubRepositoryMetadata,
): string[] {
  const missingItems: string[] = [];

  if (!hasAny(rootPaths, ["readme.md", "readme", "docs/readme.md"])) {
    missingItems.push("README with project purpose and setup instructions");
  }

  if (!hasPathMatching(rootPaths, ["openapi", "swagger", "api.md", "api.yaml"])) {
    missingItems.push("API specification or contract documentation");
  }

  if (!hasPathMatching(rootPaths, ["architecture", "system-design", "diagram"])) {
    missingItems.push("Architecture diagram or system overview");
  }

  if (!hasAny(rootPaths, [".env.example", "env.example", "example.env"])) {
    missingItems.push("Environment variable example file");
  }

  if (!hasPathMatching(rootPaths, ["test", "spec", "__tests__"])) {
    missingItems.push("Visible test plan or automated test directory");
  }

  if (metadata.source === "mock") {
    missingItems.push("Verified GitHub repository metadata");
  }

  return missingItems;
}

function determineSeverity(
  missingItems: string[],
  metadata: GitHubRepositoryMetadata,
): ContextDoctorAgentOutput["severity"] {
  if (metadata.source === "mock" || missingItems.length >= 4) {
    return "high";
  }

  if (missingItems.length >= 2) {
    return "medium";
  }

  return "low";
}

function hasAny(paths: Set<string>, candidates: string[]): boolean {
  return candidates.some((candidate) => paths.has(candidate));
}

function hasPathMatching(paths: Set<string>, fragments: string[]): boolean {
  return Array.from(paths).some((path) =>
    fragments.some((fragment) => path.includes(fragment)),
  );
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
  return error instanceof Error ? error.message : "Unknown error";
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
