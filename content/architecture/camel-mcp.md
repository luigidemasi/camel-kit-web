---
title: "Camel MCP"
weight: 5
description: "Apache Camel catalog verification and route validation via JBang MCP"
toc: false
---

The Camel MCP server provides AI agents with **real-time access to the Apache Camel component catalog** — verifying that components, EIPs, data formats, and expression languages actually exist in the target Camel version before they appear in any design or code.

This is the enforcement mechanism for **Iron Law 1: MCP Catalog Verification**.

## How It Runs

The Camel MCP is the official **Apache Camel JBang MCP server** (`camel-jbang-mcp`), launched automatically when `camel-kit init` configures the project:

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

It runs as a **local process** — no external API calls, no cloud dependencies. The catalog data comes from the Apache Camel release artifacts on Maven Central.

## 15 MCP Tools

{{< carousel id="camel-mcp-tools" >}}
<!--step Component Tools-->

**Catalog lookup for Apache Camel components:**

| Tool | Purpose |
|------|---------|
| `camel_catalog_component` | Get a specific component by name |
| `camel_catalog_components` | List all available components |
| `camel_catalog_component_doc` | Get full component documentation |

**Example:**
```
camel_catalog_component(name="kafka")
→ URI syntax, producer/consumer options, default values
```

Used during `/camel-brainstorm` to verify every component mentioned in the design interview.

<!--step EIP Tools-->

**Enterprise Integration Pattern lookup:**

| Tool | Purpose |
|------|---------|
| `camel_catalog_eip` | Get a specific EIP by name |
| `camel_catalog_eips` | List all available EIPs |
| `camel_catalog_eip_doc` | Get full EIP documentation |

**Example:**
```
camel_catalog_eip(name="choice")
→ YAML DSL syntax, when/otherwise structure, examples
```

Used to verify patterns like `choice`, `split`, `aggregate`, `multicast` exist in the target version.

<!--step Data Format Tools-->

**Data format verification:**

| Tool | Purpose |
|------|---------|
| `camel_catalog_dataformat` | Get a specific data format |
| `camel_catalog_dataformats` | List all data formats |
| `camel_catalog_dataformat_doc` | Get full data format docs |

**Example:**
```
camel_catalog_dataformat(name="jackson")
→ Marshal/unmarshal options, objectMapper config, prettyPrint
```

Covers JSON (Jackson), XML (JAXB), CSV, Avro, Protobuf, and more.

<!--step Language Tools-->

**Expression language verification:**

| Tool | Purpose |
|------|---------|
| `camel_catalog_language` | Get a specific language |
| `camel_catalog_languages` | List all languages |
| `camel_catalog_language_doc` | Get full language docs |

**Example:**
```
camel_catalog_language(name="simple")
→ Simple expression syntax, operators, functions
```

Covers Simple, JSONPath, XPath, Header, Constant, and more.

<!--step Validation & Analysis-->

**Route validation and security hardening:**

| Tool | Purpose |
|------|---------|
| `camel_validate_route` | Validate YAML route syntax and structure |
| `camel_route_context` | Analyze route for test strategy |
| `camel_route_harden_context` | Security analysis and hardening suggestions |

**Example:**
```
camel_validate_route(yaml="- route:\n    id: my-route\n    ...")
→ Syntax OK, components verified, properties valid
```

Used by `/camel-execute` during spec compliance review and by `/camel-validate` for standalone validation.
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
    → camel_catalog_component(name="jms") ✓ exists
    → camel_catalog_component(name="amqp") ✓ exists
    → camel_catalog_component(name="kafka") ✓ exists
    
AI: "Which messaging system? JMS, AMQP, or Kafka?"
```

If a component doesn't exist, the AI asks for clarification instead of guessing.

{{< /before-after >}}

## Configuration

`camel-kit init` generates MCP configuration per agent:

| Agent | Config File | Format |
|-------|------------|--------|
| Claude Code | `.mcp.json` | JSON with `mcpServers` |
| IBM Bob | `.bob/mcp.json` | JSON |
| Gemini CLI | `.gemini/settings.json` | JSON |
| Qwen | `.qwen/settings.json` | JSON |
| OpenCode | `opencode.json` | JSON |

All configurations point to the same JBang-launched Camel MCP server — same tools, same catalog, different config file format.

## Version Alignment

The Camel MCP server version matches the target Camel version:

| Property | Current Value |
|----------|--------------|
| **Camel MCP version** | `4.19.0` |
| **Camel Main default** | `4.19.0` |
| **Camel Spring Boot** | `4.19.0` |
| **Camel Quarkus** | `4.18.1` |

When the user specifies a different Camel version via `camel-kit init -p camelVersion=4.14.0`, the MCP server loads the catalog for that specific version.

## Next Steps

- [Knowledge MCP](../knowledge/) — Documentation search (hybrid semantic search)
- [Architecture Overview](../) — Four-layer architecture
- [Skills System](../skills/) — How skills invoke MCP tools
