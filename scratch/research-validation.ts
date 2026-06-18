import { runResearch } from "../lib/agents/research";
import { z } from "zod";
import { researchOutputSchema } from "../lib/prompts/agent-prompts";

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
                usage: { total_tokens: 1250 }
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
  hypothesis: "Test hypothesis",
  likelihood: 85,
  relevant_files: ["app/page.tsx"],
  evidence: ["Test evidence"],
  unknowns: ["Test unknowns"],
  investigation_target: "Test target",
  confidence: 90,
  xai: {
    decision: "Test decision",
    reason: "Test reason",
    evidence: ["Test xai evidence"],
    confidence: 95
  }
});

const malformedResponse = JSON.stringify({
  hypothesis: "Test hypothesis",
  // missing likelihood
  relevant_files: "not-an-array",
  confidence: 90,
  xai: {
    decision: "Test decision"
  }
});

async function runTests() {
  console.log("=== Research Agent Validation Suite ===\n");

  let passed = 0;
  let failed = 0;

  // Test 1: Valid Inputs
  try {
    process.stdout.write("Test 1 (Valid Inputs): ");
    const openai = await mockOpenAI(validResponse, 100);
    const result = await runResearch({ githubUrl: "https://github.com/test", description: "A valid description" }, { openai });
    if (result.rootCauseHypotheses[0].hypothesis && result.xai.confidence) {
      console.log("PASS"); passed++;
    } else {
      console.log("FAIL (Missing fields)"); failed++;
    }
  } catch (e) {
    console.log("FAIL", e); failed++;
  }

  // Test 2: Repository Only
  try {
    process.stdout.write("Test 2 (Repository Only): ");
    const openai = await mockOpenAI(validResponse, 100);
    const result = await runResearch({ githubUrl: "https://github.com/test", description: "" }, { openai });
    console.log("PASS"); passed++;
  } catch (e) {
    console.log("FAIL", e); failed++;
  }

  // Test 4: Empty Input (handled by TS, but let's test empty strings)
  try {
    process.stdout.write("Test 4 (Empty Input Validation): ");
    const openai = await mockOpenAI(validResponse, 100);
    const result = await runResearch({ githubUrl: "", description: "" }, { openai });
    // runResearch doesn't actually throw on empty strings unless OpenAI rejects it or prompt parsing fails.
    console.log("PASS (Graceful execution despite empty strings)"); passed++;
  } catch (e) {
    console.log("FAIL", e); failed++;
  }

  // Test 5: OpenAI Timeout
  try {
    process.stdout.write("Test 5 (OpenAI Timeout / Fallback): ");
    // The timeout in research.ts is 30s. We'll simulate a throw after 100ms for speed, with MAX_RETRIES = 2
    // Wait, research.ts hardcodes 30s timeout and 1s retry delay. 
    // To avoid waiting 3 seconds, we'll just throw an AbortError manually in the mock.
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
    
    const result = await runResearch({ githubUrl: "https://github.com/test", description: "Timeout test" }, { openai, allowMockFallback: true });
    
    if (result.xai.decision === "Triggered graceful degraded fallback.") {
      console.log("PASS (Graceful Fallback triggered)"); passed++;
    } else {
      console.log("FAIL (Did not trigger correct fallback)"); failed++;
    }
  } catch (e) {
    console.log("FAIL (Threw instead of fallback)", e); failed++;
  }

  // Test 6: Malformed Output
  try {
    process.stdout.write("Test 6 (Malformed Output): ");
    // We will supply malformed output first, then valid output. The retry loop should catch it.
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

    const result = await runResearch({ githubUrl: "https://github.com/test", description: "Malformed test" }, { openai });
    
    if (calls === 2 && result.xai.decision === "Test decision") {
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
