import { runAgentOSInspection } from "../lib/agents/orchestrator";
import { runContextDoctor } from "../lib/agents/context-doctor";
import { runPlanner } from "../lib/agents/planner";
import { runResearch } from "../lib/agents/research";
import { runCoding } from "../lib/agents/coding";
import { runTesting } from "../lib/agents/testing";
import { runSecurity } from "../lib/agents/security";
import { runEvaluator } from "../lib/agents/evaluator";

async function main() {
  console.log("=== AgentOS System Validation ===");
  const issues: string[] = [];
  
  const addIssue = (severity: string, msg: string) => {
    issues.push(`[${severity}] ${msg}`);
    console.log(`❌ ${severity}: ${msg}`);
  };

  const agentInputs = {
    githubUrl: "https://github.com/agentos/repo",
    description: "Fixing authentication bug",
    screenshot: null
  };

  console.log("\n1. Testing Individual Agents (Mock Mode for API-independent tests)...");

  // Mock OpenAI client that returns empty or arbitrary json to test strictness/errors
  const mockOpenai = {
    chat: {
      completions: {
        create: async (opts: any) => {
          // If we want to simulate a hallucinated extra key, we can inspect the schema name
          const schemaName = opts.response_format?.json_schema?.name;
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  extra_key_hallucination: "This should break strict schemas",
                  // Injecting minimum required fields based on generic guesswork won't work perfectly
                  // so we just return something that might break Zod if strict
                })
              }
            }]
          };
        }
      }
    }
  } as any;

  try {
    await runResearch(agentInputs, { openai: mockOpenai, allowMockFallback: false });
    console.log("✅ Research agent gracefully handled AI response");
  } catch (e: any) {
    if (e.message.includes("Unrecognized key")) {
      addIssue("HIGH", "Research Agent schema is too strict and crashes on hallucinated keys.");
    }
  }

  try {
    await runCoding(agentInputs, { openai: mockOpenai, allowMockFallback: false });
    console.log("✅ Coding agent gracefully handled AI response");
  } catch (e: any) {
    if (e.message.includes("Unrecognized key") || e.message.includes("Invalid input")) {
      addIssue("HIGH", `Coding Agent schema parsing error: ${e.message}`);
    }
  }

  // Orchestrator Execution Order & Data Flow
  console.log("\n2. Testing Orchestrator Data Flow & Error Handling...");
  try {
    const res = await runAgentOSInspection({
      githubUrl: "https://github.com/agentos/repo",
      description: "Fixing authentication bug",
    });
    console.log("✅ Orchestrator successfully executed all agents and aggregated results");
    if (res.agents.length !== 7) {
      addIssue("HIGH", `Orchestrator returned ${res.agents.length} agents instead of 7.`);
    }
    const executionOrder = res.agents.map((a: any) => a.agentName).join(" -> ");
    console.log(`Execution Output Order: ${executionOrder}`);
  } catch (e: any) {
    addIssue("CRITICAL", `Orchestrator threw unhandled error during execution: ${e.message}`);
  }

  console.log("\n=== VALIDATION COMPLETE ===");
}

main().catch(console.error);
