---
title: "OpenAI Codex CLI"
weight: 2
description: "Initialize and use Camel-Kit with repository-scoped Codex assets"
toc: false
---

Camel-Kit supports OpenAI Codex CLI as a native AI target. It installs project skills, custom agents, and MCP servers in the repository without changing your global Codex setup.

## Initialize a Codex Project

Use either Camel-Kit entry point:

```bash
# Standalone Camel-Kit CLI
camel-kit init my-integration --ai codex

# Camel JBang plugin
camel kit init my-integration --ai codex
```

To add Camel-Kit to the current repository instead, run:

```bash
camel-kit init --here --ai codex
```

Both entry points generate the same Codex-native project assets.

## Generated Assets

{{< filetree >}}
my-integration/
  AGENTS.md # Codex project instructions, routing, and Iron Laws
  .agents/
    skills/ # All Camel-Kit project skills
      camel-start/
        SKILL.md
  .codex/
    config.toml # Repository-scoped MCP configuration
    agents/ # Camel-Kit custom agent roles
      camel-planner.toml
      camel-implementer.toml
      camel-tester.toml
      camel-validator.toml
      camel-migrator.toml
      camel-catalog-researcher.toml
      camel-security-reviewer.toml
  docs/
    constitution.md # Generated architecture rules
  .camel-kit/ # Project configuration, catalogs, templates, and state
{{< /filetree >}}

Codex discovers project skills directly from `.agents/skills/`, so Camel-Kit does **not** generate `.codex/commands/` or slash-command wrappers.

If `.codex/config.toml` already contains valid unrelated settings, Camel-Kit preserves them and adds a marked block for its three MCP servers. If the file is invalid TOML or already defines one of those server tables, initialization fails without changing the file.

## Start Codex Safely

```bash
cd my-integration
codex
```

Review the repository before trusting it. Codex loads repository `.codex/` configuration only for trusted projects; until then, the generated custom agents and MCP servers are not active. Codex also skips any user-added project hooks until trust; Camel-Kit itself generates no hooks.

Camel-Kit keeps this setup repository-scoped:

- It does not edit `~/.codex/config.toml`.
- It does not create or manage OpenAI credentials, API keys, or login state.
- It does not generate Codex hooks.
- It does not loosen the active Codex sandbox or approval policy.

Keep the sandbox enabled and grant only the narrow approval required when a command is blocked. Repository trust allows project configuration to load; it is not a reason to approve every command automatically.

## Invoke Camel-Kit Skills

In Codex, inspect the installed project skills and start the router with:

```text
/skills
$camel-start
```

`$camel-start` routes a request to the correct Camel-Kit workflow. You can also select another installed skill from `/skills`. Codex uses skill selection rather than `/camel-start`, because no `.codex/commands/` directory is generated.

## Verify MCP Servers

Run:

```text
/mcp
```

The generated `.codex/config.toml` defines three local JBang servers:

| Server | Purpose |
|--------|---------|
| `camel` | Camel catalog lookup, route validation, migration, and security analysis |
| `camel-knowledge` | Camel documentation, CVE, release, component, and Jira search |
| `citrus` | Citrus actions, endpoints, schemas, and test-authoring guidance |

Initialization resolves each server artifact version from the Camel-Kit distribution. Every server receives only its workflow allowlist through `enabled_tools`, and every generated table uses `default_tools_approval_mode = "prompt"`.

## Custom Agents and Fallback

The generated roles cover planning, implementation, testing, validation, migration, catalog research, and security review. The catalog researcher and security reviewer use a read-only sandbox; the other roles inherit the active project sandbox and approval policy.

Codex can dispatch independent implementation-wave tasks to these roles in parallel while keeping dependent waves sequential. If custom-agent dispatch is unavailable, the parent session reads the same skill guide and performs the task inline, preserving the workflow.

## Diagnose the Workspace

Use either doctor entry point:

```bash
camel-kit doctor
camel kit doctor
```

Doctor validates the Codex TOML, all three MCP tables and their exact tool allowlists, prompt approval defaults, project skills, and required custom-agent fields. Failures include a remediation command for regenerating the affected assets.

## Next Steps

- [Skills System](../../architecture/skills/) — Skill discovery, routing, and agent-specific generation
- [MCP Integration](../../architecture/mcp/) — How Camel-Kit uses its three MCP servers
- [Command Reference](../../reference/commands/) — CLI and workflow commands
