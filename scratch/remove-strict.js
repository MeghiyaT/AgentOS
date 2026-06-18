const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  "lib/prompts/agent-prompts.ts",
  "lib/agents/research.ts",
  "lib/agents/planner.ts",
  "lib/agents/context-doctor.ts",
  "lib/agents/evaluator-mock.ts",
  "lib/agents/orchestrator.ts"
];

let totalReplaced = 0;

for (const relPath of filesToUpdate) {
  const absPath = path.join(__dirname, "..", relPath);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    continue;
  }

  let content = fs.readFileSync(absPath, 'utf8');
  const count = (content.match(/\.strict\(\)/g) || []).length;
  
  if (count > 0) {
    content = content.replace(/\.strict\(\)/g, "");
    fs.writeFileSync(absPath, content, 'utf8');
    console.log(`Replaced ${count} instances in ${relPath}`);
    totalReplaced += count;
  }
}

console.log(`Total .strict() removed: ${totalReplaced}`);
