---
title: "Migration Workflow"
weight: 2
description: "Migrate existing integrations to Apache Camel"
---

The migration workflow converts existing integrations from other platforms to Apache Camel 4.x using YAML DSL. Instead of manual rewriting, the AI analyzes your existing artifacts, builds a dependency graph, and migrates flow-by-flow with full validation. This approach automates platform conversion while preserving business logic and catching issues early through automated verification.

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
- `--source-platform` — specify the source platform (`mulesoft`, `biztalk`, `camel2`, or `fuse`)

**What gets added:**

{{< filetree >}}
- my-existing-project/
  - src/ # Your existing source (unchanged)
  - pom.xml # Your existing POM (unchanged)
  - **AGENTS.md** # New: AI routing table
  - **.claude/**
    - **commands/**
      - **camel-migrate.md** # New: Migration orchestrator
      - **camel-plan.md**
      - **camel-execute.md**
      - **camel-verify.md**
    - **skills/**
  - **.camel-kit/**
{{< /filetree >}}

Your existing source files and build configuration remain untouched. Camel-Kit adds the AI orchestration layer alongside your current artifacts.

<!--step Run the Migration Command-->

Invoke the migration orchestrator:

```bash
/camel-migrate
```

The AI begins the migration pipeline, coordinating all subsequent steps automatically. You'll be prompted for platform-specific configuration (connector endpoints, credentials, environment mappings) during the process.

The migration command:
1. Detects the source platform and artifact types
2. Analyzes dependencies between flows
3. Conducts design interviews for each flow
4. Generates Camel routes with verification tests
5. Validates runtime behavior
6. Produces a migration report

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
- **Incremental verification** — test each flow as soon as its dependencies are migrated
- **Parallel migration** — independent flows can be migrated simultaneously
- **Impact analysis** — understand which flows are affected by changes

If circular dependencies are detected, the AI prompts you to break the cycle (see Troubleshooting below).

<!--step Design Interview-->

For each flow (in topological order), the AI conducts a design interview to extract business requirements from the existing implementation:

```
Analyzing: customer-lookup-flow

Design interview questions:
1. What triggers this flow? (HTTP request, scheduled poll, message queue, etc.)
2. What data transformations occur?
3. What external systems are called?
4. What error handling is required?
5. What are the success/failure criteria?

Generating Business Requirements Document (BRD)...
Generating Technical Design Document (TDD)...
```

**Interview artifacts:**
- **BRD** — business logic extracted from source (trigger, inputs, outputs, transformations, error cases)
- **TDD** — technical specifications for Camel route (components, EIPs, test cases)

These documents guide the next step: planning and implementation.

<!--step Plan and Execute-->

With the BRD and TDD in hand, the AI automatically invokes the planning and execution pipeline (same as greenfield development):

```
Planning migration for: customer-lookup-flow
  → /camel-plan
  → Plan created: .camel-kit/plans/customer-lookup-flow.json

Executing migration...
  → /camel-execute
  → Generated: src/main/resources/camel/customer-lookup.camel.yaml
  → Generated: src/test/java/CustomerLookupTest.java
  → Tests: 5 passed, 0 failed
```

**What happens:**
1. `/camel-plan` creates a detailed implementation plan from the TDD
2. `/camel-execute` generates Camel YAML route + unit tests
3. Unit tests validate transformation logic and error handling
4. Process repeats for each flow in topological order

Once all flows are migrated, proceed to runtime verification.

<!--step Runtime Verification-->

The final step validates the migrated integration end-to-end:

```bash
/camel-verify
```

**5-phase verification:**

1. **Environment Check** — validate JDK, Maven, dependencies
2. **Build Verification** — `mvn clean verify` (compile + unit tests)
3. **Startup Test** — launch Camel context, verify route registration
4. **Behavioral Tests** — end-to-end scenarios (HTTP calls, message flows, transformations)
5. **Migration Report** — coverage summary, delta analysis, recommendations

**Example output:**

```
Verification Report
===================
✓ 12/12 flows migrated
✓ 45/45 unit tests passing
✓ 8/8 behavioral tests passing

Delta Analysis:
  - customer-lookup-flow: response time 120ms → 85ms (29% faster)
  - order-validation-flow: error handling improved (retries added)

Recommendations:
  - Review DataWeave → JsonPath transformations (manual validation suggested)
  - Configure connector credentials for production environment
```

{{< /carousel >}}

---

## Flow-by-Flow Migration

Camel-Kit migrates one flow at a time, following the dependency order from graph analysis. This incremental approach offers several advantages over big-bang rewrites:

**Benefits:**
- **Verify each flow individually** — catch issues early before they compound
- **Deploy partial migrations** — migrate high-priority flows first, deploy incrementally
- **Roll back if needed** — if a flow fails verification, fix it before proceeding
- **Parallel development** — independent flows can be migrated by different team members

**Progress tracking:**

```
Migration progress: 8/12 flows complete

Completed:
  ✓ customer-lookup-flow
  ✓ order-validation-flow
  ✓ inventory-check-flow
  ✓ shipping-flow
  ✓ fulfillment-flow
  ✓ notification-flow
  ✓ audit-logging-flow
  ✓ error-handling-flow

In progress:
  → payment-processing-flow

Pending:
  - refund-flow
  - reconciliation-flow
  - reporting-flow
```

Each completed flow is immediately available for deployment, allowing you to deliver business value incrementally.

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

**Cause:** DataWeave scripts (MuleSoft) or BizTalk maps may use platform-specific functions that don't map directly to Camel's transformation libraries (JOLT, JsonPath, XPath).

**Resolution:**
1. Review the generated Camel transformation (the AI will provide a best-effort conversion)
2. Compare input/output examples from the original DataWeave/map
3. If needed, implement custom Java transformation logic
4. Add behavioral tests to validate the transformation

**Example:**

```yaml
# Generated Camel route (JOLT transformation)
- transform:
    jolt:
      spec: |
        {
          "operation": "shift",
          "spec": { "orderId": "id", "customer.name": "customerName" }
        }
# TODO: Verify transformation with test data
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
1. Consult the migration report for suggested Camel components
2. Review the [Camel Components documentation](https://camel.apache.org/components/latest/) for alternatives
3. If no component exists, implement a custom processor or use `camel-http` / `camel-rest` for API calls
4. Update the TDD with the chosen approach and re-run `/camel-execute`

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
5. If the issue is environmental (e.g., missing database), document in the migration report and proceed

**Debugging steps:**

```bash
# Run verification with detailed logging
/camel-verify --log-level DEBUG

# Run a single test in isolation
mvn test -Dtest=OrderValidationFlowTest

# Inspect Camel route definitions
cat src/main/resources/camel/order-validation.camel.yaml
```

{{< /carousel >}}

---

## Summary

The migration workflow automates platform conversion through six steps:

1. **Initialize** — add Camel-Kit to your existing project
2. **Detect** — discover artifacts and identify the source platform
3. **Graph** — analyze dependencies and determine migration order
4. **Design** — extract requirements from existing flows (BRD + TDD)
5. **Implement** — generate Camel routes with unit tests (`/camel-plan` + `/camel-execute`)
6. **Verify** — validate runtime behavior and produce migration report

This workflow applies across all supported platforms. For platform-specific details (artifact formats, connector mappings, known limitations), see the platform pages below.
