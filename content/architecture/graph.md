---
title: "Graph Intelligence"
weight: 3
description: "Property graph code analysis with 9 parsers and DI-aware migration context"
---

Camel-Kit includes a **property graph code intelligence layer** that analyzes integration projects using 9 content parsers and 2 post-processors. The graph provides deep insights for migration planning, graph-covered structural retirement-candidate analysis, impact analysis, and **dependency injection wiring** — but it's **optional**. All skills work without the graph.

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
| **XmlRouteParser** | Camel XML routes, recognized by the `route` local name in any namespace | `**/*.xml` (excluding Maven POM, MuleSoft, and BizTalk inputs) |
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

Across the parsers and post-processors, graph construction extracts:

- **Nodes** (classes, routes, endpoints, beans, dependencies, config properties)
- **Edges** (inheritance, injection, route flow, bean references, config bindings)
- **Metadata** (versions, annotations, namespaces, coordinates)


<!--tab CLI Commands-->

The graph layer is exposed via a CLI with 15 subcommands:

### Analysis Commands

| Command | Purpose |
|---------|---------|
| **stats** | Return `available`, total `nodes` and `edges`, and `nodesByType` |
| **find** | Filter by node type; regex-match name or FQN, then fall back to searching node IDs |
| **neighbors** | Traverse incoming, outgoing, or both directions, optionally filtered by edge type and depth |
| **path** | Find shortest path between two nodes |
| **subgraph** | Extract subgraph around a node (BFS with depth limit) |

### Camel-Specific Commands

| Command | Purpose |
|---------|---------|
| **route-flow** | For an exact `CAMEL_ROUTE` node ID, emit ordered `FROM`, `PROCESSOR`, and `TO` steps |
| **impact** | Compute bounded transitive reachability, up to 50 nodes per direction; direction defaults to both |
| **route-topology** | Report route-to-route connections with target route, endpoint scheme, and URI |
| **dead-code** | Report graph-covered structural candidates for non-framework `camel-*` artifacts, unmatched `direct`/`seda` consumers, and unused `camel.*` properties |

### Context Commands

| Command | Purpose |
|---------|---------|
| **project-norms** | Report route-ID naming, error-handling coverage, property prefixes, and route step-count norms |
| **project-context** | Return `propertyConventions`, `existingBeans`, `dependencyVersions`, and `routeDirectory` |
| **route-context** | Return `upstream`, `downstream`, classified `endpoints`, and `errorFlow` for a route |
| **migration-context** | Structured JSON from a bounded, bidirectional BFS around a route — services, components, artifacts, properties, warnings |

### Output Commands

| Command | Purpose |
|---------|---------|
| **generate** | Generate or rebuild the project graph from source files |
| **visualize** | Generate an interactive HTML visualization from the persisted graph |


<!--tab Graph vs MCP-->

Graph queries were moved out of MCP and into the local CLI because:

- **MCP adds latency** — Each graph query becomes a round-trip to the MCP server
- **CLI is faster** — Direct process execution with stdout/stderr
- **Simpler architecture** — One less MCP server to maintain
- **No extra graph server** — Generated projects keep the Camel, Knowledge, and Citrus MCP servers, while graph analysis stays local


<!--tab Storage-->

`graph generate` builds the property graph and persists it at `.camel-kit/project-graph.json` by default:

```bash
cd /path/to/project
camel-kit graph generate
```

Query commands read that file. Regenerate it after source changes so queries reflect the current project. You can choose another output for generation with `--output` and pass a graph file to queries with `--graph-file`.

`graph visualize` reads `.camel-kit/project-graph.json` by default and writes the interactive page to `.camel-kit/project-graph.html`.

{{< /tabs >}}

---

## Analysis Capabilities

{{< tabs id="graph-analysis" >}}
<!--tab Structural Retirement Candidates-->

The `dead-code` command reports graph-covered structural candidates in its existing JSON categories:
Treat every result as a candidate within graph coverage, not proof that code or configuration is dead or safe to remove.

### 1. Unused Camel Maven Artifacts

**Query:** Find Maven artifact nodes whose artifact ID starts with `camel-`, excluding framework artifacts, with no incoming `USES_COMPONENT` edge.

**Example:**
```
Unused dependency: org.apache.camel:camel-ftp:4.21.0
  └─ No component usage is linked to this artifact
```

### 2. Unmatched Internal Consumers

**Query:** Find routes consuming a `direct` or `seda` URI for which no route produces the same URI. Consumers using externally triggered schemes are not reported by this check.

**Example:**
```
Unmatched internal consumer: direct:legacy-processor
  └─ No route produces this direct URI
```

### 3. Unused Camel Configuration Properties

**Query:** Find configuration properties whose keys start with `camel.` and have no outgoing `CONFIGURES` edge.

**Example:**
```
Unused property: camel.component.ftp.legacy-option
  └─ No CONFIGURES edge links this property to a graph node
```


<!--tab Impact Analysis-->

The `impact` command computes bounded transitive reachability in the requested
direction, capped at 50 nodes per direction. The direction can be `upstream`,
`downstream`, or `both`; it defaults to `both`.

**Query:**
```bash
camel-kit graph impact class:com.example.OrderServiceImpl --direction upstream
```

**Output shape:**
```json
{
  "found": true,
  "total": 1,
  "byType": {
    "CLASS": [
      {
        "id": "class:com.example.OrderRoute",
        "type": "CLASS",
        "properties": {
          "name": "OrderRoute",
          "fqn": "com.example.OrderRoute",
          "package": "com.example",
          "file": "src/main/java/com/example/OrderRoute.java",
          "interface": "false"
        }
      }
    ]
  }
}
```

This helps answer questions like:

- "What breaks if I rename this queue?"
- "Which routes depend on this transformation?"
- "What's the blast radius of this change?"


<!--tab Project Norms-->

The `project-norms` command reports project conventions plus an observed **P75 route step count**.

**Query:**
```bash
camel-kit graph project-norms
```

**Output shape:**
```json
{
  "naming": {
    "routeIds": ["route:order-ingest", "route:order-process"],
    "detectedPattern": "kebab-case",
    "majorityPercentage": 0
  },
  "errorHandling": {
    "totalRoutes": 2,
    "routesWithErrorHandling": 1,
    "coverage": 50.0
  },
  "properties": {
    "patterns": ["orders.*"],
    "count": 3
  },
  "stepCounts": {
    "values": [4, 9],
    "p75": 9,
    "median": 9,
    "max": 9
  }
}
```

These are the nested sections returned by the raw command. When the graph is available, `/camel-validate` consumes them together with the `dead-code` report for project-aware validation.


<!--tab MuleSoft Migration-->

MuleSoft projects use the same graph statistics schema:

**Stats:**
```json
{
  "available": true,
  "nodes": 4,
  "edges": 3,
  "nodesByType": {
    "MULE_FLOW": 1,
    "MULE_PROCESSOR": 2,
    "MULE_ENDPOINT": 1
  }
}
```

Inspect the ordered nodes contained by a Mule flow with `neighbors` and the flow's exact graph ID:

```bash
camel-kit graph neighbors mule-flow:order-processing-flow --direction out --edge-type MULE_FLOW_CONTAINS
```

The returned edges include their `order` property. To inspect called subflows instead:

```bash
camel-kit graph neighbors mule-flow:order-processing-flow --direction out --edge-type MULE_CALLS_SUBFLOW
```

`route-flow` is Camel-specific: it accepts an exact `CAMEL_ROUTE` ID such as `route:order-processing-flow` and emits only `FROM`, `PROCESSOR`, and `TO` steps.

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

**Before** (without DI-aware analysis): Running `camel-kit graph impact class:com.example.OrderServiceImpl --direction upstream` returns **nothing** — the `@Inject` field stores `"OrderService"` as a string property but creates no traversable edge. The entire service consumer chain is invisible.

**After**: The graph creates `OrderRoute --USES_TYPE--> OrderService <--IMPLEMENTS-- OrderServiceImpl`, plus a `DEPENDS_ON_VIA_INTERFACE` shortcut from `OrderRoute` to `OrderServiceImpl`. Within its traversal bounds, `impact` and `migration-context` can now connect `OrderServiceImpl` to `OrderRoute`, which uses `kafka` and `direct:payment`.


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

The `migration-context` command produces **structured JSON from the local project graph**. It performs a bidirectional, interface-aware BFS from one route, defaults to depth 3, and expands at most 50 related nodes. The result is focused local context, not a complete dependency map.

**Usage:**
```bash
camel-kit graph migration-context <routeId> [--depth N]
```

(the route ID without the `route:` prefix)

**What it collects** (using interface-aware BFS expansion):

| Section | Content |
|---------|---------|
| **routes** | The target route and connected routes found within the traversal bounds |
| **components** | Deduplicated Camel component schemes found |
| **services** | Managed bean nodes reached by interface-aware traversal; each entry contains `class`, `bean`, and `beanName` |
| **artifacts** | Maven artifact nodes found |
| **properties** | Configuration key and value, plus one row for every outgoing edge type and target (or blank edge and target when none exists) |
| **warnings** | Every reached node marked `synthetic=true`; each entry uses `type: "synthetic-node"`, puts the node ID in `name`, and includes `reason` |

**Local graph context and later documentation lookup:**

Camel-Kit has two complementary sources:

1. **Project graph** — structural knowledge about *your* project (routes, services, properties, dependencies)
2. **Knowledge MCP** — semantic knowledge about *Camel itself* (component docs, migration guides, CVEs, release notes)

The `migration-context` command reads only the project graph and performs no MCP call. If migration work needs Camel documentation, CVEs, or migration guides, the migration skill can later query the Knowledge MCP as a separate action, using components reported by the graph as lookup input.


<!--tab Research Background-->

The graph intelligence enhancements are inspired by the research paper [Chinthareddy, "Reliable Graph-RAG for Codebases: AST-Derived Graphs vs LLM-Extracted Knowledge Graphs"](https://arxiv.org/abs/2601.08773) (January 2026). The paper benchmarks three retrieval approaches for code understanding on Java codebases:

| Approach | Correctness (45 Qs) | Cost on the paper's OpenMRS + ThingsBoard workload |
|----------|---------------------|---------------------------------------------------|
| Vector-only RAG | 31/45 | 1.00x |
| LLM-extracted knowledge graph | 38/45 | 45.64x |
| **Deterministic AST-derived graph (DKB)** | **43/45** | **2.13x** |

The DKB approach wins decisively: deterministic AST parsing is cheaper, faster, and more reliable than having an LLM extract a knowledge graph at indexing time. The key innovation is **bidirectional traversal with interface-consumer expansion** — when a class implements an interface, the graph traversal can discover consumers of that interface within its configured bounds.

**What we adopted from the paper:**

- **Interface-consumer expansion** — The core algorithm. When a `USES_TYPE` edge points to an interface, and concrete classes `IMPLEMENTS` that interface, the `CrossLinker` creates `DEPENDS_ON_VIA_INTERFACE` shortcut edges. The `expandWithInterfaces()` query method crosses these boundaries during BFS. This directly solves the paper's key finding: vector search retrieves an implementation class but misses the controllers that depend on it through the interface.

- **Bidirectional graph traversal** — The `expandWithInterfaces()` method traverses both successors (downstream dependencies) and predecessors (upstream consumers), with direction-awareness. This is Algorithm 1 from the paper, adapted for our multi-layer graph.

- **Deterministic over LLM-extracted** — We use JavaParser (deterministic AST parsing) rather than asking an LLM to extract a knowledge graph. This aligns with the paper's finding that deterministic indexing achieves near-complete chunk coverage (90-99%) while LLM extraction misses 20-35% of files due to stochastic skipping.

**What we chose not to adopt:**

- **Tree-sitter for parsing** — The paper uses Tree-sitter (a C-native parser with JNI bindings). For Camel-Kit's Java AST parsing, we use JavaParser instead — it's pure Java, already a dependency of camel-kit, and provides a richer typed API (`getExtendedTypes()`, `getImplementedTypes()`, `getAnnotations()`). Other graph parsers handle YAML, XML, Groovy, and related project formats, so adding Tree-sitter solely to the Java layer would add native-library complexity without a clear benefit.

- **Single-graph RAG context assembly** — The paper assembles context from one graph (the codebase). Camel-Kit keeps project structure and domain knowledge separate: `migration-context` reads the local project graph only, while a migration skill can later request Camel documentation, CVEs, or migration guides through the Knowledge MCP as a separate action.

- **Closed-world type resolution** — The paper's DKB only tracks types within the project's own source files. This works for the self-contained codebases the paper evaluates (Shopizer, ThingsBoard, OpenMRS) where most types are project-local. But in enterprise Camel projects, the majority of important types come from external dependencies — `RouteBuilder`, `Exchange`, `Processor`, `ProducerTemplate`, component-specific classes. We extended the graph with a **POM-driven framework allowlist** that also tracks dependencies on Apache Camel, Spring, Quarkus, and MuleSoft framework types when those frameworks are detected in the Maven POM.

- **No dependency layer** — The paper does not model Maven metadata or component-to-artifact mapping (`from("kafka:...")` only works if `camel-kafka` is in the POM). Camel-Kit's `PomParser` records direct dependency metadata from `pom.xml`, and `CrossLinker` maps component usage to those artifacts — an area the graph already handled before adopting the DKB innovations.

- **AST-only analysis** — The paper treats code as the only input. We added two dimensions the paper doesn't consider: **property-based bean wiring** (Camel's `PropertyBindingSupport` syntax where `application.properties` instantiates and references beans) and **configuration-to-code linking** (tracking which properties are injected into which Java fields via `@Value`/`@ConfigProperty`). In Camel projects, properties are a load-bearing part of the architecture, not just metadata.

{{< /tabs >}}

---

## When Graph Is Used

The graph is invoked by skills when:

- **Migrating** (`/camel-migrate`) — Analyze legacy flows, detect dependencies, build migration context
- **Implementing** (`camel-implement`, invoked inside execute tasks) — Conditionally load `project-context` when a graph is available
- **Testing** (internal `camel-test` skill) — Conditionally load `route-context` when a graph is available
- **Validating** (`/camel-validate`) — Consume nested `project-norms` and include the `dead-code` report when a graph is available

Examples of skills that **don't use the graph**:

- `/camel-start` — Routing metadata only
- `/camel-knowledge` — Pure MCP search

## Next Steps

- [Skills System](../skills/) — How skills invoke graph CLI commands
- [Migration Overview](../../getting-started/migration/) — How graph powers migration workflows
- [Architecture Overview](../) — Four-layer architecture and progressive disclosure
