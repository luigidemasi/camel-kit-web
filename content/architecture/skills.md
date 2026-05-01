---
title: "Skills System"
weight: 1
description: "Composable Markdown instructions for AI agents"
toc: false
---

Camel-Kit's skills are **composable Markdown instructions** that guide AI agents through complex integration tasks. Built on **progressive disclosure** — only load what you need, when you need it.

## 11 Skills in Three Categories

{{< tabs id="skills-categories" >}}
<!--tab User-Invocable (9)-->

| Skill | Command | Purpose |
|-------|---------|---------|
| **brainstorm** | `/camel-brainstorm` | Design interview → Design Specification |
| **plan** | `/camel-plan` | Task decomposition → Implementation Plan |
| **execute** | `/camel-execute` | Wave-based code generation with two-stage review |
| **verify** | `/camel-verify` | 5-phase runtime verification loop |
| **ship** | `/camel-ship` | Autonomous pipeline (brainstorm → plan → execute → verify) |
| **flow** | `/camel-flow` | Greenfield shortcut into brainstorm |
| **migrate** | `/camel-migrate` | Migration shortcut into brainstorm |
| **validate** | `/camel-validate` | Standalone route validation |
| **knowledge** | `/camel-knowledge` | Apache Camel documentation queries |

<!--tab Internal (3)-->

Loaded automatically by `/camel-execute` — not user-invocable:

| Skill | Purpose |
|-------|---------|
| **implement** | Generate Camel YAML routes and DataMapper transformations |
| **test** | Generate Citrus integration tests with Testcontainers |
| **design** | Component selection, EIP catalog, interview guides |

These are **composition primitives** — building blocks that the execute orchestrator assembles.

<!--tab Shared Guides (97)-->

**~18,649 lines** of shared utilities under `skills/shared/`:

| Guide | Purpose |
|-------|---------|
| `iron-laws.md` | 4 non-negotiable pipeline rules |
| `mcp-setup.md` | MCP version mapping and fallback policy |
| `graph-availability.md` | Graph CLI detection and fallback |
| `datamapper-canonicalize.md` | Pre-compute XPaths for XSLT |
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
description: Use when the user wants to create a new Camel integration
user_invocable: true
---
```

This is **always loaded** (~50 tokens) to help agents decide which skill to invoke.

<!--step SKILL.md Body-->

Step-by-step instructions for the agent:

```markdown
# Camel Brainstorm — Phase 1 Orchestrator

## Step 1: Detect Project Type
Determine if greenfield or migration...

## Step 2: Run Interview
Read guides/greenfield-interview.md...

## Step 3: MCP Verification
For each component, call camel_catalog_component...
```

Loaded **only when invoked** (~500-2000 tokens).
{{< /carousel >}}

## Progressive Disclosure

{{< carousel id="progressive-disclosure" >}}
<!--step Tier 1: Frontmatter (Always Loaded)-->

**~550 tokens** (50 tokens × 11 skills)

The agent always sees skill names and descriptions — enough to route user requests to the right skill.

```
Skills Available:
- /camel-brainstorm — Design interview
- /camel-plan — Task decomposition
- /camel-execute — Code generation
...
```

<!--step Tier 2: SKILL.md (On Trigger)-->

**~500-2000 tokens** per skill

Loaded only when the user invokes the skill or the agent matches intent:

```
User: "Design a Kafka-to-PostgreSQL integration"
  → Agent matches "design" → loads /camel-brainstorm/SKILL.md
  → Follows step-by-step instructions
```

<!--step Tier 3: Guides (As Needed)-->

**~100-500 tokens** per guide

Loaded only when referenced during execution:

```
SKILL.md says: "Read guides/greenfield-interview.md"
  → Agent loads the interview guide
  → Conducts the 6-area Socratic interview
```

Total for a typical invocation: **1,000-3,000 tokens**.
{{< /carousel >}}

## Multi-Agent Parity

One set of skills works across **5 AI agents** via agent-specific generators:

{{< before-after before="Same Skill Source" after="Agent-Specific Output" id="multi-agent" >}}

**Markdown instructions** written once:

```markdown
# /camel-brainstorm
## Step 1: Detect project type
## Step 2: Run interview
## Step 3: Verify components via MCP
```

Stored in `camel-kit-core/src/main/resources/skills/`

<!--after-->

**5 generators** produce agent-specific formats:

| Generator | Agent | Output |
|-----------|-------|--------|
| `ClaudeGenerator` | Claude Code | `.claude/commands/` + subagent dispatch |
| `BobGenerator` | IBM Bob | `.bob/gates/` + mode switching |
| `GeminiGenerator` | Gemini CLI | `GEMINI.md` + TOML policies |
| `QwenGenerator` | Qwen | `.qwen/agents/` + auto-delegation |
| `OpenCodeGenerator` | OpenCode | `AGENTS.md` + permission profiles |

{{< /before-after >}}

## Agent Traits

In addition to per-agent generators, Camel-Kit uses **agent traits** — agent-specific instruction fragments appended to shared skill files during `camel-kit init`. Traits bridge the gap between the equalization layer (identical skills) and agent-specific capabilities.

**How it works:** `DefaultGenerator.applyTraits()` reads `.append.md` files from `templates/traits/{agent}/` and appends them to the corresponding skill files with idempotent HTML comment sentinels. Re-running `init` does not duplicate trait content.

**Two levels:**
- **SKILL.md traits** (strategy) — e.g., Claude's `camel-execute.append.md` adds parallel subagent dispatch via the `Agent` tool
- **Guide traits** (tactics) — e.g., Claude's `implementer-context.append.md` adds `run_in_background: true` guidance for wave-based execution

Each agent gets different trait content tailored to its capabilities: Claude traits reference `Agent`, `ScheduleWakeup`, `EnterWorktree`; Gemini traits reference `save_memory`, `read_many_files`; Bob traits reference `switch_mode`, `insert_content`.

## Next Steps

- [MCP Integration](../mcp/) — How skills invoke MCP tools for catalog verification
- [Architecture Overview](../) — Four-layer architecture
- [Commands Reference](../../reference/commands/) — Full command list
