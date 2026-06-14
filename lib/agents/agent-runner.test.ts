import { strict as assert } from "node:assert";

import { AgentOutputSchema } from "../schemas/api-schemas";
import {
  AGENT_CONFIG,
  generateMockAgentData,
  runAgentOrchestrator,
  type ChatCompletionClient,
  type ChatCompletionRequest,
} from "./agent-runner";

class FakeCompletionClient implements ChatCompletionClient {
  readonly requests: ChatCompletionRequest[] = [];

  async createChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<{
    content: string;
    totalTokens: number;
  }> {
    this.requests.push(request);

    const userMessage = request.messages.find((message) => message.role === "user");
    const payload = userMessage ? JSON.parse(userMessage.content) : {};
    const agentName =
      typeof payload === "object" &&
      payload !== null &&
      "agent" in payload &&
      typeof payload.agent === "object" &&
      payload.agent !== null &&
      "name" in payload.agent &&
      typeof payload.agent.name === "string"
        ? payload.agent.name
        : "Unknown Agent";

    return {
      content: JSON.stringify({
        xai: {
          decision: `Complete ${agentName}`,
          reason: `${agentName} received request context and produced structured output.`,
          evidence: [
            "Fake OpenAI client invoked",
            `Model: ${request.model}`,
            `Message count: ${request.messages.length}`,
          ],
          confidence: 0.9,
        },
        result: {
          agentName,
          provider: "fake-openai",
          summary: `${agentName} completed through the OpenAI code path.`,
        },
      }),
      totalTokens: 321,
    };
  }
}

const fakeClient = new FakeCompletionClient();
const response = await runAgentOrchestrator(
  {
    githubUrl: "https://github.com/openai/codex",
    description: "Inspect this repository for a hackathon demo readiness pass.",
  },
  {
    completionClient: fakeClient,
    allowOpenAIFallback: false,
  },
);

assert.equal(AGENT_CONFIG.length, 7);
assert.equal(AGENT_CONFIG.filter((agent) => agent.usesOpenAI).length, 2);
assert.equal(fakeClient.requests.length, 2);
assert.equal(response.agents.length, 7);
assert.deepEqual(
  response.agents.map((agent) => agent.name),
  AGENT_CONFIG.map((agent) => agent.name),
);
assert.equal(response.status, "success");

for (const agent of response.agents) {
  AgentOutputSchema.parse(agent);
  assert.equal(agent.status, "complete");
  assert.ok(agent.latencyMs >= 0);
  assert.ok(agent.xai.decision.length > 0);
  assert.ok(agent.xai.reason.length > 0);
  assert.ok(agent.xai.evidence.length > 0);
  assert.ok(agent.xai.confidence >= 0 && agent.xai.confidence <= 1);
  assert.ok(Object.keys(agent.result).length > 0);
}

const mockAgents = AGENT_CONFIG.filter((agent) => !agent.usesOpenAI);

for (const mockAgent of mockAgents) {
  const mockData = generateMockAgentData(mockAgent, {
    githubUrl: "https://github.com/openai/codex",
    description: "Inspect this repository for a hackathon demo readiness pass.",
    screenshot: null,
  });

  assert.ok(mockData.xai.decision.length > 0);
  assert.ok(mockData.xai.reason.length > 0);
  assert.ok(mockData.xai.evidence.length > 0);
  assert.ok(
    mockData.xai.confidence >= 0 && mockData.xai.confidence <= 1,
  );
}

assert.equal(response.evaluation.reliability, 100);
assert.ok(response.evaluation.confidence > 0);

console.log("agent-runner validation OK");
