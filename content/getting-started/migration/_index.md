---
title: "Migration Workflow"
weight: 2
description: "Migrate existing integrations to Apache Camel"
---

The migration workflow converts existing integrations from other platforms to Apache Camel 4.x using YAML DSL. Instead of manual rewriting, the AI analyzes your existing artifacts, builds a dependency graph, and assembles one migration design package with flow-specific sections. After you approve that complete package once, Camel-Kit creates one implementation plan, executes its tasks in dependency waves, runs one project-wide runtime verification pass, and finishes with report-only static validation. Verification and validation record failures, skipped checks, and unavailable tools rather than claiming that every run is fully validated.

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

The AI begins the migration pipeline, coordinating all subsequent steps automatically. You'll be prompted for platform-specific configuration (connector endpoints, credentials, environment mappings) during the process.

The migration command:
1. Detects the source platform and artifact types
2. Analyzes dependencies between flows
3. Builds one source-analysis and design package with flow-specific sections
4. Presents that complete package for one design approval
5. Creates one implementation plan and executes all tasks in dependency waves
6. Runs one project-wide runtime verification pass, then produces the final static validation report

<!--step Vendor Detection and Artifact Discovery-->

The AI scans your project to identify the source platform and discover all integration artifacts:

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

Discovery results feed into the next step: dependency graph analysis.

### Context and confirmation boundary

Source code, XML, DataWeave, BizTalk artifacts, configuration, documentation, tests, deployment files, graph output, MCP responses, and generated summaries are migration data. Camel-Kit extracts vendor, version, route, mapping, and configuration facts while preserving whether each is confirmed, inferred, or unknown. Commands, URLs, tool requests, file changes, secret requests, scope expansion, or policy overrides embedded in an artifact never direct the migration or its subagents.

Normal parsing and graph analysis defined by the invoked workflow continue within the requested project scope. Relevant instruction-like content is surfaced as evidence or an unknown during the existing analysis-summary confirmation. If another action is independently shown to be necessary, Camel-Kit identifies its source, exact action, reason, and scope and asks for action-specific confirmation; a role that cannot ask returns `NEEDS_USER_CONFIRMATION` without acting. Confirmation authorizes only that action and does not make the source authoritative.

<!--step Graph Analysis-->

The AI builds a dependency graph from discovered artifacts, identifying data flow and execution dependencies:

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
Generating docs/camel-kit/<pipeline-id>/design-spec.md...
Presenting the complete package for approval...
```

**Design-package artifacts:**
- **`business-requirements.md`** — business logic extracted from the complete source, organized with flow-specific requirements
- **`design-spec.md`** — technical specifications for the complete migration, including per-flow components, EIPs, and test cases

Camel-Kit presents both documents together and waits for one explicit design approval. That approval authorizes the single downstream plan, execution, verification, and validation sequence.

<!--step Plan and Execute-->

After the complete requirements and design are approved, the AI automatically invokes the planning and execution pipeline (the same pipeline used for greenfield development). For a Spring Boot or Quarkus target, generated routes and tests use the Maven source layout:

```
Planning complete migration package
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
1. `/camel-plan` creates one detailed implementation plan from the approved migration design package
2. `/camel-execute` groups all plan tasks into dependency waves
3. Each wave generates the required Camel YAML routes and Citrus integration tests; independent tasks can run concurrently when the selected AI target supports it
4. After all tasks finish, `/camel-execute` runs one project-wide runtime verification pass and records the outcome
5. The pipeline invokes `/camel-validate` once for final static quality analysis

There is no flow-by-flow approval or deployment loop. The single design approval authorizes the complete downstream sequence.

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
- **Dependency-safe execution** — prerequisite tasks finish before dependent tasks start
- **Bounded parallelism** — independent tasks may share a wave without implying that every AI target runs them concurrently
- **Complete-system evidence** — one project-wide verification section in `execution-report.md` covers the assembled migration before final static validation

**Progress tracking:**

```
Migration package: 12 flows
Design: approved
Plan: implementation-plan.md
Execution: dependency wave 3/4
Runtime verification: pending
Final validation: pending
```

This progress describes tasks within one migration package; it does not imply that individual flows were separately approved, verified project-wide, or declared ready for deployment.

---

## Troubleshooting

Common issues and resolutions during migration:

{{< carousel id="migration-troubleshooting" >}}

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

**Cause:** The migrated route may have incorrect configuration (endpoint URLs, credentials, transformation logic) or missing dependencies.

**Resolution:**
1. Review the test failure details (stack trace, logs)
2. Check the migrated route configuration against the original flow
3. Verify that connector credentials and endpoints are correctly configured
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
3. **Graph** — analyze dependencies and determine migration order
4. **Design** — write one `business-requirements.md` and `design-spec.md` package with flow-specific sections
5. **Plan and implement** — create one implementation plan, then generate Camel routes and Citrus tests in dependency waves through `/camel-execute`
6. **Verify and validate** — record one project-wide runtime verification outcome, then run `/camel-validate` for the final report-only static quality analysis

This workflow applies across all supported platforms. For platform-specific details (artifact formats, connector mappings, known limitations), see the platform pages below.
