---
title: "Architecture"
weight: 4
description: "Internal architecture for contributors and extenders"
---

Camel-Kit is built on a **4-layer architecture** designed for AI agent composability, cross-agent portability, and token efficiency. The system is designed around the principle: **"The prompt is the product"** — Camel-Kit ships instructions, not implementations.

## Four Layers

<div style="display: flex; flex-direction: column; gap: 0; margin: 1.5rem 0;">
  <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-bottom: none; padding: 1rem 1.25rem; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
    <div><strong style="color: var(--color-accent);">Layer 1</strong> &nbsp; AGENTS.md Routing</div>
    <div style="font-size: 0.8rem; color: var(--color-text-secondary);">Cross-agent equalization</div>
  </div>
  <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-bottom: none; padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center;">
    <div><strong style="color: var(--color-accent);">Layer 2</strong> &nbsp; Skills (Markdown Instructions)</div>
    <div style="font-size: 0.8rem; color: var(--color-text-secondary);">Composable, reusable guides</div>
  </div>
  <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-bottom: none; padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center;">
    <div><strong style="color: var(--color-accent);">Layer 3</strong> &nbsp; MCP Servers</div>
    <div style="font-size: 0.8rem; color: var(--color-text-secondary);">Real-time verification & search</div>
  </div>
  <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); padding: 1rem 1.25rem; border-radius: 0 0 12px 12px; display: flex; justify-content: space-between; align-items: center; opacity: 0.7;">
    <div><strong style="color: var(--color-accent);">Layer 4</strong> &nbsp; Graph CLI</div>
    <div style="font-size: 0.8rem; color: var(--color-text-secondary);">Code intelligence (optional)</div>
  </div>
</div>

{{< carousel id="four-layers" >}}
<!--step Layer 1: AGENTS.md Routing-->

Cross-agent routing specification shared across **5 agents** (Claude, Bob, Gemini, Qwen, OpenCode).

`AGENTS.md` contains:
- **Skill routing table** — maps user intents to the correct command
- **Iron Laws** — non-negotiable pipeline rules
- **MCP setup** — catalog and knowledge server configuration

This ensures **multi-agent parity** — same experience regardless of which AI agent.

<!--step Layer 2: Skills-->

**11 skills**, **97 guides**, **~18,649 lines** of composable Markdown instructions.

Skills are not code — they are structured prompts with step-by-step procedures, MCP tool invocations, conditionals, and shared guide imports.

- 8 user-invocable commands
- 3 internal composition primitives
- Progressive disclosure (load only what's needed)

[Learn more →](skills)

<!--step Layer 3: MCP Servers-->

**Two MCP servers** for real-time verification and knowledge search:

| Server | Purpose | Content |
|--------|---------|---------|
| **Camel MCP** | Catalog verification, route validation | Component catalog |
| **Knowledge MCP** | Hybrid semantic search | 166,973 indexed documents |

Significant context reduction — metadata loaded upfront, MCP queried on demand.

[Learn more →](mcp)

<!--step Layer 4: Graph CLI (Optional)-->

Code intelligence via a property graph built from **9 content parsers and 2 post-processors** (Camel YAML, Camel XML, Maven POM, Java with DI annotations, MuleSoft XML, DataWeave, Properties, Groovy, BizTalk + CrossLinker and PropertyBindingParser).

**Optional** — all skills work without it. When available:
- DI-aware dependency tracking (who injects what, through which interface)
- Dead code detection and impact analysis
- Structured migration context for route-by-route analysis
- Dynamic validation thresholds

**15 CLI subcommands** including `stats`, `find`, `dead-code`, `migration-context`, `visualize`.

[Learn more →](graph)
{{< /carousel >}}

**Graph CLI has 15 subcommands:**
- **Analysis:** stats, find, neighbors, path, subgraph
- **Camel-specific:** route-flow, impact, route-topology, dead-code
- **Context:** project-norms, project-context, route-context, migration-context
- **Output:** generate, visualize

[Learn more about graph intelligence →](graph)



## The Prompt Is the Product

Camel-Kit's architecture embodies a key principle: **the prompt is the product**. Unlike traditional code generators that ship Java/Python implementations, Camel-Kit ships:

- **Markdown guides** that instruct AI agents how to generate code
- **MCP tool definitions** for real-time verification
- **Graph parsers** for code analysis (optional)

This means:

- **No vendor lock-in** — Skills work on any agent (Claude, Gemini, Qwen, etc.)
- **Easy customization** — Edit Markdown files to change behavior
- **Version-independent** — No recompilation when Camel versions change
- **Transparent** — Users can read the exact instructions agents follow

## Progressive Disclosure

Skills use **progressive disclosure** to minimize token usage:

1. **Metadata** (always loaded) — Skill name, description, trigger patterns (~50 tokens/skill)
2. **SKILL.md** (on trigger) — Main skill logic, loaded only when invoked (~500-2000 tokens)
3. **Guides** (as needed) — Shared utilities, loaded only when referenced (~100-500 tokens each)

Example flow:

```
User: "Create a Camel project for order processing"
  → Agent sees "start a new Camel project" in AGENTS.md
  → Agent loads /camel-project/SKILL.md
  → SKILL.md references {{GUIDE:shared/camel-constitution.md}}
  → Agent loads constitution guide
  → Agent generates project requirements
```

This progressive loading keeps context usage minimal while maintaining full catalog coverage.

## Context Efficiency

By combining progressive disclosure and MCP on-demand queries, Camel-Kit avoids loading full component catalogs into the agent's context. This enables:

- **Faster agent responses** — less context to process per turn
- **Support for smaller models** — fits within constrained context windows
- **Cost reduction** — fewer input tokens per request
- **Full coverage** — every component is still verifiable via MCP

## Next Steps

- [Skills System](skills) — Deep dive into the 11 skills and 97 guides
- [MCP Integration](mcp) — How catalog verification and knowledge search work
- [Graph Intelligence](graph) — Property graph analysis with 9 parsers
- [Environment-in-the-Loop](eitl) — How the execution environment drives code refinement
