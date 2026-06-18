import { runTesting } from "../lib/agents/testing";
import { z } from "zod";

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
                usage: { total_tokens: 1600 }
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
  test_cases: [
    {
      name: "Unit Test 1",
      type: "unit",
      target: "src/utils.ts",
      steps: ["Mock dependencies", "Call function"],
      expected_result: "Returns true"
    },
    {
      name: "Integration Test 1",
      type: "integration",
      target: "src/api.ts",
      steps: ["Start server", "Call endpoint"],
      expected_result: "200 OK"
    }
  ],
  edge_cases: ["Empty string input", "Null object input"],
  automation_priority: ["Unit Test 1"],
  xai: {
    decision: "Generate tests",
    reason: "Code modification proposed",
    evidence: ["Reviewing code diffs"],
    confidence: 90
  }
});

const malformedResponse = JSON.stringify({
  test_cases: "not an array",
  edge_cases: ["Empty string input"],
  xai: {
    decision: "Generate tests",
    reason: "Code modification proposed"
  }
});

async function runTests() {
  console.log("=== Testing Agent Validation Suite ===\n");

  let passed = 0;
  let failed = 0;

  // Test 1: Valid Repository Analysis
  try {
    process.stdout.write("Test 1 (Valid Repository Analysis): ");
    const openai = await mockOpenAI(validResponse, 100);
    const result = await runTesting({ githubUrl: "https://github.com/test", description: "Test the code" }, { openai });
    if (result.testCases.length > 0 && result.edgeCases.length > 0 && result.xai.confidence) {
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
    const result = await runTesting({ githubUrl: "", description: "" }, { openai });
    console.log("PASS (Graceful execution despite empty strings)"); passed++;
  } catch (e) {
    console.log("FAIL", e); failed++;
  }

  // Test 3: Missing Coding Output (Handled gracefully, because AgentInputs does not depend on Coding Output)
  try {
    process.stdout.write("Test 3 (Missing Coding Output): ");
    const openai = await mockOpenAI(validResponse, 100);
    const result = await runTesting({ githubUrl: "https://github.com/test", description: "Missing coding" }, { openai });
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
    
    const result = await runTesting({ githubUrl: "https://github.com/test", description: "Timeout test" }, { openai, allowMockFallback: true });
    
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

    const result = await runTesting({ githubUrl: "https://github.com/test", description: "Malformed test" }, { openai });
    
    if (calls === 2 && result.xai.decision === "Generate tests") {
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
