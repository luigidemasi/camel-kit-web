---
title: "Graph Intelligence"
weight: 3
description: "Property graph code analysis with 8 parsers"
---

Camel-Kit includes a **property graph code intelligence layer** that analyzes integration projects using 8 specialized parsers. The graph provides deep insights for migration planning, dead code detection, and impact analysis — but it's **optional**. All skills work without the graph.

![Graph visualization of a MuleSoft project — nodes represent flows, connectors, Maven artifacts, and config properties](../../images/graph-visualize.png)

## Design Principle: Graph Enhances, Never Gates

The graph layer follows a key architectural principle:

> **The graph enhances the AI agent's capabilities but never gates them.**

This means:

- All skills work **without** the graph (using only MCP and user input)
- The graph **adds value** when available (deeper analysis, better recommendations)
- Skills **gracefully degrade** if the graph CLI is unavailable

{{< carousel id="graph-features" >}}
<!--step 8 Parsers-->

The graph is built by parsing project files with 8 specialized parsers:

| Parser | Purpose | File Patterns |
|--------|---------|---------------|
| **CamelXmlParser** | Camel XML routes | `src/main/resources/camel/*.xml` |
| **MavenPomParser** | Maven dependencies | `pom.xml` |
| **JavaBeansParser** | Java bean definitions | `src/main/java/**/*.java` |
| **MulesoftXmlParser** | Mule 3.x/4.x flows | `src/main/app/*.xml`, `src/main/mule/**/*.xml` |
| **DataWeaveParser** | DataWeave transformations | `src/main/resources/dw/*.dwl` |
| **PropertiesParser** | Configuration properties | `*.properties`, `application.yml` |
| **YamlRoutesParser** | Camel YAML DSL routes | `src/main/resources/camel/*.yaml` |
| **SpringBeansParser** | Spring XML bean configs | `src/main/resources/META-INF/spring/*.xml` |

Each parser extracts:

- **Nodes** (flows, beans, endpoints, transformations, dependencies)
- **Edges** (flow sequence, bean references, data mappings, config bindings)
- **Metadata** (versions, properties, namespaces, coordinates)


<!--step 14 CLI Commands-->

The graph layer is exposed via a CLI with 14 subcommands:

### Analysis Commands

| Command | Purpose |
|---------|---------|
| **stats** | Node/edge counts, degree distribution, connected components |
| **find** | Find nodes by ID, type, label, or property |
| **neighbors** | Get all nodes connected to a given node |
| **path** | Find shortest path between two nodes |
| **subgraph** | Extract subgraph around a node (BFS with depth limit) |

### Camel-Specific Commands

| Command | Purpose |
|---------|---------|
| **route-flow** | Trace flow execution from source to sink |
| **impact** | Analyze impact of changing a node (downstream effects) |
| **route-topology** | Visualize route structure (linear, branching, error handlers) |
| **dead-code** | Detect unused artifacts, orphaned routes, unused properties |

### Normalization Commands

| Command | Purpose |
|---------|---------|
| **project-norms** | Compute P75 statistics for route complexity, property usage |
| **project-context** | Generate project summary (frameworks, patterns, dependencies) |
| **route-context** | Generate route-specific context (endpoints, transformations, error handling) |

### Output Commands

| Command | Purpose |
|---------|---------|
| **generate** | Generate migration templates or boilerplate code |
| **visualize** | Export graph as GraphML, DOT, or JSON for visualization |


<!--step Dead Code Detection-->

The `dead-code` command analyzes the graph to find:

### 1. Unused Maven Artifacts

**Query:** Find `<dependency>` nodes with no incoming edges from `<import>` or `<class>` nodes.

**Example:**
```
Unused dependency: org.apache.camel:camel-ftp:4.14.0
  └─ No classes from this artifact are referenced
```

### 2. Orphaned Routes

**Query:** Find `<route>` nodes with no incoming edges from other routes or external triggers.

**Example:**
```
Orphaned route: direct:legacy-processor
  └─ No routes call this endpoint
  └─ No HTTP/JMS/File consumers trigger this route
```

### 3. Unused Configuration Properties

**Query:** Find `<property>` nodes with no outgoing edges to `<route>` or `<bean>` nodes.

**Example:**
```
Unused property: app.legacy.api.url
  └─ Not referenced in any route or bean
```


<!--step Impact Analysis-->

The `impact` command shows **downstream effects** of changing a node.

**Query:**
```bash
camel-kit graph impact --node "jms:queue:orders"
```

**Output:**
```
Impact of changing jms:queue:orders:
  1. route:order-processor (reads from this queue)
     ├─ bean:orderValidator (validates orders)
     ├─ route:notify-warehouse (sends notifications)
     └─ jms:queue:processed-orders (writes processed orders)
  
  2. route:order-monitor (also reads from this queue)
     └─ bean:metricsCollector (tracks order metrics)

Total affected routes: 2
Total affected beans: 2
Total downstream endpoints: 1
```

This helps answer questions like:

- "What breaks if I rename this queue?"
- "Which routes depend on this transformation?"
- "What's the blast radius of this change?"


<!--step Dynamic Thresholds-->

The `project-norms` command computes **P75 statistics** from the graph to establish project-specific validation thresholds.

**Query:**
```bash
camel-kit graph project-norms
```

**Output:**
```json
{
  "routeComplexity": {
    "p50": 7,
    "p75": 12,
    "p90": 18,
    "p99": 25
  },
  "propertiesPerRoute": {
    "p50": 3,
    "p75": 5,
    "p90": 8,
    "p99": 12
  },
  "beansPerRoute": {
    "p50": 2,
    "p75": 4,
    "p90": 6,
    "p99": 10
  }
}
```

**Usage:**

When validating a new route, the agent can compare it against project norms:

```markdown
## Validation Results
- Route complexity: 15 steps (above P75 of 12 — consider splitting)
- Properties used: 4 (within P75 of 5 — acceptable)
- Beans referenced: 7 (above P75 of 4 — review for reusability)
```

This enables **context-aware validation** — what's "too complex" in one project might be normal in another.


<!--step MuleSoft Migration-->

On large MuleSoft projects, the graph can have **175+ nodes**:

**Stats:**
```
Nodes: 178
  - Flow: 23
  - Processor: 68
  - Endpoint: 42
  - Bean: 31
  - Transformation: 14

Edges: 312
  - FLOWS_TO: 156
  - USES_BEAN: 89
  - TRANSFORMS_WITH: 34
  - WRITES_TO: 33
```

**Route Flow Analysis:**
```bash
camel-kit graph route-flow --route "order-processing-flow"
```

**Output:**
```
Route: order-processing-flow
  1. http:listener (POST /api/orders)
  2. json-to-object-transformer
  3. set-variable (customerId)
  4. flow-ref (validate-customer-subflow)
     ├─ db:select (customer lookup)
     └─ choice (customer exists?)
  5. set-payload (order confirmation)
  6. jms:publish (order.queue)
  7. on-error-propagate (error handler)
```

This graph-based flow tracing enables:

- **Accurate migration** (preserve exact flow semantics)
- **Dependency discovery** (which sub-flows are called?)
- **Error handling analysis** (what happens on failure?)


<!--step Graph vs MCP Server-->

Originally, Camel-Kit had **three MCP servers**:

1. Camel MCP (catalog verification)
2. Knowledge MCP (semantic search)
3. **Graph MCP** (graph queries)

The Graph MCP was **removed** and replaced with a CLI because:

- **MCP adds latency** — Each graph query becomes a round-trip to the MCP server
- **CLI is faster** — Direct process execution with stdout/stderr
- **Simpler architecture** — One less MCP server to maintain
- **Reduced MCP count** — From 3 to 2 (easier to deploy)




<!--step Storage Strategy-->

The graph is stored in an **in-memory property graph** (not persisted to disk). It's rebuilt on each analysis via:

```bash
camel-kit graph parse --project /path/to/project
```

**Why not persist?**

- **Freshness** — Always reflects current code state
- **Simplicity** — No need to invalidate cache on file changes
- **Speed** — Parsing 175 nodes takes <1 second

For very large projects (1000+ routes), future versions may add persistence.

{{< /carousel >}}

## When Graph Is Used

The graph is invoked by skills when:

- **Migrating** (`/camel-migrate`) — Analyze legacy flows, detect dependencies
- **Validating** (`/camel-validate`) — Check for dead code, validate against norms
- **Executing** (`/camel-execute`) — Generate project context, optimize route design

Skills that **don't use the graph**:

- `/camel-project` — Pure user input
- `/camel-knowledge` — Pure MCP search
- `/camel-flow` — User interview + MCP verification

## Next Steps

- [Skills System](skills) — How skills invoke graph CLI commands
- [Migration Overview](../migration) — How graph powers MuleSoft migration
- [Architecture Overview](../) — Four-layer architecture and progressive disclosure
