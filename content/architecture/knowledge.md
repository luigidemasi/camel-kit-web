---
title: "Knowledge MCP"
weight: 4
description: "Apache Camel documentation search via hybrid semantic search"
toc: false
---

The Knowledge MCP server gives AI agents release-backed access to Apache Camel documentation, component references, migration guides, CVE advisories, release notes, and JIRA issues. The current index manifest reports **30,520 documents** covering Camel **4.18 through 4.22**. Index releases are rebuilt deliberately, so results reflect the installed index rather than a live crawl of the web.

## 7 MCP Tools

The server exposes seven `camel_docs_*` tools. Camel-Kit's generated workflow uses a five-tool subset, described below.

{{< carousel id="knowledge-tools" >}}
<!--step camel_docs_component_info-->

Look up documentation for a specific Apache Camel component. Returns reference documentation, usage examples, and configuration options.

**Parameters:**

| Param | Required | Example |
|-------|----------|---------|
| `component` | yes | `kafka`, `http`, `amqp` |
| `version` | no | `4.22` (omit for all versions) |
| `runtime` | no | `quarkus` or `spring-boot` |

**Example:**

```
camel_docs_component_info(component="kafka", version="4.18")
```

The response identifies exact indexed component matches separately from fuzzy full-text fallbacks. Use `camel_docs_cve_search` for a dedicated security-advisory lookup.

<!--step camel_docs_search-->

Search across Apache Camel component references, EIP patterns, user manuals, migration guides, getting-started guides, and release notes.

**Parameters:**

| Param | Required | Example |
|-------|----------|---------|
| `query` | yes | `configure SSL for HTTP component` |
| `version` | no | `4.22` |
| `max_results` | no | `5` (default, maximum 25) |

**Example:**

```
camel_docs_search(query="how to configure idempotent consumer", max_results=5)
```

General searches use hybrid BM25 and vector retrieval, followed by a local cross-encoder reranker when its model is available.

<!--step camel_docs_cve_search-->

Search Apache Camel CVE advisories by CVE ID, affected component, severity, or fixed-in version.

**Parameters:**

| Param | Required | Example |
|-------|----------|---------|
| `cve_id` | no | `CVE-2024-22369` |
| `component` | no | `sql`, `cxf` |
| `severity` | no | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` |
| `version` | no | `4.14` |
| `max_results` | no | `10` (default, maximum 25) |

**Example:**

```
camel_docs_cve_search(component="http", severity="HIGH")
```

Returns advisory details and affected or fixed versions. The advisory content includes CVSS and CWE details only when NVD enrichment was available.

<!--step camel_docs_release_info-->

Get release notes for a specific Apache Camel version, including indexed features, fixes, and JIRA references.

**Parameters:**

| Param | Required | Example |
|-------|----------|---------|
| `version` | yes | `4.18`, `4.22.0` |
| `max_results` | no | `20` (default, maximum 25) |

**Example:**

```
camel_docs_release_info(version="4.18")
```

<!--step camel_docs_jira_lookup-->

Look up an Apache Camel JIRA issue and the indexed release context in which it was fixed or implemented.

**Parameters:**

| Param | Required | Example |
|-------|----------|---------|
| `jira_id` | yes | `CAMEL-22784` |

**Example:**

```
camel_docs_jira_lookup(jira_id="CAMEL-22784")
```

<!--step camel_docs_validate_endpoint-->

Validate one Camel endpoint URI deterministically against the catalog bundled with the MCP server.

**Parameters:**

| Param | Required | Example |
|-------|----------|---------|
| `uri` | yes | `kafka:orders?brokers=localhost:9092` |

**Example:**

```
camel_docs_validate_endpoint(uri="kafka:orders?brokers=localhost:9092")
```

The response reports the catalog version, unknown component or options, missing required options, and an error summary when validation fails.

<!--step camel_docs_index_info-->

Report the active index's document count, covered Camel versions, document types, embedding model, and search mode.

**Example:**

```
camel_docs_index_info()
```

Use this before interpreting an empty result when version coverage or the active vector-search mode matters.
{{< /carousel >}}

### Camel-Kit Workflow Allowlist

The server API has seven tools, while `camel-kit-workflow.yaml` intentionally lists these five tools for Camel-Kit's documentation workflow:

| Workflow Tool | Purpose |
|---------------|---------|
| `camel_docs_search` | General documentation and migration-guide search |
| `camel_docs_component_info` | Component reference lookup |
| `camel_docs_cve_search` | Security-advisory lookup |
| `camel_docs_release_info` | Release-note lookup |
| `camel_docs_jira_lookup` | JIRA issue lookup |

Generated targets that support exact MCP filtering or approval lists receive this five-tool set. Other target schemas may expose the server namespace behind their own prompt policy. `camel_docs_validate_endpoint` and `camel_docs_index_info` remain available to direct MCP clients, but are not part of the generated Camel-Kit workflow allowlist.

## Search Pipeline

General documentation search combines keyword precision with semantic retrieval:

{{< before-after before="BM25 (20% weight)" after="KNN vector search (80% weight)" id="search-algo" >}}

**Keyword matching** finds exact terms using Lucene BM25 scoring.

Best for:

- Exact component names (`kafka`, `http`)
- CVE identifiers (`CVE-2024-22369`)
- JIRA issue IDs (`CAMEL-22784`)
- Property names (`autoOffsetReset`)

Without the keyword signal, an identifier can be displaced by semantically similar but incorrect results.

<!--after-->

**Semantic similarity** uses 384-dimensional Granite embeddings.

Best for:

- Natural-language questions ("how do I configure SSL?")
- Conceptual queries ("error handling best practices")
- Rephrased questions and cross-reference discovery

Without the vector signal, a useful document may be missed when its wording differs from the query.

{{< /before-after >}}

The blended candidates are reranked by a local MiniLM cross-encoder before the requested result limit is applied. Component lookup uses exact component-field matching first and marks any full-text fallback as fuzzy. If the embedding model is unavailable or does not match the index stamp and stored-vector self-check, the server disables vector retrieval and continues with BM25 plus the reranker. If the reranker is unavailable, it returns the remaining retrieval order: hybrid when vectors are active, otherwise BM25.

## What's Indexed

The checked-in manifest reports **30,520 Lucene documents** across Camel 4.18, 4.19, 4.20, 4.21, and 4.22.

{{< tabs id="index-contents" >}}
<!--tab Component Docs-->

Component and EIP documentation from Apache Camel, Camel Quarkus, and Camel Spring Boot, plus structured Camel Catalog metadata.

Indexed material includes:

- URI syntax and component options
- Producer and consumer properties
- Code examples and usage guidance
- EIP, data-format, and runtime-specific documentation

<!--tab CVE Advisories-->

Apache Camel CVE advisories from the `apache/camel-website` security content.

Each advisory can include:

- CVE identifier and description
- Affected and fixed versions
- Severity
- CVSS score, vector, and CWE classification in the advisory content when matching NVD enrichment is available

Missing NVD enrichment does not remove the Apache advisory; those optional details are simply absent from its content.

<!--tab Release Notes-->

Apache Camel release notes with issue and change context.

Indexed material includes:

- New features and improvements
- Bug fixes with JIRA references
- Breaking changes and migration notes
- Dependency updates

<!--tab Other-->

Additional indexed material includes:

- Migration guides
- User-manual chapters
- Getting-started guides
- Apache Camel JIRA issue details used to enrich release context

{{< /tabs >}}

## Local Models

| Property | Value |
|----------|-------|
| **Embedding model** | granite-embedding-small-english-r2, Q8 ONNX |
| **Dimensions** | 384 |
| **Model maximum** | 8,192 tokens |
| **Runtime default** | 2,048 tokens per chunk; configurable when rebuilding |
| **Reranker** | ms-marco-MiniLM-L-6-v2, Q8 ONNX |
| **Storage field** | `KnnFloatVectorField` |

Embedding and reranking run locally through ONNX Runtime. Queries are not sent to an external model API.

## Index Distribution and Cache

The Lucene 9.12.1 index is published as `knowledge-index.zip` plus an `index.json` manifest in a GitHub Release. It is **not embedded in the normal MCP Maven artifact**. Normal Camel-Kit setup does not require cloning the knowledge repository or running the indexer.

`camel-kit init` (or `camel kit init`) generates the target's MCP configuration with the pinned Knowledge MCP JBang coordinate. When that server starts, it resolves the index in this order:

1. `knowledge.index.path` — open an explicit local index directory directly.
2. `knowledge.index.url` — fetch the manifest, compare its version with the local cache, download `knowledge-index.zip` when needed, verify its SHA-256, and atomically activate it.
3. A legacy classpath index, when one is present in an older bundled artifact.

The default manifest is `https://github.com/luigidemasi/camel-kit-knowledge/releases/latest/download/index.json`, and downloaded versions are opened directly from `~/.camel-kit/knowledge-index/`. A failed manifest check falls back to the active cached version when one exists. A first offline start needs either a populated cache or `knowledge.index.path` pointing to a local index.

| Property | Purpose | Default |
|----------|---------|---------|
| `knowledge.index.path` | Use a local index directly; suitable for development, tests, or air-gapped use | unset |
| `knowledge.index.url` | Release manifest URL; `https://` and `file://` are supported | latest GitHub Release manifest |
| `knowledge.index.cache-dir` | Downloaded index versions and active-version marker | `~/.camel-kit/knowledge-index` |

## Rebuilding from Source

Index rebuilding is a contributor and release-maintainer task. From a checkout of `camel-kit-knowledge`, run:

```bash
./mvnw -pl index -Prebuild-index -am -B install
```

The rebuild resolves active Camel versions, fetches immutable release tags, renders documentation, downloads Camel Catalog metadata, parses release notes and CVE advisories, enriches available JIRA and NVD data, generates or reuses cached embeddings, and writes the Lucene files plus the manifest skeleton under `index/src/main/resources/`.

The release workflow performs a rebuild, runs the retrieval-quality gate with working vectors required, and publishes the ZIP and completed manifest. Local source builds are not the normal end-user installation path.

**Knowledge repository modules:**

| Module | Purpose |
|--------|---------|
| `schema` | Lucene field definitions and document builder |
| `embedding` | Local ONNX embedding and reranker support |
| `indexer` | Version resolution, crawling, parsing, chunking, and indexing |
| `index` | Rebuilt Lucene files and release-manifest inputs |
| `mcp` | Quarkus MCP server exposing all seven tools and resolving the released index |

## Camel Knowledge Skill

The Camel Knowledge skill (shown as `/camel-knowledge` or the target's equivalent invocation) is a prescriptive Q&A layer over the five workflow-allowlisted tools. Standalone questions run in the primary session. When a pipeline needs documentation context, the generated instructions either isolate the lookup in a read-only research agent or run it inline when that target has no suitable subagent surface.

| Target Path | Pipeline Lookup Behavior |
|-------------|--------------------------|
| Qwen Code | Loads `.qwen/camel-kit-personas/knowledge-researcher.md` and dispatches the foreground `camel-reviewer` leaf |
| OpenCode | Loads `.opencode/camel-kit-personas/knowledge-researcher.md` and uses the foreground `researcher` task |
| IBM Bob 2 | Loads `.bob/personas/knowledge-researcher.md` and uses the generated read/MCP-only `camel-reviewer` subagent |
| IBM Bob 1 and Pi | Run the lookup inline because these targets do not expose a native subagent surface |
| Other supported targets | Follow their generated dispatch contract when a suitable subagent is available, otherwise use the documented inline fallback |

The research role returns a concise answer and source references instead of copying raw search results into the orchestrator context. A failed lookup is reported as missing evidence; it must not be replaced with fabricated documentation.

## Next Steps

- [MCP Integration](../mcp/) — Camel MCP Server (catalog verification)
- [Architecture Overview](../) — Four-layer architecture
- [Commands Reference](../../reference/commands/) — Full Camel Knowledge usage
