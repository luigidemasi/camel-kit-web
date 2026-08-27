---
title: "Camel MCP"
weight: 5
description: "Apache Camel catalog verification and route validation via JBang MCP"
toc: false
---

The Camel MCP server provides AI agents with **real-time access to the Apache Camel component catalog** — verifying that components, EIPs, data formats, and expression languages actually exist in the target Camel version before they appear in any design or code.

This is the enforcement mechanism for **Iron Law 1: MCP Catalog Verification**.

## How It Runs

The Camel MCP is the official **Apache Camel JBang MCP server** (`camel-jbang-mcp`). `camel-kit init` writes the agent's launch configuration, and the agent starts the local server when it is needed. This is an abridged shape; generated commands also include the configured MCP repositories, Camel catalog repositories, and runtime logging options:

```json
{
  "camel": {
    "command": "jbang",
    "args": [
      "org.apache.camel:camel-jbang-mcp:{version}:runner"
    ]
  }
}
```

It runs as a **local process**. JBang and the server may resolve and cache the MCP runner and Camel catalog Maven artifacts from the configured repositories when those artifacts are not already available locally.

## Core Tool Groups

{{< carousel id="camel-mcp-tools" >}}
<!--step Component Tools-->

**Catalog lookup for Apache Camel components:**

| Tool | Purpose |
|------|---------|
| `camel_catalog_components` | List all available components |
| `camel_catalog_component_doc` | Get full component documentation |
| `camel_catalog_component_maven` | Get component Maven coordinates |

**Example:**
```
camel_catalog_component_doc(component="kafka", runtime="main", platformBom="org.apache.camel:camel-catalog:4.21.0")
→ URI syntax, producer/consumer options, default values
```

Used during `/camel-brainstorm` to verify components selected for the design after runtime and version selection.

<!--step EIP Tools-->

**Enterprise Integration Pattern lookup:**

| Tool | Purpose |
|------|---------|
| `camel_catalog_eips` | List all available EIPs |
| `camel_catalog_eip_doc` | Get full EIP documentation |

**Example:**
```
camel_catalog_eip_doc(eip="choice", runtime="main", platformBom="org.apache.camel:camel-catalog:4.21.0")
→ YAML DSL syntax, when/otherwise structure, examples
```

Used to verify patterns like `choice`, `split`, `aggregate`, `multicast` exist in the target version.

<!--step Data Format Tools-->

**Data format verification:**

| Tool | Purpose |
|------|---------|
| `camel_catalog_dataformats` | List all data formats |
| `camel_catalog_dataformat_doc` | Get full data format docs |

**Example:**
```
camel_catalog_dataformat_doc(dataformat="jackson", runtime="main", platformBom="org.apache.camel:camel-catalog:4.21.0")
→ Marshal/unmarshal options, objectMapper config, prettyPrint
```

Covers JSON (Jackson), XML (JAXB), CSV, Avro, Protobuf, and more.

<!--step Language Tools-->

**Expression language verification:**

| Tool | Purpose |
|------|---------|
| `camel_catalog_languages` | List all languages |
| `camel_catalog_language_doc` | Get full language docs |

**Example:**
```
camel_catalog_language_doc(language="simple", runtime="main", platformBom="org.apache.camel:camel-catalog:4.21.0")
→ Simple expression syntax, operators, functions
```

Covers Simple, JSONPath, XPath, Header, Constant, and more.

<!--step Validation & Analysis-->

**Route validation and security hardening:**

| Tool | Purpose |
|------|---------|
| `camel_validate_route` | Validate YAML route syntax and structure |
| `camel_validate_yaml_dsl` | Validate Camel YAML DSL syntax |
| `camel_configuration_validate` | Validate `application.properties` keys and values |
| `camel_route_context` | Analyze route for test strategy |
| `camel_route_harden_context` | Security analysis and hardening suggestions |

**Example:**
```
camel_validate_route(route="- route:\n    id: my-route\n    ...",
                     runtime="spring-boot",
                     platformBom="org.apache.camel.springboot:camel-catalog-provider-springboot:4.21.0")
→ Syntax OK, components verified, properties valid
```

`camel_validate_route`, `camel_validate_yaml_dsl`, and `camel_configuration_validate` provide implementation and configuration gates while artifacts are generated, and `/camel-validate` uses them for terminal route-quality analysis. The context and hardening tools support test strategy and security analysis. Execute's spec-compliance review is separate: it compares generated artifacts with the approved design and task acceptance criteria.

`camel_configuration_validate` is a mandatory generation gate after writing application property files. Calls include the project runtime and full platform BOM, and the echoed Camel version must match the resolved project version.
{{< /carousel >}}

## How Camel-Kit Uses It

{{< before-after before="Without MCP" after="With MCP" id="mcp-usage" >}}

The AI generates component names from training data:

```yaml
- route:
    from:
      uri: "camel-superqueue:orders"  # ← hallucinated
      steps:
        - to: "camel-fastdb:customers"  # ← doesn't exist
```

Components may be renamed, removed, or have different options between Camel versions. Training data can be months or years outdated.

<!--after-->

Every component is verified before it enters the design or code:

```
AI: User mentioned "message queue"
    → camel_catalog_component_doc(component="jms", ...) ✓ exists
    → camel_catalog_component_doc(component="amqp", ...) ✓ exists
    → camel_catalog_component_doc(component="kafka", ...) ✓ exists
    
AI: "Which messaging system? JMS, AMQP, or Kafka?"
```

If a component doesn't exist, the AI asks for clarification instead of guessing.

{{< /before-after >}}

## Configuration

`camel-kit init` generates MCP configuration per agent:

| Agent | Config File | Format |
|-------|------------|--------|
| Claude Code | `.mcp.json` | JSON with `mcpServers` |
| IBM Bob 2 | `.bob/mcp.json` | JSON |
| IBM Bob 1 | `.bob/mcp.json` | JSON |
| Gemini CLI | `.gemini/settings.json` | JSON |
| OpenAI Codex CLI | `.codex/config.toml` | TOML under `mcp_servers` |
| GitHub Copilot CLI | `.github/mcp.json` | JSON |
| Pi | `.mcp.json` | JSON via `pi-mcp-adapter` with `directTools` allowlists |
| Qwen Code | `.qwen/settings.json` | JSON |
| OpenCode | `opencode.json` (default) | JSON / JSONC |

All configurations point to the same JBang-launched Camel MCP server and catalog. Each target exposes that server/tool universe through its native format, filters, and approval fields, except Pi, which consumes `.mcp.json` through `pi-mcp-adapter`. Install its current pin with `pi install npm:pi-mcp-adapter@2.11.0`.

The Codex configuration is repository-scoped and loads only after the repository is trusted; Codex also skips any user-added project hooks until trust, and Camel-Kit generates none. It declares the exact Camel workflow tool allowlist through `enabled_tools` and uses `default_tools_approval_mode = "prompt"`; Camel-Kit does not edit global Codex configuration or relax the active sandbox.

For OpenCode, re-running init preserves unrelated root settings, permission entries, and MCP servers in any existing
project configuration (`opencode.json`, `opencode.jsonc`, `.opencode/opencode.json`, or
`.opencode/opencode.jsonc`) while removing lower-precedence copies of Camel-Kit's managed entries and writing the current
definitions to the highest-precedence existing file. Invalid or structurally conflicting JSON or JSONC fails before any
workspace file is changed. When none exists, init creates `opencode.json`.

## Version Alignment

The server artifact follows the distribution's Camel Main stream; version-sensitive calls select the target runtime catalog explicitly:

| Property | Current Value |
|----------|--------------|
| **Camel MCP version** | `4.21.0` |
| **Camel Main default** | `4.21.0` |
| **Camel Spring Boot** | `4.21.0` |
| **Camel Quarkus** | `4.18.2` |

Every version-sensitive catalog call passes the project runtime and full platform BOM. Camel-Kit rejects a response whose echoed Camel version does not match the resolved project version.

## Next Steps

- [Knowledge MCP](../knowledge/) — Documentation search (hybrid semantic search)
- [Architecture Overview](../) — Four-layer architecture
- [Skills System](../skills/) — How skills invoke MCP tools
