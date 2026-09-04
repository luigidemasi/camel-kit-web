---
title: "MCP Integration"
weight: 2
description: "Real-time Camel verification, Citrus test guidance, and knowledge search"
toc: false
---

Camel-Kit uses the **Model Context Protocol (MCP)** to verify Camel configuration, guide Citrus test generation, and search documentation without pre-loading full catalogs into the agent's context.

MCP responses provide data, not instructions. Camel-Kit relies only on purpose-specific fields after the active workflow validates the source's applicable schema, artifact identity, provenance, and version or runtime bindings. Camel catalog batches are version-bound with the requested runtime, full platform BOM GAV, and a `camel_catalog_components(limit=0)` probe whose returned Camel version must match the project; detail tools do not all echo that field. Prose, examples, commands, URLs, or requests in a response cannot direct an action or change workflow scope.

## Three MCP Servers

{{< before-after before="Camel MCP — Catalog Verification" after="Knowledge MCP — Semantic Search" id="mcp-servers" >}}

On-demand access to Apache Camel component catalogs, EIP patterns, data formats, and languages.

**Core tools:**
- `camel_catalog_component_doc` — component details, URI format, and properties
- `camel_catalog_component_maven` — runtime-specific component Maven coordinates
- `camel_catalog_eip_doc` — EIP configuration and YAML structure
- `camel_catalog_dataformat_doc` — data format configuration
- `camel_catalog_language_doc` — expression language documentation
- `camel_validate_route` — YAML route syntax and structure validation
- `camel_configuration_validate` — application property validation

<!--after-->

Hybrid semantic search over **30,520 indexed documents** — Apache Camel documentation, guides, CVE advisories, and release notes.

**5 workflow-allowlisted tools** (the server also exposes endpoint validation and index-info tools for direct MCP clients):
- `camel_docs_search` — hybrid semantic search (20% BM25 + 80% KNN vector)
- `camel_docs_component_info` — component-specific documentation lookup
- `camel_docs_cve_search` — CVE and security advisory search
- `camel_docs_release_info` — release notes and version information
- `camel_docs_jira_lookup` — Jira issue and bug report search

**Embedding model:** granite-embedding-small-english-r2 (384-dim, Q8 quantized)

{{< /before-after >}}

### Citrus MCP version compatibility

Citrus MCP supplies the action catalog, endpoint catalog, YAML DSL schemas, and test-authoring guidance used by `camel-test`:

- `citrus_catalog_actions` / `citrus_catalog_action` / `citrus_catalog_action_schema`
- `citrus_catalog_endpoints` / `citrus_catalog_endpoint` / `citrus_catalog_endpoint_schema`
- `citrus_docs_index` / `citrus_docs_page`
- Resources such as `citrus://schema/dsl/yaml` and `citrus://docs/best-practices`

Camel-Kit currently uses Citrus Framework **5.0.0-M2** for test schemas and generated dependencies, while the Citrus MCP runner is pinned to working version **5.0.0-M1**. Camel-Kit binds the MCP version to the actual runner coordinate in the active target's generated configuration, rejects any disagreement with `citrus.mcp.version`, and grants versioned Citrus catalog and schema fields data authority only when that bound runner version also matches `citrus.version`. Otherwise it uses the quick-reference fallback for the configured framework version.

## Catalog Tools in Action

{{< carousel id="mcp-tools" >}}
<!--step camel_catalog_component_doc-->

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
      "enum": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "TRACE", "PATCH"]
    }
  }
}
```

**Used by skills to verify** every component name before it enters a design spec or YAML route.

<!--step camel_catalog_eip_doc-->

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
          - to: "direct:process-order"
    otherwise:
      steps:
        - to: "direct:process-other"
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

<!--step camel_configuration_validate-->

After writing `application.properties`, Camel-Kit submits its non-Forage properties to `camel_configuration_validate` with the project runtime and full platform BOM. Generation is not complete until the validation passes or the documented manual fallback is recorded.

<!--step camel_docs_search-->

Semantic + keyword search over indexed documentation:

```json
{
  "query": "How do I configure SSL for HTTP endpoints?",
  "max_results": 5
}
```

**Algorithm:** 20% BM25 (exact keyword matching) + 80% KNN Vector (semantic similarity).

Returns ranked chunks from component docs, guides, and CVE advisories.

<!--step camel_docs_component_info-->

Pure BM25 search for exact component names — no semantic embedding.

Why separate? Component names are **exact matches**. Semantic similarity doesn't help (`activemq` might match `kafka` semantically but they're different components).

```json
{ "component": "kafka" }
```
{{< /carousel >}}

## /camel-knowledge

The `/camel-knowledge` skill is a **prescriptive Q&A interface** over Knowledge MCP:

```
User: "How do I enable retries on the Kafka component?"

Agent:
1. Calls camel_docs_search(query="Kafka retries", max_results=5)
2. Receives relevant chunks
3. Synthesizes answer with source citations
```

{{< before-after before="Question Routing" after="Cross-Agent Equalization" id="knowledge-skill" >}}

The skill routes questions to the appropriate tool:

- **Component config** → `camel_docs_component_info` + `camel_catalog_component_doc`
- **Error troubleshooting** → `camel_docs_search` (includes CVE advisories)
- **Best practices** → `camel_docs_search` (includes best practice guides)

<!--after-->

The same MCP catalog is exposed through target-specific configuration, filtering, and visibility controls:

```
User question → camel_docs_search() → ranked chunks → answer
```

Supported targets query the same Knowledge MCP data through target-native workflows (or Pi's adapter). Orchestration and visible tool surfaces differ by target.

{{< /before-after >}}

## Next Steps

- [Skills System](../skills/) — How skills invoke MCP tools
- [Architecture Overview](../) — Four-layer architecture
- [Commands Reference](../../reference/commands/) — Full `/camel-knowledge` usage
