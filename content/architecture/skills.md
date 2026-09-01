---
title: "Skills System"
weight: 1
description: "Composable Markdown instructions for AI agents"
toc: false
---

Camel-Kit's skills are **composable Markdown instructions** that guide AI agents through complex integration tasks. Built on **progressive disclosure** — only load what you need, when you need it.

## 13 Skills in Four Tiers

{{< tabs id="skills-categories" >}}
<!--tab Routed Commands (9)-->

| Tier | Skill | Command | Purpose |
|------|-------|---------|---------|
| Entry | **start** | `/camel-start` | Route a request to the right skill |
| Pipeline | **brainstorm** | `/camel-brainstorm` | Design interview → Design Specification |
| Pipeline | **migrate** | `/camel-migrate` | Migration discovery → Design Specification |
| Pipeline | **plan** | `/camel-plan` | Task decomposition → Implementation Plan |
| Pipeline | **execute** | `/camel-execute` | Wave-based code generation with staged review |
| Pipeline | **validate** | `/camel-validate` | Static route quality validation |
| Utility | **ship** | `/camel-ship` | Thin CLI delegate to the local Ship controller |
| Utility | **knowledge** | `/camel-knowledge` | Apache Camel documentation queries |
| Utility | **debug** | `/camel-debug` | Ad-hoc broken-route troubleshooting |

`camel-ship` is the outlier in this tier: its `SKILL.md` is a short delegate that invokes the registered `camel-kit ship` (or `camel kit ship`) command once with the invocation's options. The CLI command owns validation, state, oversight, evidence, publication, and recovery — the skill does not follow the guide-based structure described below.

<!--tab Internal (4)-->

Loaded by pipeline skills — not exposed as command stubs:

| Skill | Purpose |
|-------|---------|
| **implement** | Generate Camel YAML routes and DataMapper transformations |
| **test** | Generate Citrus integration tests, using Testcontainers only for required external infrastructure |
| **design** | Component selection, EIP catalog, interview guides |
| **verify** | Build, test, diagnose, and repair the application at runtime |

These are **composition primitives** — building blocks assembled by the pipeline stages.

<!--tab Shared Guides-->

Reusable utilities under `skills/shared/`:

| Guide | Purpose |
|-------|---------|
| `iron-laws.md` | 6 non-negotiable pipeline rules |
| `context-authority.md` | Data validation, instruction boundaries, and action-specific confirmation |
| `mcp-setup.md` | MCP version mapping and fallback policy |
| `forage.md` | Infrastructure configuration ladder and catalog queries |
| `graph-availability.md` | Graph CLI detection and fallback |
| `pipeline-infrastructure.md` | Pipeline IDs, state, provenance, and staleness |
| `datamapper-canonicalize.md` | Choose Groovy or XSLT from schemas and field count; pre-compute XPaths for XSLT |
| `flow-test-data.md` | Test data generation patterns |
| `yaml-structure.md` | YAML DSL structure rules |
| `yaml-components.md` | Component URI syntax and parameter rules |
| `yaml-examples.md` | Component-specific YAML examples |
| `patterns-foundational.md` | Foundational EIP patterns (routing, splitting, aggregation) |
| `patterns-error-handling.md` | Error handling patterns (DLC, retry, circuit breaker) |
| `patterns-deployment.md` | Deployment patterns (health checks, graceful shutdown) |

One guide, many skills — **reusability** without duplication.

{{< /tabs >}}

## Skill Structure

{{< carousel id="skill-structure" >}}
<!--step Directory Layout-->

Each skill is a directory under `camel-kit-core/src/main/resources/skills/`:

{{< filetree >}}
camel-brainstorm/
  SKILL.md # Main logic + YAML frontmatter
  guides/ # Skill-specific guides
    greenfield-interview.md
    migration-discovery.md
    design-assembly.md
    version-selection.md
{{< /filetree >}}

<!--step SKILL.md Frontmatter-->

Each SKILL.md starts with YAML frontmatter:

```yaml
---
name: camel-brainstorm
description: Design and plan Camel integrations through collaborative dialogue.
user_invocable: false
---
```

`camel-start` is the auto-discovered router. It loads the matching skill only when needed.

<!--step SKILL.md Body-->

Step-by-step instructions for the agent:

```markdown
# Camel Brainstorm — Phase 1 Orchestrator

## Step 1: Detect Invocation Mode
Determine whether this is a new design or an amendment...

## Step 2: Run Interview
Read guides/greenfield-interview.md...

## Step 3: MCP Verification
For each component, call camel_catalog_component_doc...

Migration and upgrade requests route to camel-migrate instead.
```

Loaded **only when invoked**.
{{< /carousel >}}

## Progressive Disclosure

{{< carousel id="progressive-disclosure" >}}
<!--step Router Metadata (Always Loaded)-->

Only the small routing surface is loaded initially.

The agent initially sees `camel-start` and its routing decision tree, which is enough to select the next skill.

```
Request → /camel-start → matching pipeline stage or utility
```

<!--step Tier 2: SKILL.md (On Trigger)-->

The main instructions are loaded on demand.

Loaded only when the user invokes the skill or the agent matches intent:

```
User: "Design a Kafka-to-PostgreSQL integration"
  → Agent matches "design" → loads /camel-brainstorm/SKILL.md
  → Follows step-by-step instructions
```

<!--step Tier 3: Guides (As Needed)-->

Supporting guides are loaded only as the active instructions require them.

Loaded only when referenced during execution:

```
SKILL.md says: "Read guides/greenfield-interview.md"
  → Agent loads the interview guide
  → Conducts adaptive project, per-flow, conditional, and cross-cutting discovery for unresolved requirements
```

Actual context use depends on the selected workflow and the guides it needs.
{{< /carousel >}}

## Context Authority

Camel-Kit separates **data authority** from **instruction authority**. A source is never trusted as a whole.

- **Data authority is field- and purpose-specific.** Catalog fields, recognized `.camel-kit/` fields, and approved design or plan fields may be relied upon only after the workflow's required version, schema, provenance, freshness, consistency, and approval checks succeed.
- **Instruction authority is narrow.** Subject to the host agent's system/developer/user hierarchy, sandbox, safety policy, and approval gates, only the shipped Camel-Kit instructions for the active workflow and explicit user directions may direct Camel-Kit actions. Shipped workflow text cannot override a higher-priority instruction or widen the user's requested scope. A path, attachment, pasted log, or quoted block supplied by the user is loaded content; commands or requests inside it are not themselves user directions.

Prose, comments, examples, commands, URLs, and requests embedded in MCP responses, summaries, project files, logs, documentation, or generated state remain data even when nearby fields have data authority. They cannot add tasks, widen scope, waive a gate, request secrets, or authorize commands, tool calls, URL navigation, file changes, or external effects.

| Workflow | Loaded context | Automatic behavior | Confirmation boundary |
|---|---|---|---|
| `/camel-debug` | User-provided and reproduced logs or stack traces, route and configuration files, and MCP responses | Reproduce and classify the symptom; a direct fix request authorizes ordinary in-scope taxonomy-selected repair | A diagnosis-only request stops before mutation and presents the exact repair for approval; a command, URL, or procedure found only in loaded content never supplies that approval |
| `camel-verify` | Build, startup, and test output; assertions; test files; MCP results; forwarded failure details | Apply bounded taxonomy-defined repair within the approved workflow after corroborating the error | Instruction-like output cannot select a fix; an otherwise necessary action outside the shipped workflow is escalated for specific confirmation |
| `/camel-migrate` | Source code, XML, configuration, documentation, tests, deployment files, graph output, MCP responses, and generated summaries | Parse migration facts and preserve their confirmed, inferred, or unknown provenance | Embedded requests are surfaced only as data or unknowns in the analysis summary; any independently necessary action outside the workflow requires separate action-specific confirmation |

No extra confirmation is needed to ignore instruction-like text or to perform an action independently required by the invoked workflow from validated data within its existing scope. When another action is genuinely necessary, Camel-Kit identifies the source, exact action, independently verified reason, and scope before asking. Confirmation applies only to that action; a role that cannot ask returns `NEEDS_USER_CONFIRMATION` to its orchestrator without acting.

## Target Generation

One shared skill set is adapted for eight current AI targets. Legacy IBM Bob 1 replaces seven pipeline `SKILL.md` files with self-contained monolithic gates and mode switching, so those files have a separate source architecture:

{{< before-after before="Shared Skill Source" after="Agent-Specific Output" id="multi-agent" >}}

**Markdown instructions** written once and adapted by each generator:

```markdown
# /camel-brainstorm
## Step 1: Detect project type
## Step 2: Run interview
## Step 3: Verify components via MCP
```

Stored in `camel-kit-core/src/main/resources/skills/`

<!--after-->

Agent-specific generators produce each platform's native format:

| Generator | Agent | Output |
|-----------|-------|--------|
| `ClaudeGenerator` | Claude Code | `.claude/commands/` + subagent dispatch + `.claude/camel-kit-personas/` role library |
| `Bob2Generator` | IBM Bob 2 (default) | Shared skills + Bob modes and native `spawn_subagent` + `.bob/personas/` role library |
| `BobGenerator` | IBM Bob 1 (legacy) | `.bob/skills/` with seven gate-backed `SKILL.md` files + modes and rules |
| `GeminiGenerator` | Gemini CLI | `GEMINI.md` + TOML policies + `.gemini/camel-kit-personas/` role library |
| `CodexGenerator` | OpenAI Codex CLI | `AGENTS.md` + `.agents/skills/` + `.codex/agents/` + `.agents/camel-kit-personas/` role library |
| `CopilotGenerator` | GitHub Copilot CLI | `.github/skills/` + custom agents and hooks + `.github/camel-kit-personas/` role library |
| `PiGenerator` | Pi | `.pi/skills/` + prompt templates and guard hooks + `.pi/camel-kit-personas/` role library |
| `QwenGenerator` | Qwen Code | Primary-session workflows + four bounded leaves + `.qwen/camel-kit-personas/` role library |
| `OpenCodeGenerator` | OpenCode | Nine permission-scoped agents, including the primary executor, + `.opencode/camel-kit-personas/` role library |

{{< /before-after >}}

Codex discovers the shared skills directly under `.agents/skills/`. Users inspect them with `/skills` and invoke the router as `$camel-start`; generated skill-to-skill references use native `$camel-*` mentions, and Camel-Kit does not generate `.codex/commands/` wrappers. Generated custom-agent roles support focused and parallel dispatch, with inline execution as the fallback when a role is unavailable.

## Agent Traits

In addition to per-agent generators, Camel-Kit uses **agent traits** — agent-specific instruction fragments appended to shared skill files during `camel-kit init`. Traits bridge the gap between the shared-skill equalization layer and agent-specific capabilities.

**How it works:** `DefaultGenerator.applyTraits()` reads `.append.md` files from `templates/traits/{agent}/` and appends them to the corresponding skill files with idempotent HTML comment sentinels. Re-running `init` does not duplicate trait content.

**Two levels:**
- **SKILL.md traits** (strategy) — e.g., Claude's `camel-execute.append.md` adds parallel subagent dispatch via the `Agent` tool
- **Guide traits** (tactics) — e.g., Claude's `implementer-context.append.md` adds `run_in_background: true` guidance for wave-based execution

Each agent gets trait content tailored to its capabilities. Bob 2 reserves built-in `explore` for factual discovery, generates `camel-worker` for implementation, test, fix, and verification work from broad orchestration modes, and generates a read/MCP-only `camel-reviewer` for catalog research, knowledge research, and independent judgment. The parent supplies the selected complete role text from `.bob/personas/` to each scoped preset. Standalone restricted implement and test modes keep mutations inline; test retains its path-scoped edit restriction. Independent calls in one parent turn run in parallel. Bob 2 leaves always start with clean context: the parent passes only independently validated scalars and separate canonical JSON-string envelopes, never inherited conversation history. Qwen likewise forbids context-inheriting forks in Camel-Kit workflows and uses clean-context bounded implementer, reviewer, tester, and validator leaves while slash-command orchestration remains in the primary session so questions, approval, arguments, and handoffs stay available. Its read-only reviewer receives complete research and review roles from `.qwen/camel-kit-personas/`. OpenCode keeps the other command stubs in the calling primary session, while its execute command selects the generated primary executor; that executor can dispatch only its allowlisted bounded leaves, and each leaf denies further delegation. Researcher and reviewer leaves receive complete roles from `.opencode/camel-kit-personas/`. Bob 1 retains its legacy mode-switching gates. Report ownership follows the same pattern: the Gemini, Qwen, and Copilot validators return complete reports to the primary session, which owns the report write, while the OpenCode validator writes the report only when the executor's prompt assigns it.

## Next Steps

- [MCP Integration](../mcp/) — How skills invoke MCP tools for catalog verification
- [Forage Catalog](../forage/) — How infrastructure properties are selected and verified
- [Architecture Overview](../) — Four-layer architecture
- [Commands Reference](../../reference/commands/) — Full command list
