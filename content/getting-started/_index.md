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
- **JBang 0.120.0 or higher** - The scripting engine that powers Camel-Kit

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
```

<!--step Install Camel-Kit-->
## Install Camel-Kit

**Method 1: JBang App Install (Recommended)**

The easiest way to install Camel-Kit:

```bash
jbang app install camel-kit@luigidemasi/camel-kit
```

This adds the `camel-kit` command to your PATH.

**Verify installation:**
```bash
camel-kit --version
```

**Alternative Methods:**

- **Run without installing:** `jbang camel-kit@luigidemasi/camel-kit init ...`
- **Camel JBang plugin:** `camel plugin add camel-kit`

<!--step Initialize Project-->
## Initialize Your First Project

Create a new integration project:

```bash
camel-kit init my-project --ai claude
cd my-project
```

**What gets created:**

- `AGENTS.md` - Routing table for AI agents
- `.claude/commands/` - Pipeline phase slash commands
- `.camel-kit/` - Governance documents (constitution, iron-laws)
- `.mcp.json` - Catalog integration config

**Choose your AI agent:**

| Agent | Flag |
|-------|------|
| Claude Code | `--ai claude` (recommended) |
| IBM Bob | `--ai bob` |
| Gemini CLI | `--ai gemini` |
| Qwen | `--ai qwen` |
| OpenCode | `--ai opencode` |

<!--step First Command-->
## Run Your First Command

**For greenfield development:**

Open your AI coding agent in the project directory and say:

```
I want to build an integration that reads from Kafka and writes to a database
```

The AI reads `AGENTS.md`, invokes `/camel-brainstorm`, and guides you through design.

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
- Read the [Pipeline Overview](../pipeline/) to understand the three phases

**Choose your workflow:**
- [Greenfield Workflow](./greenfield/) - Build integrations from scratch
- [Migration Workflow](./migration/) - Convert existing integrations

**Explore features:**
- [Graph CLI](../graph/) - Migration analysis tools
- [Knowledge](../knowledge/) - Q&A about Camel components

**Get help:**
- Documentation at this site
- GitHub: [github.com/luigidemasi/camel-kit](https://github.com/luigidemasi/camel-kit)
- Community discussions in the repository
{{< /carousel >}}

## Two Workflows

Camel-Kit supports two integration workflows. Toggle to see each approach:

{{< before-after before="Greenfield Development" after="Platform Migration" id="workflows" >}}

Build new integrations from scratch using the **Design → Plan → Execute** pipeline:

1. Run `/camel-brainstorm` — AI interviews you about requirements
2. Review and approve the design specification
3. AI automatically decomposes into tasks and generates code
4. AI verifies the integration with runtime tests

```bash
camel-kit init my-project --ai claude
# Then in your AI agent:
# "I want to build a Kafka-to-PostgreSQL integration"
```

→ [Greenfield Workflow guide](./greenfield/)

<!--after-->

Migrate existing integrations from other platforms:

- **MuleSoft Mule 3.x/4.x** — Full XML and DataWeave support
- **Apache Camel 2.x/3.x** — Modernize to Camel 4.x YAML DSL

The AI auto-detects the source platform, uses graph-based flow analysis, and converts flow-by-flow.

```bash
camel-kit init --here --ai claude --source-platform mulesoft
# Then in your AI agent:
# "Migrate my MuleSoft flows to Camel"
```

→ [Migration Workflow guide](./migration/)

{{< /before-after >}}
