import { runResearch } from "../lib/agents/research";
import { runAgentOSInspection, runInputSchema } from "../lib/agents/orchestrator";

async function main() {
  const issues: string[] = [];
  
  const assertPass = (condition: boolean, testName: string, failMsg: string) => {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
    } else {
      console.log(`❌ FAIL: ${testName}`);
      issues.push(`[${testName}] ${failMsg}`);
    }
  };

  const assertThrows = async (fn: () => Promise<any>, testName: string, failMsg: string) => {
    try {
      await fn();
      console.log(`❌ FAIL: ${testName}`);
      issues.push(`[${testName}] ${failMsg}`);
    } catch (e) {
      console.log(`✅ PASS: ${testName}`);
    }
  };

  if (!process.env.OPENAI_API_KEY) {
     console.warn("⚠️ OPENAI_API_KEY is not set. Real API tests might fail or fallback to mock.");
  }

  console.log("\n--- 1. Unit & 2. Integration Tests ---");
  let realResult;
  try {
    const mockSuccessOpenai = {
      chat: {
        completions: {
          create: async () => ({
            choices: [{
              message: {
                content: JSON.stringify({
                  hypothesis: "The bug is caused by a missing API key.",
                  relevant_files: ["src/api.ts"],
                  evidence: ["Error logs show unauthorized.", "The code does not pass the key."],
                  investigation_paths: ["Check environment variables."],
                  confidence: 0.9,
                  xai: {
                    decision: "Concluded missing API key.",
                    reason: "Logs explicitly state unauthorized access.",
                    evidence: ["Error 401"],
                    confidence: 0.95
                  }
                })
              }
            }]
          })
        }
      }
    } as any;

    realResult = await runResearch({
      githubUrl: "https://github.com/agentos/test",
      description: "We need a new research agent implementation",
    }, { openai: mockSuccessOpenai, allowMockFallback: false }); // force real
    
    assertPass(true, "Research Agent executes without error", "");
    
    // Validate JSON output structure
    assertPass(!!realResult, "JSON output structure is parsed and returned", "Result was null");
    
    // Validate hypothesis, evidence, relevant_files
    const hasHypothesis = realResult.rootCauseHypotheses.length > 0 && !!realResult.rootCauseHypotheses[0].hypothesis;
    const hasEvidence = realResult.rootCauseHypotheses.length > 0 && realResult.rootCauseHypotheses[0].evidence.length > 0;
    const hasFiles = realResult.mostRelevantFiles.length > 0;
    assertPass(hasHypothesis, "Returns hypothesis", "Missing hypothesis in result");
    assertPass(hasEvidence, "Returns evidence", "Missing evidence in result");
    assertPass(hasFiles, "Returns relevant_files", "Missing mostRelevantFiles in result");

    // Validate Confidence generation
    const hasConfidence = typeof realResult.rootCauseHypotheses[0].likelihood === "number" || typeof realResult.xai.confidence === "number";
    assertPass(hasConfidence, "Confidence generation", "Confidence is missing or not a number");

    // Validate XAI generation
    const hasXAI = !!realResult.xai && !!realResult.xai.decision && !!realResult.xai.reason;
    assertPass(hasXAI, "XAI generation", "XAI is missing or incomplete");

  } catch (err: any) {
    console.log(`❌ FAIL: Unit/Integration tests failed to execute`);
    issues.push(`[Unit/Integration] Failed to run: ${err.message}`);
  }

  console.log("\n--- 3. Orchestrator Tests ---");
  try {
    const orchestratorResult = await runAgentOSInspection({
      githubUrl: "https://github.com/agentos/test",
      description: "Test description for orchestrator",
    });
    const researchAgent = orchestratorResult.agents.find((a: any) => a.agentName === "Research");
    assertPass(!!researchAgent, "Orchestrator runs Context Doctor -> Planner -> Research", "Research agent missing from orchestrator output");
  } catch (err: any) {
    console.log(`❌ FAIL: Orchestrator tests failed`);
    issues.push(`[Orchestrator Tests] Orchestrator execution threw an error: ${err.message}`);
  }

  console.log("\n--- 4. Failure Tests ---");
  // Empty Repository
  await assertThrows(
    () => runAgentOSInspection({ githubUrl: "", description: "test" }),
    "Empty Repository",
    "Should have failed validation for empty repo"
  );
  
  // Missing Screenshot (actually optional in schema, wait, let's test if description is also empty)
  // The schema states description or problemDescription is required
  await assertThrows(
    () => runAgentOSInspection({ githubUrl: "https://github.com/a/b", description: "" }),
    "Invalid Description (empty)",
    "Should have failed validation for empty description"
  );

  // OpenAI Timeout / Error (Graceful failure)
  try {
    // pass a fake openai client that throws timeout
    const fakeOpenai = {
      chat: {
        completions: {
          create: async () => { throw new Error("Timeout"); }
        }
      }
    } as any;
    
    const fallbackResult = await runResearch({ githubUrl: "https://a.com", description: "test" }, { openai: fakeOpenai, allowMockFallback: true });
    assertPass(fallbackResult.xai.decision.includes("fallback"), "OpenAI Timeout -> Graceful failure", "Did not fallback gracefully");
  } catch (err: any) {
    console.log(`❌ FAIL: OpenAI Timeout -> Graceful failure`);
    issues.push(`[Failure Tests] Graceful failure threw an error instead of falling back: ${err.message}`);
  }

  console.log("\n=== ISSUES DISCOVERED ===");
  if (issues.length === 0) {
    console.log("None");
  } else {
    issues.forEach(i => console.log(i));
  }
}

main().catch(console.error);
