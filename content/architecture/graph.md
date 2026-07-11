---
title: "Graph Intelligence"
weight: 3
description: "Property graph code analysis with 9 parsers and DI-aware migration context"
---

Camel-Kit includes a **property graph code intelligence layer** that analyzes integration projects using 9 content parsers and 2 post-processors. The graph provides deep insights for migration planning, dead code detection, impact analysis, and **dependency injection wiring** — but it's **optional**. All skills work without the graph.

![Graph visualization of a MuleSoft project — nodes represent flows, connectors, Maven artifacts, and config properties](../../images/graph-visualize.png)

## Design Principle: Graph Enhances, Never Gates

The graph layer follows a key architectural principle:

> **The graph enhances the AI agent's capabilities but never gates them.**

This means:

- All skills work **without** the graph (using only MCP and user input)
- The graph **adds value** when available (deeper analysis, better recommendations)
- Skills **gracefully degrade** if the graph CLI is unavailable

---

## Architecture & Tooling

{{< tabs id="graph-architecture" >}}
<!--tab Parsers & Post-Processors-->

The graph is built in three phases: PomParser runs first (provides dependency data), then 8 content parsers run in parallel, then 2 post-processors analyze the assembled graph.

**Content Parsers:**

| Parser | Purpose | File Patterns |
|--------|---------|---------------|
| **PomParser** | Maven dependencies and properties | `pom.xml` (runs first, synchronously) |
| **JavaGraphParser** | Java classes, DI annotations, Camel routes in Java DSL | `**/*.java` |
| **XmlRouteParser** | Camel XML routes | `**/*.xml` (with Camel namespace) |
| **YamlRouteParser** | Camel YAML DSL routes | `**/*.yaml`, `**/*.yml` (excluding `application*`) |
| **ConfigParser** | All application properties | `application.properties`, `application-*.properties` |
| **GroovyGraphParser** | Groovy scripts and classes | `**/*.groovy` |
| **MuleXmlFlowParser** | Mule 3.x/4.x flows | `**/*.xml` (with MuleSoft namespace) |
| **DataWeaveParser** | DataWeave transformations | `**/*.dwl` |
| **BizTalkParser** | BizTalk orchestrations, maps, pipelines, bindings | `.odx`, `.btm`, `.btp`, binding `.xml` |

**Post-Processors** (run after all content parsers finish):

| Post-Processor | Purpose |
|----------------|---------|
| **CrossLinker** | Creates cross-references: direct/seda route linking, component-to-artifact mapping, config-to-endpoint binding, interface-consumer expansion |
| **PropertyBindingParser** | Scans property values for Camel's `PropertyBindingSupport` syntax (`#class:`, `#bean:`, `#autowired`, `#type:`), detects Spring Boot/Quarkus conventions |

Each parser extracts:

- **Nodes** (classes, routes, endpoints, beans, dependencies, config properties)
- **Edges** (inheritance, injection, route flow, bean references, config bindings)
- **Metadata** (versions, annotations, namespaces, coordinates)


<!--tab CLI Commands-->

The graph layer is exposed via a CLI with 15 subcommands:

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

### Context Commands

| Command | Purpose |
|---------|---------|
| **project-norms** | Compute P75 statistics for route complexity, property usage |
| **project-context** | Generate project summary (frameworks, patterns, dependencies) |
| **route-context** | Generate route-specific context (endpoints, transformations, error handling) |
| **migration-context** | Structured JSON analysis of a route's full dependency chain — services, components, artifacts, properties, warnings |

### Output Commands

| Command | Purpose |
|---------|---------|
| **generate** | Generate or rebuild the project graph from source files |
| **visualize** | Export graph as GraphML, DOT, or JSON for visualization |


<!--tab Graph vs MCP-->

Originally, Camel-Kit had **three MCP servers**:

1. Camel MCP (catalog verification)
2. Knowledge MCP (semantic search)
3. **Graph MCP** (graph queries)

The Graph MCP was **removed** and replaced with a CLI because:

- **MCP adds latency** — Each graph query becomes a round-trip to the MCP server
- **CLI is faster** — Direct process execution with stdout/stderr
- **Simpler architecture** — One less MCP server to maintain
- **Reduced MCP count** — From 3 to 2 (easier to deploy)


<!--tab Storage-->

The graph is stored in an **in-memory property graph** (not persisted to disk). It's rebuilt on each analysis via:

```bash
camel-kit graph parse --project /path/to/project
```

**Why not persist?**

- **Freshness** — Always reflects current code state
- **Simplicity** — No need to invalidate cache on file changes
- **Speed** — Parsing 175 nodes takes <1 second

For very large projects (1000+ routes), future versions may add persistence.

{{< /tabs >}}

---

## Analysis Capabilities

{{< tabs id="graph-analysis" >}}
<!--tab Dead Code Detection-->

The `dead-code` command analyzes the graph to find:

### 1. Unused Maven Artifacts

**Query:** Find `<dependency>` nodes with no incoming edges from `<import>` or `<class>` nodes.

**Example:**
```
Unused dependency: org.apache.camel:camel-ftp:4.21.0
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


<!--tab Impact Analysis-->

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


<!--tab Dynamic Thresholds-->

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


<!--tab MuleSoft Migration-->

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

{{< /tabs >}}

---

## DI-Aware Analysis & Migration

{{< tabs id="graph-di-migration" >}}
<!--tab DI-Aware Analysis-->

The `JavaGraphParser` understands dependency injection patterns across three frameworks:

**Injection annotations** — `@Inject` (CDI), `@Autowired` (Spring) create `USES_TYPE` edges marking injected dependencies. The graph knows *who depends on what service through which interface*.

**Bean annotations** — `@Component`, `@Service`, `@Repository`, `@Controller` (Spring), `@Named`, `@Singleton`, `@ApplicationScoped`, `@RequestScoped` (CDI) mark classes as managed beans, making them discoverable in the graph.

**Config injection** — `@Value("${key}")` (Spring), `@ConfigProperty(name="key")` (MicroProfile/Quarkus) create `INJECTS_INTO` edges linking configuration properties to the Java fields that consume them.

**Interface-consumer expansion** — When class A injects interface I, and class C implements I, the graph creates a `DEPENDS_ON_VIA_INTERFACE` shortcut edge from A to C. This enables `impact` and `migration-context` queries to trace dependencies *across interface boundaries* — critical for understanding service wiring in Spring Boot and Quarkus projects.

**POM-driven scope guard** — `USES_TYPE` edges are only created for types that matter: project-local classes, Apache Camel types, and framework types (Spring, Quarkus, Mule) detected from Maven dependencies. JDK types like `String` and `Integer` are excluded to keep the graph focused.

**Before and after — a concrete example:**

```java
interface OrderService { void process(Exchange e); }
class OrderServiceImpl implements OrderService { ... }

class OrderRoute extends RouteBuilder {
    @Inject OrderService service;
    void configure() {
        from("kafka:orders").bean(service, "process").to("direct:payment");
    }
}
```

**Before** (without DI-aware analysis): Running `camel-kit graph impact OrderService --direction upstream` returns **nothing** — the `@Inject` field stores `"OrderService"` as a string property but creates no traversable edge. The entire service consumer chain is invisible.

**After**: The graph creates `OrderRoute --USES_TYPE--> OrderService <--IMPLEMENTS-- OrderServiceImpl`, plus a `DEPENDS_ON_VIA_INTERFACE` shortcut from `OrderRoute` to `OrderServiceImpl`. Now `impact` and `migration-context` discover the full chain: migrating `OrderServiceImpl` impacts `OrderRoute`, which uses `kafka` and `direct:payment`.


<!--tab PropertyBindingSupport-->

The `PropertyBindingParser` understands Camel's `PropertyBindingSupport` syntax — the engine that turns `application.properties` into a lightweight dependency injection container.

**Bean instantiation** — `#class:com.foo.MyFactory` creates an `INSTANTIATES` edge, tracking that a property creates an object at runtime.

**Bean references** — `#bean:myService` creates a `REFERENCES_BEAN` edge, linking a property to a named bean in the registry.

**Auto-wiring** — `#autowired` creates a `REFERENCES_BEAN` edge to a synthetic node, flagging that type-based bean discovery happens at runtime.

**Type-based lookup** — `#type:com.foo.Type` creates a `REFERENCES_BEAN` edge, finding a singleton bean by fully qualified class name.

**Property cross-references** — `#property:otherKey` creates a `REFERENCES_PROPERTY` edge linking one configuration property to another.

**Convention-based detection** — Recognizes framework-specific patterns:
- Spring Boot: `spring.datasource.*` → synthetic DataSource bean
- Quarkus: `quarkus.datasource.*` → synthetic DataSource bean
- Quarkus: `quarkus.camel.*` → marked as build-time properties (fixed after build)

**Placeholder resolution** — Scans endpoint URIs for `{{key}}` placeholders and creates `CONFIGURES` edges to the matching configuration properties.

**Runtime detection** — A shared `RuntimeDetector` utility identifies the project's runtime (Spring Boot, Quarkus, Camel Main, Karaf) from Maven dependencies, enabling framework-specific analysis.


<!--tab Migration Context-->

The `migration-context` command produces a **structured JSON analysis** of a route's complete dependency chain — everything the migration skill needs to plan a route-by-route migration.

**Usage:**
```bash
camel-kit graph migration-context <routeId> [--depth N]
```

(the route ID without the `route:` prefix)

**What it collects** (using interface-aware BFS expansion):

| Section | Content |
|---------|---------|
| **routes** | The target route and all connected routes (via direct/seda links) |
| **components** | Deduplicated Camel component schemes used |
| **services** | Managed beans involved (with interface/implementor relationships) |
| **artifacts** | Maven dependencies required |
| **properties** | Configuration properties with their edge types (CONFIGURES, INJECTS_INTO, INSTANTIATES, REFERENCES_BEAN) |
| **warnings** | Synthetic nodes — beans or classes referenced but not found in project source |

**Two-source bridge — graph meets knowledge:**

Camel-Kit has two knowledge sources that the `migration-context` command bridges:

1. **Project graph** — structural knowledge about *your* project (routes, services, properties, dependencies)
2. **Knowledge MCP** — semantic knowledge about *Camel itself* (component docs, migration guides, CVEs, release notes)

Without the bridge, the LLM discovers components from the graph and separately searches docs for each one, manually correlating the two. With `migration-context`, the skill calls a single command to get the full structural context, then passes the component list directly to `camel_docs_component_info` and `camel_docs_cve_search` for targeted documentation lookup. One command replaces a multi-step manual correlation process.

This is more powerful than the paper's single-graph approach — the paper assembles context from one graph (the codebase). Camel-Kit bridges **project-specific structure** with **domain knowledge**.


<!--tab Research Background-->

The graph intelligence enhancements are inspired by the research paper [Chinthareddy, "Reliable Graph-RAG for Codebases: AST-Derived Graphs vs LLM-Extracted Knowledge Graphs"](https://arxiv.org/abs/2601.08773) (January 2026). The paper benchmarks three retrieval approaches for code understanding on Java codebases:

| Approach | Correctness (45 Qs) | Cost |
|----------|---------------------|------|
| Vector-only RAG | 31/45 | 1x |
| LLM-extracted knowledge graph | 38/45 | 46x |
| **Deterministic AST-derived graph (DKB)** | **43/45** | **2x** |

The DKB approach wins decisively: deterministic AST parsing is cheaper, faster, and more reliable than having an LLM extract a knowledge graph at indexing time. The key innovation is **bidirectional traversal with interface-consumer expansion** — when a class implements an interface, the graph traversal automatically discovers all consumers of that interface.

**What we adopted from the paper:**

- **Interface-consumer expansion** — The core algorithm. When a `USES_TYPE` edge points to an interface, and concrete classes `IMPLEMENTS` that interface, the `CrossLinker` creates `DEPENDS_ON_VIA_INTERFACE` shortcut edges. The `expandWithInterfaces()` query method crosses these boundaries during BFS. This directly solves the paper's key finding: vector search retrieves an implementation class but misses the controllers that depend on it through the interface.

- **Bidirectional graph traversal** — The `expandWithInterfaces()` method traverses both successors (downstream dependencies) and predecessors (upstream consumers), with direction-awareness. This is Algorithm 1 from the paper, adapted for our multi-layer graph.

- **Deterministic over LLM-extracted** — We use JavaParser (deterministic AST parsing) rather than asking an LLM to extract a knowledge graph. This aligns with the paper's finding that deterministic indexing achieves near-complete coverage (90-99%) while LLM extraction misses 20-35% of files due to stochastic skipping.

**What we chose not to adopt:**

- **Tree-sitter for parsing** — The paper uses Tree-sitter (a C-native parser with JNI bindings). We use JavaParser instead — it's pure Java, already a dependency of camel-kit, provides a richer typed API (`getExtendedTypes()`, `getImplementedTypes()`, `getAnnotations()`), and supports Java 1-25. Tree-sitter would add native library complexity for no additional benefit in our single-language (Java) context.

- **Single-graph RAG context assembly** — The paper assembles context from one graph (the codebase). Camel-Kit uses a **two-source bridge**: the project graph provides structural context (routes, services, properties), and the Knowledge MCP server provides domain knowledge (Camel documentation, CVEs, migration guides). The `migration-context` command bridges these by outputting a component list that the skill passes to the Knowledge MCP.

- **Closed-world type resolution** — The paper's DKB only tracks types within the project's own source files. This works for the self-contained codebases the paper evaluates (Shopizer, ThingsBoard, OpenMRS) where most types are project-local. But in enterprise Camel projects, the majority of important types come from external dependencies — `RouteBuilder`, `Exchange`, `Processor`, `ProducerTemplate`, component-specific classes. We extended the graph with a **POM-driven framework allowlist** that also tracks dependencies on Apache Camel, Spring, Quarkus, and MuleSoft framework types when those frameworks are detected in the Maven POM.

- **No dependency layer** — The paper completely ignores Maven/Gradle dependency trees, framework auto-configuration (Spring Boot starters, Quarkus extensions), and component-to-artifact mapping (`from("kafka:...")` only works if `camel-kafka` is in the POM). Camel-Kit already handled this dimension through `PomParser` and `CrossLinker` before adopting the DKB innovations — an area where our graph was already more capable than the paper's approach.

- **AST-only analysis** — The paper treats code as the only input. We added two dimensions the paper doesn't consider: **property-based bean wiring** (Camel's `PropertyBindingSupport` syntax where `application.properties` instantiates and references beans) and **configuration-to-code linking** (tracking which properties are injected into which Java fields via `@Value`/`@ConfigProperty`). In Camel projects, properties are a load-bearing part of the architecture, not just metadata.

{{< /tabs >}}

---

## When Graph Is Used

The graph is invoked by skills when:

- **Migrating** (`/camel-migrate`) — Analyze legacy flows, detect dependencies, build migration context
- **Validating** (`/camel-validate`) — Check for dead code, validate against norms
- **Executing** (`/camel-execute`) — Generate project context, optimize route design

Skills that **don't use the graph**:

- `/camel-start` — Routing metadata only
- `/camel-knowledge` — Pure MCP search

## Next Steps

- [Skills System](skills) — How skills invoke graph CLI commands
- [Migration Overview](../getting-started/migration) — How graph powers migration workflows
- [Architecture Overview](../) — Four-layer architecture and progressive disclosure
