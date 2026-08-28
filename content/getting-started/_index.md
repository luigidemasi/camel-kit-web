---
title: "Getting Started"
weight: 1
description: "Install camel-kit and create your first integration"
---

## Overview

Camel-Kit is an AI-guided integration development tool that transforms how you build Apache Camel integrations. Instead of writing code directly, you describe your integration requirements in natural language, and the AI handles design, planning, implementation, and verification.

## Installation Walkthrough

Follow these steps to install Camel-Kit and create your first integration project.

{{< carousel id="install-steps" >}}
<!--step Prerequisites-->
## Prerequisites

Before installing Camel-Kit, ensure you have:

- **Java 17 or higher** - Required for running Apache Camel and JBang
- **JBang** - CLI launcher for Camel-Kit
- **Camel JBang 4.18.0 or higher** - Required for the `camel kit` plugin channel and complete route execution and startup checks
- **Camel JBang test plugin** - Required for Citrus integration tests; install it with `camel plugin add test`
- **Docker (conditional)** - Required for external-service environment probes and [full Citrus/Testcontainers integration verification](../pipeline/verify/); design, planning, and non-container checks work without it

**Verify Java:**
```bash
java -version
```

**Install JBang:**

Visit [jbang.dev](https://jbang.dev) or use your package manager:

```bash
# macOS
brew install jbangdev/tap/jbang

# Linux
curl -Ls https://sh.jbang.dev | bash -s - app setup

# Windows
choco install jbang

# Install Camel JBang and its test plugin
jbang app install camel@apache/camel
camel plugin add test
```

<!--step Install Camel-Kit-->
## Install Camel-Kit

**Current development channel: JBang App Install (Recommended)**

The easiest way to install Camel-Kit:

```bash
jbang app install camel-kit@luigidemasi/camel-kit
```

This adds the `camel-kit` command to your PATH. The GitHub alias installs the latest deployed `0.3.2-SNAPSHOT`, which may lag `main` until the next deployment. Build from source when you need the exact current revision; both current channels provide the commands and AI targets described by this site.

**Verify installation:**
```bash
camel-kit --version
```

**Run without installing:**

```bash
jbang run camel-kit@luigidemasi/camel-kit init ...
```

**Stable channel: Camel JBang plugin 0.3.1**

Maven Central currently provides the stable `0.3.1` plugin. Pin that version explicitly:

```bash
camel plugin add kit \
  --gav io.github.luigidemasi:camel-jbang-plugin-kit:0.3.1 \
  --description "Design Apache Camel Integrations with AI"
```

Stable `0.3.1` exposes only `camel kit init` and the `bob`, `gemini`, and `claude` targets. It does not provide the current `0.3.2-SNAPSHOT` command or nine-agent surface; do not use a dynamic Maven version when you need current-source behavior.

<!--step Initialize Project-->
## Initialize Your First Project

Create a new integration project:

```bash
camel-kit init my-project --ai claude
cd my-project
```

The init command checks for prerequisites (Java 17+, JBang, Camel JBang, Camel test plugin) and reports their status. If the directory already contains a camel-kit project, it warns and exits — use `--force` to overwrite.

**What gets created:**

- `AGENTS.md` - Routing table for AI agents
- Agent-native skills and entry points - for example, `.claude/commands/` for Claude Code or `.agents/skills/` for Codex
- `docs/constitution.md` - Generated architecture rules
- `docs/flows/`, `test/data/`, and `schemas/` - Empty initialization scaffolds; generated pipeline artifacts use the selected runtime's paths
- `.camel-kit/` - Project configuration, cached catalogs, templates, and pipeline state
- Target-specific MCP configuration - JSON for most targets, `.codex/config.toml` for Codex, and `.mcp.json` consumed through `pi-mcp-adapter` for Pi
- `mvnw`, `mvnw.cmd`, and `.mvn/wrapper/maven-wrapper.properties` - Maven wrapper launchers and configuration

**Choose your AI agent:**

| Agent | Flag |
|-------|------|
| IBM Bob 2 | `--ai bob2` (default) |
| IBM Bob 1 | `--ai bob` (legacy) |
| Gemini CLI | `--ai gemini` |
| Claude Code | `--ai claude` |
| OpenAI Codex CLI | `--ai codex` |
| GitHub Copilot CLI | `--ai copilot` |
| Pi | `--ai pi` (then `pi install npm:pi-mcp-adapter@2.11.0`) |
| Qwen Code | `--ai qwen` |
| OpenCode | `--ai opencode` |

<!--step First Command-->
## Run Your First Command

**For greenfield development:**

Open your AI coding agent in the project directory and say:

```
I want to build an integration that reads from Kafka and writes to a database
```

The AI reads `AGENTS.md`, uses `/camel-start` to route the request to `/camel-brainstorm`, and guides you through design.

On the first run, no active pipeline ID exists yet. The agent asks you to create
one before the interview continues (see `camel-kit nextId` in the [command reference](../reference/commands/)):

```bash
camel-kit nextId kafka-to-database
# Camel JBang plugin equivalent: camel kit nextId kafka-to-database
```

With OpenAI Codex CLI, run `/skills` and invoke `$camel-start` instead; Codex discovers `.agents/skills/` directly and does not use slash-command stubs. See the [Codex setup guide](./codex/).

**For migration:**

```bash
camel-kit init --here --ai claude --source-platform mulesoft
```

Then tell your AI agent:

```
Migrate my MuleSoft flows to Camel
```

The AI invokes `/camel-migrate` and handles the conversion.

<!--step What's Next-->
## What's Next?

Now that you have Camel-Kit installed and a project initialized:

**Learn the pipeline:**
- Read the [Pipeline Overview](../pipeline/) to understand the four stages

**Choose your workflow:**
- [Greenfield Workflow](./greenfield/) - Build integrations from scratch
- [Migration Workflow](./migration/) - Convert existing integrations

**Configure your AI target:**
- [OpenAI Codex CLI](./codex/) - Repository trust, skills, custom agents, MCP, approvals, and sandboxing

**Explore features:**
- [Graph CLI](../architecture/graph/) - Migration analysis tools
- [Knowledge](../architecture/knowledge/) - Q&A about Camel components

**Get help:**
- Documentation at this site
- GitHub: [github.com/luigidemasi/camel-kit](https://github.com/luigidemasi/camel-kit)
- Community discussions in the repository
{{< /carousel >}}

## Two Workflows

Camel-Kit supports two integration workflows. Toggle to see each approach:

{{< before-after before="Greenfield Development" after="Platform Migration" id="workflows" >}}

Build new integrations from scratch using the **Design → Plan → Execute → Validate** pipeline:

1. Run `/camel-brainstorm` — AI interviews you about requirements
2. Review and approve the design specification
3. AI automatically decomposes into tasks and generates code
4. AI verifies the integration with runtime tests
5. AI runs the final static quality gate and reports findings without modifying routes

```bash
camel-kit init my-project --ai claude
# Then in your AI agent:
# "I want to build a Kafka-to-PostgreSQL integration"
```

→ [Greenfield Workflow guide](./greenfield/)

<!--after-->

Migrate existing integrations from other platforms:

- **MuleSoft Mule 3.x/4.x** — Analysis of Mule XML flows, DataWeave, and connectors
- **Microsoft BizTalk** — Orchestration, map, and pipeline migration
- **Apache Camel 2.x/3.x** — Modernize to Camel 4.x YAML DSL
- **JBoss Fuse** — Legacy Fuse/Karaf migration; Fuse projects are Camel 2.x/3.x codebases, so use `--source-platform camel` (or let `auto` detect the Fuse version qualifiers)

The AI auto-detects the source platform, records flow-specific analysis in one migration design package, and—after one approval—plans and executes the complete migration in dependency waves. It then runs one project-wide runtime verification pass and the final report-only validation gate.

```bash
camel-kit init --here --ai claude --source-platform mulesoft
# Then in your AI agent:
# "Migrate my MuleSoft flows to Camel"
```

→ [Migration Workflow guide](./migration/)

{{< /before-after >}}
