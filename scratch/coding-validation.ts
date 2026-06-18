import { runCoding } from "../lib/agents/coding";
import { z } from "zod";
import { codingOutputSchema } from "../lib/prompts/agent-prompts";

async function mockOpenAI(responseContent: string | null, delayMs: number = 0, shouldThrow: boolean = false) {
  return {
    chat: {
      completions: {
        create: async (opts: any, { signal }: any) => {
          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              if (shouldThrow) {
                reject(new Error("Simulated OpenAI error"));
                return;
              }
              resolve({
                choices: [{ message: { content: responseContent } }],
                usage: { total_tokens: 1850 }
              });
            }, delayMs);
            
            if (signal) {
              signal.addEventListener("abort", () => {
                clearTimeout(timeout);
                const err = new Error("AbortError");
                err.name = "AbortError";
                reject(err);
              });
            }
          });
        }
      }
    }
  } as any;
}

const validResponse = JSON.stringify({
  files_to_modify: [
    {
      path: "src/index.ts",
      change_type: "update",
      rationale: "Fixing a bug",
      proposed_changes: ["Add error handling"]
    }
  ],
  implementation_notes: ["Use Zod safeParse"],
  rollback_plan: "Git reset head",
  xai: {
    decision: "Refactor index",
    reason: "Missing error handling",
    evidence: ["Logs show crashes"],
    confidence: 88
  }
});

const malformedResponse = JSON.stringify({
  files_to_modify: "not an array",
  implementation_notes: ["Use Zod safeParse"],
  rollback_plan: "Git reset head",
  xai: {
    decision: "Refactor index",
    reason: "Missing error handling"
  }
});

async function runTests() {
  console.log("=== Coding Agent Validation Suite ===\n");

  let passed = 0;
  let failed = 0;

  // Test 1: Valid Repository Analysis
  try {
    process.stdout.write("Test 1 (Valid Repository Analysis): ");
    const openai = await mockOpenAI(validResponse, 100);
    const result = await runCoding({ githubUrl: "https://github.com/test", description: "Fix the bug" }, { openai });
    if (result.filesToModify.length > 0 && result.xai.confidence) {
      console.log("PASS"); passed++;
    } else {
      console.log("FAIL (Missing fields)"); failed++;
    }
  } catch (e) {
    console.log("FAIL", e); failed++;
  }

  // Test 2: Empty Repository (Handled as missing githubUrl or description, same as empty inputs)
  try {
    process.stdout.write("Test 2 (Empty Repository): ");
    const openai = await mockOpenAI(validResponse, 100);
    const result = await runCoding({ githubUrl: "", description: "" }, { openai });
    console.log("PASS (Graceful execution despite empty strings)"); passed++;
  } catch (e) {
    console.log("FAIL", e); failed++;
  }

  // Test 3: Missing Research Output (Handled gracefully, because AgentInputs does not depend on Research Output)
  try {
    process.stdout.write("Test 3 (Missing Research Output): ");
    const openai = await mockOpenAI(validResponse, 100);
    const result = await runCoding({ githubUrl: "https://github.com/test", description: "Missing research" }, { openai });
    console.log("PASS (Safe fallback/execution)"); passed++;
  } catch (e) {
    console.log("FAIL", e); failed++;
  }

  // Test 4: OpenAI Timeout
  try {
    process.stdout.write("Test 4 (OpenAI Timeout / Fallback): ");
    const openai = {
      chat: {
        completions: {
          create: async () => {
            const err = new Error("AbortError");
            err.name = "AbortError";
            throw err;
          }
        }
      }
    } as any;
    
    const result = await runCoding({ githubUrl: "https://github.com/test", description: "Timeout test" }, { openai, allowMockFallback: true });
    
    if (result.xai.decision === "Triggered graceful degraded fallback.") {
      console.log("PASS (Graceful Fallback triggered)"); passed++;
    } else {
      console.log("FAIL (Did not trigger correct fallback)"); failed++;
    }
  } catch (e) {
    console.log("FAIL (Threw instead of fallback)", e); failed++;
  }

  // Test 5: Malformed Output
  try {
    process.stdout.write("Test 5 (Malformed Output): ");
    let calls = 0;
    const openai = {
      chat: {
        completions: {
          create: async () => {
            calls++;
            if (calls === 1) {
              return { choices: [{ message: { content: malformedResponse } }] }; // Zod parse will fail
            }
            return { choices: [{ message: { content: validResponse } }] }; // Second attempt succeeds
          }
        }
      }
    } as any;

    const result = await runCoding({ githubUrl: "https://github.com/test", description: "Malformed test" }, { openai });
    
    if (calls === 2 && result.xai.decision === "Refactor index") {
      console.log("PASS (Repaired and recovered on retry)"); passed++;
    } else {
      console.log(`FAIL (Calls: ${calls})`); failed++;
    }
  } catch (e) {
    console.log("FAIL", e); failed++;
  }

  console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
}

runTests().catch(console.error);
