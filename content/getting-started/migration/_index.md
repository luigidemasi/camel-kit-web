---
title: "Migration Workflow"
weight: 2
description: "Migrate existing integrations to Apache Camel"
---

The migration workflow converts existing integrations from other platforms to Apache Camel 4.x using YAML DSL. Instead of manual rewriting, the AI performs bounded discovery across your existing artifacts, uses a usable project graph as corroborating evidence and an accelerator, and assembles one evidence-qualified migration package with flow-specific sections. After you approve that complete package once, Camel-Kit creates one implementation plan, executes its tasks in dependency waves, runs one project-wide runtime verification pass, and finishes with report-only static validation. Verification and validation record failures, skipped checks, and unavailable tools rather than claiming that every run is fully validated.

**Supported platforms:**
- MuleSoft Mule 3.x/4.x
- Microsoft BizTalk Server
- Apache Camel 2.x/3.x (including Red Hat Fuse)

---

## Migration Workflow Steps

The migration workflow follows six core steps that apply across all supported platforms. Each step builds on the previous one, ensuring a systematic and verifiable migration.

{{< carousel id="migration-workflow" >}}

<!--step Initialize for Migration-->

Navigate to your existing project directory and initialize Camel-Kit with migration support:

```bash
cd my-existing-project
camel-kit init --here --ai claude --source-platform <platform>
```

**Key flags:**
- `--here` — initialize in the current directory (preserves your existing source)
- `--source-platform` — optionally hint the source platform (`mulesoft`, `camel`, or `biztalk`); omit it to use `auto`

**What gets written or added:**

{{< filetree >}}
- my-existing-project/
  - src/ # Your existing source (unchanged)
  - pom.xml # Your existing POM (unchanged)
  - **mvnw** # Written/refreshed: Maven wrapper launcher for Linux and macOS
  - **mvnw.cmd** # Written/refreshed: Maven wrapper launcher for Windows
  - **.mvn/**
    - **wrapper/**
      - **maven-wrapper.properties** # Written/refreshed: Maven wrapper configuration
  - **AGENTS.md** # New: AI routing table
  - **CLAUDE.md** # New: Claude Code project instructions
  - **.mcp.json** # New: MCP server configuration
  - **.claude/**
    - **settings.json** # New: Claude Code settings
    - **commands/**
      - **camel-start.md** # New: Skill router
      - **camel-brainstorm.md** # New: Greenfield design workflow
      - **camel-migrate.md** # New: Migration orchestrator
      - **camel-plan.md**
      - **camel-execute.md**
      - **camel-validate.md**
      - **camel-knowledge.md**
      - **camel-debug.md**
      - **camel-ship.md**
    - **skills/**
    - **camel-kit-personas/** # New: fourteen complete role definitions for subagents
  - **docs/**
    - **flows/** # New: empty initialization scaffold
  - **test/**
    - **data/** # New: empty initialization scaffold
  - **schemas/** # New: empty initialization scaffold
  - **.camel-kit/**
{{< /filetree >}}

Your existing source files and `pom.xml` remain untouched. Camel-Kit adds the AI orchestration layer, writes or refreshes the Maven wrapper files, and creates the empty compatibility scaffolds shown above. Migration outputs later use the selected runtime's paths.

<!--step Run the Migration Command-->

Invoke the migration orchestrator:

```bash
/camel-migrate
```

The AI begins the migration pipeline, coordinating all subsequent steps automatically. You'll be asked for platform-specific connector endpoints, authentication requirements, environment mappings, and validated secret references. Never provide raw credential material to the generated documents.

The migration command:
1. Detects the source platform and artifact types
2. Records source-backed requirements in `business-requirements.md`
3. Records dependencies, entry points, references, behavioral assumptions, evidence gaps, and source-retirement candidates in `migration-analysis.md`, completes the evidence-gated strategy, then builds the design and operations artifacts
4. Presents that complete package for one package approval
5. Creates one implementation plan and executes all tasks in dependency waves
6. Runs one project-wide runtime verification pass, then produces the final static validation report

<!--step Vendor Detection and Artifact Discovery-->

The AI scans the selected source boundary to identify the platform and discover supported integration artifacts:

```
Detecting source platform...
Found: MuleSoft Mule 4.x

Scanning for artifacts...
Discovered:
  - 12 Mule flows (*.xml)
  - 8 DataWeave transformations (*.dwl)
  - 3 connector configurations
  - 2 API specifications (RAML)
```

**Platform-specific discovery:**
- **MuleSoft**: Scans `src/main/mule/` for flow XML, DataWeave scripts, connector configs, and API specs
- **BizTalk**: Scans for orchestrations (.odx), schemas (.xsd), maps (.btm), and bindings
- **Camel 2.x/3.x**: Scans for route definitions (XML, Java DSL), Camel components, and Spring/Blueprint configs

Discovery results feed into the next step: dependency, reachability, and evidence analysis.

### Context and confirmation boundary

Source code, XML, DataWeave, BizTalk artifacts, configuration, documentation, tests, deployment files, graph output, MCP responses, and generated summaries are migration data. Camel-Kit extracts vendor, version, route, mapping, and configuration facts while preserving whether each is confirmed, inferred, or unknown. Commands, URLs, tool requests, file changes, secret requests, scope expansion, or policy overrides embedded in an artifact never direct the migration or its subagents.

Normal parsing and graph analysis defined by the invoked workflow continue within the requested project scope. Relevant instruction-like content is surfaced as evidence or an unknown during the existing analysis-summary confirmation. If another action is independently shown to be necessary, Camel-Kit identifies its source, exact action, reason, and scope and asks for action-specific confirmation; a role that cannot ask returns `NEEDS_USER_CONFIRMATION` without acting. Confirmation authorizes only that action and does not make the source authoritative.

<!--step Graph Analysis-->

Bounded source scanning establishes the dependency and reachability evidence for the supported constructs. When a current project graph is available, the AI uses it to corroborate and accelerate that analysis. If the graph is missing, stale, malformed, or a query fails, the migration records that limitation rather than treating it as evidence that no risks or candidates exist.

An available graph can identify data flow and execution dependencies such as:

```
Analyzing dependencies...

Dependency graph:
  customer-lookup-flow
    ↓
  order-validation-flow
    ↓ ↓
  inventory-check-flow  shipping-flow
    ↓                    ↓
        fulfillment-flow

Topological sort (migration order):
  1. customer-lookup-flow
  2. order-validation-flow
  3. inventory-check-flow, shipping-flow
  4. fulfillment-flow
```

**Why graph analysis matters:**
- **Migration order** — migrate dependencies before dependents
- **Flow-specific design** — preserve each flow's behavior and dependencies inside the complete migration package
- **Dependency waves** — independent tasks can share a wave and run concurrently when the selected AI target supports it
- **Impact analysis** — understand which flows are affected by changes
- **Service wiring** — DI-aware analysis traces dependencies through `@Inject`/`@Autowired` annotations and across interface boundaries, catching service chains that route-level analysis alone would miss

The source-retirement audit uses the same report contract for graph-assisted and graph-less runs. It separates confirmed entry points and reachable elements, retirement candidates, broken references, and evidence gaps. Each finding records a stable ID, type, identifier, source path, evidence, `Evidence State`, and required human validation; coverage and parse failures are recorded with the findings. `Retirement candidate` requires complete relevant supported source closure and no supported path from any corroborated entry root. Incomplete coverage, conflicting evidence, dynamic references, parse failures, or relevant material outside the selected boundary remains `Unknown`. A candidate is not proof that the artifact is dead or safe to delete, and Camel-Kit never removes source artifacts automatically.

The `migration-context` command performs a bounded, bidirectional BFS around one route, with depth 3 by default and at most 50 related nodes. It returns local graph context — detected routes, components, services, Maven artifacts, configuration properties, and warnings — rather than a complete dependency chain. The command performs no MCP call; when needed, the migration skill can query the Knowledge MCP later as a separate documentation lookup.

If circular dependencies are detected, the AI prompts you to break the cycle (see Troubleshooting below).

<!--step Complete Migration Design-->

The AI analyzes every discovered flow and records flow-specific requirements and technical decisions in one migration design package:

```
Analyzing migration package:
  - customer-lookup-flow
  - order-validation-flow
  - fulfillment-flow

Open design questions:
1. What triggers this flow? (HTTP request, scheduled poll, message queue, etc.)
2. What data transformations occur?
3. What external systems are called?
4. What error handling is required?
5. What are the success/failure criteria?

Generating docs/camel-kit/<pipeline-id>/business-requirements.md...
Generating docs/camel-kit/<pipeline-id>/migration-analysis.md...
Generating docs/camel-kit/<pipeline-id>/design-spec.md...
Generating docs/camel-kit/<pipeline-id>/migration-runbook.md...
Presenting the complete package for approval...
```

**Design-package artifacts:**
- **`business-requirements.md`** — business logic supported by the inspected source evidence, organized with flow-specific requirements and a durable migration-strategy decision
- **`migration-analysis.md`** — behavioral assumptions, evidence gaps, and source-retirement findings with stable IDs and evidence-qualified status
- **`design-spec.md`** — technical specifications for the complete migration, including per-flow components, EIPs, and test cases
- **`migration-runbook.md`** — operator-owned scope, prerequisites, configuration and data readiness, deployment sequence, cutover entry/actions/exit criteria, operational validation, rollback triggers/actions/verification, reconciliation, escalation, soak, and source-retirement decisions

Each risk entry records a stable ID, affected flow or interface, behavioral assumption or evidence gap, category, evidence and source, `Confirmed`, `Inferred`, or `Unknown` status, impact if false, required validation, owner, and disposition. Missing or conflicting evidence remains visible. This identifies evidence gaps and behavioral assumptions; static analysis cannot guarantee that it has discovered undocumented behavior or proved source-to-target equivalence.

The `Migration Strategy` in `business-requirements.md` classifies each reconciled ingress scope as `Incremental candidate`, `Single cutover required`, or `Undetermined - evidence needed`. An `Incremental candidate` must record all eight facts as `Confirmed` current behavior or, where allowed, explicit target design constraints:

1. A controllable pre-consumption external traffic control and its operator
2. The exact deterministic routing or partition unit
3. Mutually exclusive old/new ownership of each selected unit
4. The aligned state, in-flight, and correlation boundary
5. Delivery and ordering effects while traffic is divided or switched
6. Duplicate-delivery exposure and the applicable idempotency control
7. Comparable legacy-versus-target telemetry
8. A rollback signal and reversible traffic control with an identified operator

The existing control, its current owner, the routing unit, and the reversible-control part of rollback require current operational corroboration or explicit operator confirmation. Target ownership, state, delivery, idempotency, telemetry, and rollback-signal conditions may instead be confirmed as evidence-backed design constraints with named owners and concrete pre-cutover validation. This identifies design candidacy, not cutover readiness. Static source, configuration, or graph evidence can show that a mechanism is declared, but by itself is at most `Inferred` evidence that the control is currently operative. Integration size alone is not a safe seam.

`Single cutover required` is valid only within named, validated source and operational-control boundaries whose ingress and control inventory is closed and operator-confirmed, with complete current `Confirmed` evidence that every seam candidate inside those boundaries is absent or unsafe. Anything outside those boundaries or not currently confirmed remains `Undetermined - evidence needed` and receives no concrete cutover guidance. Neither an incremental-candidate nor a single-cutover classification proves deployment, cutover, or rollback readiness.

The runbook is the fourth migration-package artifact, generated from the validated final design after the target runtime is rechecked. It is an operational handoff, not an automatic deployment mechanism, and preserves the strategy classifications, their `MIG-###` and `SRC-###` evidence IDs, and each referenced finding's evidence status. Every required operational fact that is missing, conflicting, stale, `Inferred`, `Unknown`, or not yet validated in the target environment is written exactly as `Unknown — operator decision required: <missing fact>`. Each sentinel-bearing fact is listed under unresolved operator decisions and blocks every dependent deployment, cutover, rollback, reconciliation, soak, or retirement action. Camel-Kit does not invent commands, endpoints, environment values, thresholds, durations, contacts, owners, or decisions. Credential material is never copied into the runbook; only validated secret references may be recorded.

Artifact provenance is `business-requirements.md` → `migration-analysis.md` → `design-spec.md` → `migration-runbook.md`. `implementation-plan.md` is a sibling of the runbook: it derives only from `design-spec.md` and never consumes the runbook. An upstream amendment marks its dependent artifacts stale; a direct design amendment marks the runbook and implementation plan stale separately. Initializing provenance does not clear staleness—each artifact must be genuinely regenerated and revalidated before it is marked current.

Camel-Kit presents the completed package together and waits for one explicit package approval. That approval authorizes the single downstream plan, execution, verification, and validation sequence; it does not authorize infrastructure provisioning, deployment, production traffic switching, rollback, reconciliation, or source retirement. Source retirement remains a separate named operator decision after operational validation, data and message reconciliation, and soak criteria are satisfied.

<!--step Plan and Execute-->

After the complete migration package is approved, the AI automatically invokes the planning and execution pipeline (the same pipeline used for greenfield development). For a Spring Boot or Quarkus target, generated routes and tests use the Maven source layout:

```
Planning approved design spec
  → /camel-plan
  → Plan created: docs/camel-kit/<pipeline-id>/implementation-plan.md

Executing dependency waves...
  → /camel-execute
  → Generated: src/main/resources/camel/customer-lookup.camel.yaml
  → Generated: src/main/resources/camel/order-validation.camel.yaml
  → Generated: src/test/resources/customer-lookup.camel.it.yaml
```

For Camel Main, routes and `application.properties` are generated at the module root; tests remain under `src/test/resources`.

**What happens:**
1. `/camel-plan` creates one detailed implementation plan from the approved `design-spec.md`; it does not consume `migration-runbook.md`
2. `/camel-execute` groups all plan tasks into dependency waves
3. Each wave generates the required Camel YAML routes and Citrus integration tests; independent tasks can run concurrently when the selected AI target supports it
4. After all tasks finish, `/camel-execute` runs one project-wide runtime verification pass and records the outcome
5. The pipeline invokes `/camel-validate` once for final static quality analysis

There is no flow-by-flow approval or automated deployment loop. The single package approval authorizes the complete downstream implementation and validation sequence; operators retain control of the runbook's deployment and traffic actions.

<!--step Internal Verification and Validation-->

`camel-verify` runs internally as part of `/camel-execute`. Unlike the flow-specific Citrus tests generated during implementation, this project-wide pass checks the complete migrated application, runs the applicable Citrus suite across the generated routes, and embeds its verification evidence in `docs/camel-kit/<pipeline-id>/execution-report.md`. Failed, skipped, or unavailable checks are recorded there; they do not prevent the report-only `/camel-validate` stage from running.

**Runtime verification:**

1. **Build / Startup Smoke** — compile Spring Boot or Quarkus with the Maven wrapper or system Maven; run a startup smoke test for Camel Main
2. **Behavioral Tests** — run discovered Citrus end-to-end scenarios when the required tools are available; tests that declare Testcontainers additionally require Docker
3. **Report** — record the runtime, Maven selection, phase outcomes, applied fixes, skipped checks, and any final error

**Example output from a successful run:**

```
VERIFICATION REPORT (embedded in execution-report.md)
Runtime:          Spring Boot
Maven:            ./mvnw (wrapper)

Phase 1 — Build / Startup Smoke:  PASS (1 fix)
Phase 2 — Test:   PASS: 8/8 tests passed

Fixes applied:
  1. [Build] Added the verified runtime dependency required by a migrated route

Skipped checks:
  (none)
```

After runtime verification records its outcome in `execution-report.md`, the pipeline invokes `/camel-validate`:

```
Validating migration...
  → /camel-validate
  → Static quality report generated
```

{{< /carousel >}}

---

## Flow-Aware Migration

Camel-Kit keeps flow-specific analysis and design detail while planning the migration as one approved package. `/camel-execute` schedules that plan in dependency waves: prerequisites run before their dependents, while independent tasks are concurrency candidates on AI targets that support parallel dispatch.

**Benefits:**
- **Traceability** — each migrated route maps back to its source flow and design section
- **Evidence visibility** — stable analysis IDs preserve assumptions, gaps, and retirement candidates across the package
- **Dependency-safe execution** — prerequisite tasks finish before dependent tasks start
- **Bounded parallelism** — independent tasks may share a wave without implying that every AI target runs them concurrently
- **Complete-system evidence** — one project-wide verification section in `execution-report.md` covers the assembled migration before final static validation
- **Operator handoff** — the runbook carries validated evidence and unresolved production decisions into deployment planning

**Progress tracking:**

```
Migration package: 12 flows
Analysis: migration-analysis.md complete; 3 unknowns require named operator decisions
Strategy: Incremental candidate (design candidacy; pre-cutover validation pending)
Package approval: approved
Runbook: generated and approved; operationally blocked by 3 named operator decisions
Plan: implementation-plan.md (derived only from design-spec.md)
Execution: dependency wave 3/4
Runtime verification: pending
Final validation: pending
```

This progress describes tasks within one migration package; it does not imply that individual flows were separately approved, verified project-wide, or declared ready for deployment.

---

## Troubleshooting

Common issues and resolutions during migration:

{{< carousel id="migration-troubleshooting" >}}

<!--step Graph Unavailable or Incomplete-->

**Symptom:**

```
Warning: Project graph unavailable or incomplete
Continuing with bounded source discovery
```

**Resolution:** The migration records the graph failure, scans the supported source artifacts directly, and emits the same source-retirement sections with explicit coverage and parse failures. Review any evidence gaps and validate candidate-unused artifacts with owners and runtime evidence. An empty candidate list under incomplete coverage does not mean that every source artifact is reachable.

<!--step Graph Analysis Fails (Circular Dependency)-->

**Symptom:**

```
Error: Circular dependency detected
  flow-a → flow-b → flow-c → flow-a
Cannot determine migration order.
```

**Cause:** Flows reference each other in a cycle (e.g., flow-a calls flow-b, flow-b calls flow-c, flow-c calls flow-a).

**Resolution:**
1. Review the dependency chain to identify the cycle
2. Break the cycle by refactoring one flow (e.g., extract shared logic to a utility flow)
3. Alternatively, migrate the cycle as a group (test all three flows together)

**Example fix:**

```
Before:
  flow-a → flow-b → flow-c → flow-a

After (extract shared logic):
  flow-a → shared-util
  flow-b → shared-util
  flow-c → shared-util
```

<!--step DataWeave/Map Too Complex-->

**Symptom:**

```
Warning: Complex DataWeave transformation detected
  File: src/main/resources/transformations/order-mapping.dwl
  Recommendation: Manual review suggested
```

**Cause:** DataWeave scripts (MuleSoft) or BizTalk maps may use platform-specific functions that do not translate directly to the supported Camel-Kit mapping paths.

**Resolution:**
1. Review the selected mapping strategy: inline Groovy when both schemas are absent or the mapping has fewer than 20 leaf fields; XSLT only when the mapping has at least 20 leaf fields and at least one schema
2. Compare input/output examples from the original DataWeave/map
3. Confirm and record unsupported constructs as required custom mapping or processor actions
4. Add behavioral tests to validate the transformation

**Example:**

```text
Selected strategy: XSLT
Reason: Source and target schemas are available and the mapping has 24 fields.
Unsupported function: source platform custom lookup
Required action: implement and test a custom processor for that lookup
```

<!--step Missing Component Equivalent-->

**Symptom:**

```
Warning: No direct Camel equivalent for connector
  Source: Salesforce Connector (MuleSoft)
  Recommendation: Use camel-salesforce component with manual configuration
```

**Cause:** Some platform-specific connectors may not have exact Camel equivalents, or require additional configuration.

**Resolution:**
1. Consult the approved design specification and the verification evidence embedded in `execution-report.md` for suggested Camel components and recorded gaps
2. Review the [Camel Components documentation](https://camel.apache.org/components/latest/) for alternatives
3. If no component exists, implement a custom processor or use a catalog-verified HTTP component for a documented API fallback
4. Update the approved design specification and regenerate its stale downstream artifacts

**Common mappings:**
- **Salesforce Connector** → `camel-salesforce`
- **SAP Connector** → `camel-sap-netweaver` or `camel-sap-hana`
- **Database Connector** → `camel-sql` or `camel-jpa`
- **File Connector** → `camel-file`
- **HTTP Request** → `camel-http`

<!--step Verification Fails-->

**Symptom:**

```
Verification failed: Behavioral test failure
  Test: order-validation-flow-integration-test
  Expected: 200 OK
  Actual: 500 Internal Server Error
```

**Cause:** The migrated route may have incorrect endpoint, authentication, secret-reference, transformation, or dependency configuration.

**Resolution:**
1. Review the test failure details (stack trace, logs)
2. Check the migrated route configuration against the original flow
3. Verify the connector endpoint, authentication requirements, and validated secret reference without copying raw credential material into generated documents
4. Run the test in debug mode to inspect data at each step
5. If the issue is environmental (e.g., missing database), document it in the verification section of `execution-report.md` before deciding whether to proceed

**Debugging steps:**

In the commands below, replace `{module}/` with the target module's relative path,
or omit the entire prefix when the target is the project root.

```bash
# In your AI agent, diagnose the broken migrated route
/camel-debug

# Run a generated Citrus test in isolation
camel test run {module}/src/test/resources/order-validation-flow.camel.it.yaml

# Inspect a Spring Boot or Quarkus route
cat {module}/src/main/resources/camel/order-validation.camel.yaml

# Camel Main places the route at the module root instead
cat {module}/order-validation.camel.yaml
```

{{< /carousel >}}

---

## Summary

The migration workflow automates platform conversion through six steps:

1. **Initialize** — add Camel-Kit to your existing project
2. **Detect** — discover artifacts and identify the source platform
3. **Record requirements** — write source-backed requirements in `business-requirements.md`
4. **Analyze, design, and prepare operations** — use graph-assisted or graph-less discovery to write `migration-analysis.md`, complete the evidence-gated strategy in `business-requirements.md`, then write `design-spec.md` and `migration-runbook.md`
5. **Plan and implement** — create one implementation plan, then generate Camel routes and Citrus tests in dependency waves through `/camel-execute`
6. **Verify and validate** — record one project-wide runtime verification outcome, then run `/camel-validate` for the final report-only static quality analysis

This workflow applies across all supported platforms. For platform-specific details (artifact formats, connector mappings, known limitations), see the platform pages below.
