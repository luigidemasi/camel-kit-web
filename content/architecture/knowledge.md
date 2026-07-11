---
title: "Knowledge MCP"
weight: 4
description: "Apache Camel documentation search via hybrid semantic search"
toc: false
---

The Knowledge MCP server provides AI agents with **real-time access to Apache Camel documentation** — component references, migration guides, CVE advisories, release notes, and JIRA issues. Instead of relying on potentially outdated training data, agents query a **166,973-document index** using hybrid semantic search.

## 5 MCP Tools

{{< carousel id="knowledge-tools" >}}
<!--step camel_docs_component_info-->

Look up documentation for a specific Apache Camel component. Returns reference docs, usage examples, configuration options, and related CVEs.

**Parameters:**

| Param | Required | Example |
|-------|----------|---------|
| `component` | yes | `kafka`, `http`, `amqp` |
| `version` | no | `4.14` (omit for all versions) |
| `runtime` | no | `quarkus` or `spring-boot` |

**Example:**
```
camel_docs_component_info(component="kafka", version="4.18")
```

Use to verify a component exists and understand its configuration before designing routes.

<!--step camel_docs_search-->

General-purpose keyword search across all Apache Camel documentation — component references, EIP patterns, user manual, migration guides, getting started guides, and release notes.

**Parameters:**

| Param | Required | Example |
|-------|----------|---------|
| `query` | yes | `configure SSL for HTTP component` |
| `version` | no | `4.14` |
| `max_results` | no | `5` (default) |

**Example:**
```
camel_docs_search(query="how to configure idempotent consumer", max_results=5)
```

Uses **hybrid search**: 20% BM25 (keyword matching) + 80% KNN Vector (semantic similarity).

<!--step camel_docs_cve_search-->

Search Apache Camel CVE security advisories. Query by CVE ID, affected component, severity, or affected version.

**Parameters:**

| Param | Required | Example |
|-------|----------|---------|
| `cve_id` | no | `CVE-2024-22369` |
| `component` | no | `sql`, `cxf` |
| `severity` | no | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` |
| `version` | no | `4.14` |
| `max_results` | no | `10` (default) |

**Example:**
```
camel_docs_cve_search(component="http", severity="HIGH")
```

Returns CVE details, affected versions, fixed versions, and CVSS scores.

<!--step camel_docs_release_info-->

Get release notes for a specific Apache Camel version — new features, bug fixes, and JIRA issues included in the release.

**Parameters:**

| Param | Required | Example |
|-------|----------|---------|
| `version` | yes | `4.14`, `4.18.2` |
| `max_results` | no | `20` (default) |

**Example:**
```
camel_docs_release_info(version="4.18")
```

<!--step camel_docs_jira_lookup-->

Look up a JIRA issue to find in which Apache Camel release it was fixed or implemented.

**Parameters:**

| Param | Required | Example |
|-------|----------|---------|
| `jira_id` | yes | `CAMEL-22784` |

**Example:**
```
camel_docs_jira_lookup(jira_id="CAMEL-22784")
```

Returns release version, description, and context.
{{< /carousel >}}

## Hybrid Search Algorithm

The Knowledge MCP uses a two-signal search combining keyword precision with semantic understanding:

{{< before-after before="BM25 (20% weight)" after="KNN Vector (80% weight)" id="search-algo" >}}

**Keyword matching** — exact term lookup using TF-IDF scoring.

Best for:
- Exact component names (`kafka`, `http`)
- CVE identifiers (`CVE-2024-22369`)
- JIRA issue IDs (`CAMEL-22784`)
- Property names (`autoOffsetReset`)

Without BM25, searching for `CAMEL-22784` would return semantically similar but wrong results.

<!--after-->

**Semantic similarity** — 384-dimensional vector embeddings using Granite embedding model.

Best for:
- Natural language questions ("how do I configure SSL?")
- Conceptual queries ("error handling best practices")
- Cross-reference discovery ("components similar to Kafka")

Without vector search, typos or rephrased questions would return zero results.

{{< /before-after >}}

## What's Indexed

{{< tabs id="index-contents" >}}
<!--tab Component Docs-->

**70,798 documents** — component reference pages across multiple Apache Camel versions.

Each component doc includes:
- URI syntax and options
- Producer/consumer properties
- Code examples (Java DSL, XML, YAML)
- Related EIPs and data formats

<!--tab CVE Advisories-->

**186 CVE advisories** from the Apache Camel security page.

Each CVE includes:
- CVE identifier and description
- CVSS score and CWE classification
- Affected versions
- Fixed versions

<!--tab Release Notes-->

**104 release notes** covering Apache Camel releases.

Each includes:
- New features and improvements
- Bug fixes with JIRA references
- Breaking changes and migration notes
- Dependency updates

<!--tab Other-->

**~96,000 additional documents** including:
- Migration guides (2.x → 3.x → 4.x)
- EIP pattern documentation
- User manual chapters
- Getting started guides
- Best practices

{{< /tabs >}}

## Embedding Model

| Property | Value |
|----------|-------|
| **Model** | granite-embedding-small-english-r2 |
| **Quantization** | Q8 (ONNX) |
| **Dimensions** | 384 |
| **Context window** | 8,192 tokens |
| **Size** | 52 MB |
| **Architecture** | ModernBERT |

The model runs locally via ONNX Runtime — no external API calls, no data leaves the machine.

## Index Storage

The knowledge index is a **pre-built Apache Lucene 9.12.1 index** shipped as a Maven artifact:

| Property | Value |
|----------|-------|
| **Storage engine** | Apache Lucene 9.12.1 |
| **Index size** | 472 MB (88 segment files) |
| **Vector storage** | `KnnFloatVectorField` (384-dim per document) |
| **Total documents** | 166,973 |

### Why Lucene?

Camel-Kit chose Lucene over vector databases (Pinecone, Weaviate, Chroma, Milvus) and full search platforms (Elasticsearch, OpenSearch) for specific reasons:

- **Zero infrastructure** — Lucene is an embedded library, not a server. No Docker containers, no ports, no configuration. The index loads from the classpath at JVM startup. This keeps the MCP server self-contained — one JAR, one process.

- **Native hybrid search** — Lucene 9.x supports both BM25 text search and `KnnFloatVectorField` vector search in the same index. No need for two separate systems or a coordination layer. The 20/80 BM25+KNN blend runs in a single query.

- **Pre-built, portable index** — The index is built once by the indexer and shipped as a Maven artifact. Users don't need to run an indexer or download docs — the knowledge is embedded in the JAR. This makes deployment trivial: `jbang org.apache.camel:camel-jbang-mcp:{version}:runner` and it's ready.

- **Java ecosystem alignment** — Camel-Kit is a Java/JBang project. Lucene is a Java library with no native dependencies (except ONNX for embeddings). No Python, no gRPC, no REST clients needed.

- **Proven at scale** — 166,973 documents with 384-dim vectors, hybrid search under 50ms on commodity hardware. Lucene powers Wikipedia, Stack Overflow, and Elasticsearch. The scale is well within its comfort zone.

The tradeoff: no built-in replication or distributed search. But for a single-user MCP server running locally, that's not needed.

The index module has **no Java code** — it's a pure resource artifact containing the pre-built Lucene segments. The MCP server loads it at startup from the classpath.

**Rebuild the index:**

```bash
./mvnw package -pl camel-kit-knowledge/index -Prebuild-index -Drevision=$(date +%Y%m%d%H%M) -am
```

This triggers the indexer to re-crawl Apache Camel documentation, re-embed with the Granite model, and write new Lucene segments.

**Knowledge repo structure:**

| Module | Purpose |
|--------|---------|
| `schema` | Lucene field definitions (`KnowledgeFields`, `KnowledgeDocument`) |
| `embedding` | ONNX model loading and vector generation |
| `indexer` | Document crawling, parsing, chunking, and index building |
| `index` | Pre-built Lucene index artifact (no code) |
| `mcp` | Quarkus MCP server exposing 5 search tools |

## /camel-knowledge Skill

The `/camel-knowledge` slash command is a **prescriptive Q&A layer** over the Knowledge MCP. It routes user questions to the appropriate tool:

| Question Type | Tool Used |
|---------------|-----------|
| "What options does camel-kafka have?" | `camel_docs_component_info` |
| "How do I configure SSL for HTTP?" | `camel_docs_search` |
| "Are there CVEs affecting camel-sql?" | `camel_docs_cve_search` |
| "What changed in Camel 4.18?" | `camel_docs_release_info` |
| "Was CAMEL-22784 fixed?" | `camel_docs_jira_lookup` |

The skill works identically across supported AI targets — entirely MCP-driven, with no agent-specific logic.

## Next Steps

- [MCP Integration](../mcp/) — Camel MCP Server (catalog verification)
- [Architecture Overview](../) — Four-layer architecture
- [Commands Reference](../../reference/commands/) — Full `/camel-knowledge` usage
