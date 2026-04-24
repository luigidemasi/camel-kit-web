---
title: "MCP Integration"
weight: 2
description: "Real-time catalog verification and knowledge search"
toc: false
---

Camel-Kit uses the **Model Context Protocol (MCP)** to provide real-time catalog verification and knowledge search without pre-loading documentation into the agent's context.

## Two MCP Servers

{{< before-after before="Camel MCP — Catalog Verification" after="Knowledge MCP — Semantic Search" id="mcp-servers" >}}

On-demand access to Apache Camel component catalogs, EIP patterns, data formats, and languages.

**5 tools:**
- `camel_catalog_component` — component details, URI format, properties
- `camel_catalog_eip` — EIP patterns (choice, split, aggregate)
- `camel_catalog_dataformat` — data formats (JSON, XML, CSV, Avro)
- `camel_catalog_language` — expression languages (Simple, JSONPath, XPath)
- `camel_validate_route` — YAML route syntax and structure validation

<!--after-->

Hybrid semantic search over **166,973 indexed documents** — Apache Camel documentation, guides, CVE advisories, and release notes.

**2 tools:**
- `hybrid_search` — 20% BM25 + 80% KNN Vector search
- `lookup_component` — pure BM25 for exact component name matching

**Embedding model:** granite-embedding-small-english-r2 (384-dim, Q8 quantized)

{{< /before-after >}}

## Catalog Tools in Action

{{< carousel id="mcp-tools" >}}
<!--step camel_catalog_component-->

Fetch component details — URI format, properties, supported options:

```json
{
  "name": "http",
  "syntax": "http:httpUri",
  "title": "HTTP",
  "properties": {
    "bridgeEndpoint": {
      "type": "boolean",
      "defaultValue": "false"
    },
    "httpMethod": {
      "type": "string",
      "enum": ["GET", "POST", "PUT", "DELETE"]
    }
  }
}
```

**Used by skills to verify** every component name before it enters a design spec or YAML route.

<!--step camel_catalog_eip-->

Fetch Enterprise Integration Pattern details with YAML examples:

```json
{
  "name": "choice",
  "title": "Choice",
  "description": "Routes messages based on predicates"
}
```

```yaml
- choice:
    when:
      - simple: "${header.type} == 'order'"
        steps:
          - to: "direct:processOrder"
    otherwise:
      steps:
        - to: "direct:processOther"
```

<!--step camel_validate_route-->

Validates YAML route syntax, structure, and component references:

```yaml
- route:
    id: order-api
    from:
      uri: "platform-http:/orders"
      steps:
        - unmarshal:
            json: {}
        - to:
            uri: "jms:queue:orders"
```

**Checks:** valid YAML, correct DSL schema, components exist, required properties present.

<!--step hybrid_search-->

Semantic + keyword search over indexed documentation:

```json
{
  "query": "How do I configure SSL for HTTP endpoints?",
  "topK": 5
}
```

**Algorithm:** 20% BM25 (exact keyword matching) + 80% KNN Vector (semantic similarity).

Returns ranked chunks from component docs, guides, and CVE advisories.

<!--step lookup_component-->

Pure BM25 search for exact component names — no semantic embedding.

Why separate? Component names are **exact matches**. Semantic similarity doesn't help (`activemq` might match `kafka` semantically but they're different components).

```json
{ "componentName": "kafka" }
```
{{< /carousel >}}

## /camel-knowledge

The `/camel-knowledge` skill is a **prescriptive Q&A interface** over Knowledge MCP:

```
User: "How do I enable retries on the Kafka component?"

Agent:
1. Calls hybrid_search(query="Kafka retries", topK=5)
2. Receives relevant chunks
3. Synthesizes answer with source citations
```

{{< before-after before="Question Routing" after="Cross-Agent Equalization" id="knowledge-skill" >}}

The skill routes questions to the appropriate tool:

- **Component config** → `hybrid_search` + `camel_catalog_component`
- **Error troubleshooting** → `hybrid_search` (includes CVE advisories)
- **Best practices** → `hybrid_search` (includes best practice guides)

<!--after-->

Entirely **MCP-driven** — no agent-specific logic:

```
User question → hybrid_search() → ranked chunks → answer
```

Works identically on all 5 agents (Claude, Bob, Gemini, Qwen, OpenCode). Same questions, same results, regardless of which agent.

{{< /before-after >}}

## Next Steps

- [Skills System](../skills/) — How skills invoke MCP tools
- [Architecture Overview](../) — Four-layer architecture
- [Commands Reference](../../reference/commands/) — Full `/camel-knowledge` usage
