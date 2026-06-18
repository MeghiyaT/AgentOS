# AgentOS Inspector

AgentOS Inspector is a multi-agent orchestration platform designed to automate code analysis, planning, and implementation. By taking a GitHub repository URL and a problem description, AgentOS coordinates a specialized suite of AI agents to diagnose issues, plan solutions, research root causes, propose code modifications, write tests, run security audits, and evaluate the final output.

## Table of Contents

- [Overview](#overview)
- [Architecture & Data Flow](#architecture--data-flow)
- [The Agent Suite](#the-agent-suite)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Scripts](#scripts)

## Overview

Traditional AI coding assistants act as a single general-purpose brain. AgentOS breaks down the software development lifecycle into distinct, highly specialized agents. The orchestrator routes data between these agents, mimicking a real engineering team where a product manager, security engineer, and developer collaborate to resolve an issue.

## Architecture & Data Flow

The core orchestration happens in `lib/agents/orchestrator.ts`. The general data flow is as follows:

1. **Input Normalization**: The user provides a GitHub repository URL and a description of the issue or feature.
2. **Context Doctor**: Analyzes the input to ensure sufficient context is provided. If the prompt health is "blocked" or "needs-context", the system flags it.
3. **Planner**: Creates an execution plan with milestones and task dependencies.
4. **Parallel Execution**: 
   - **Research Agent**: Investigates the codebase to find root causes and relevant files.
   - **Coding Agent**: Proposes file modifications, implementation notes, and rollback plans.
   - **Testing Agent**: Generates test cases and prioritizes automation strategies.
   - **Security Agent**: Scans for vulnerabilities, assigns a risk score, and proposes mitigations.
   - **Evaluator**: Independently scores the overall quality, accuracy, and reliability of the proposed solution.
5. **Aggregation**: The orchestrator aggregates all agent outputs, calculates execution metrics (latency, cost), and returns a unified `AgentRunResponse`.

## The Agent Suite

Each agent operates on strict, heavily typed schemas (enforced by `Zod`) to guarantee predictable outputs:

- **Context Doctor**: Ensures the prompt has enough information to proceed.
- **Planner**: Breaks down the problem into achievable tasks.
- **Research**: Finds root causes and related context in the codebase.
- **Coding**: Formulates the exact changes and rollback plans.
- **Testing**: Writes edge cases and unit tests for the proposed changes.
- **Security**: Identifies architectural or implementation-level vulnerabilities.
- **Evaluator**: Audits the overall plan and checks for hallucination risks.

## Tech Stack

### Frontend & UI
- **Framework**: [Next.js 15.5](https://nextjs.org/) with App Router and Turbopack
- **Styling**: Tailwind CSS (v4)
- **UI Components**: Radix UI, Shadcn UI (`@base-ui/react`, `@radix-ui/*`)
- **Animations**: Framer Motion, GSAP, and Lenis (smooth scrolling)
- **Diagrams/Visuals**: React Flow (`@xyflow/react`), Mermaid

### AI & Backend
- **LLM Integration**: OpenAI SDK (`openai`)
- **Validation**: Zod (for strict JSON schema enforcement)
- **State Management**: Zustand
- **Language**: TypeScript

## Getting Started

### Prerequisites
- Node.js (v20+)
- An OpenAI API Key (`OPENAI_API_KEY`)

### Installation

1. Clone the repository and navigate into the directory.
2. Install the dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables. Create a `.env` or `.env.local` file in the root directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. Start the development server using Turbopack:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

- `npm run dev`: Starts the Next.js development server with Turbopack.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the Next.js production server.
- `npm run lint`: Runs ESLint to catch potential errors.
- `npm run typecheck`: Runs the TypeScript compiler to check for type errors without emitting files.
- `npm run test`: Runs the primary schema tests (`tsx lib/agents/agent-schema.test.ts`).
