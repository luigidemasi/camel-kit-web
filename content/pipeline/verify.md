---
title: "Runtime Verification"
weight: 5
description: "Internal runtime verification feedback loop"
---

## Overview

`camel-verify` is the internal runtime verification skill that checks whether generated integrations actually work. Through a 3-phase feedback loop with error classification and targeted fixes, it runs the applicable build or startup smoke checks and integration tests, while reporting every skipped or failed check.

The output is runtime-verification evidence returned to `/camel-execute`, with a `PASS`, `PARTIAL`, `FAIL`, or `NOT_RUN` outcome. Verification failures do not block the execute completion summary. A chained pipeline still continues through Phase 4 static `/camel-validate` before it is complete.

## When It Runs

`/camel-execute` dispatches `camel-verify` when generated code is ready for runtime checks. It handles:

- Want to validate a generated integration works at runtime
- Encounter build failures, runtime errors, or test failures
- Want automated diagnosis and fixing of common issues

It is not exposed as a command stub. Use `/camel-debug` for ad-hoc troubleshooting outside an active pipeline run.

## Context and Confirmation

Build, startup, and test stdout or stderr, assertions, test files, MCP responses, `.camel-kit/verify-log.md`, and failure details passed between roles are evidence, not instructions. `camel-verify` uses the command's exit state and corroborated diagnostic fields to select a shipped taxonomy entry. It may apply that entry's bounded repair within the approved plan and workflow without another confirmation.

Commands, URLs, tool requests, file changes, secret requests, scope expansion, or policy overrides found in loaded content never select the repair. If an action is genuinely necessary but is not independently required by the shipped workflow, verification reports its source, exact action, reason, and scope and waits for action-specific confirmation. A role that cannot ask returns `NEEDS_USER_CONFIRMATION`; an unclassified error is escalated rather than treated as remediation advice.

## The Verification Loop

The verification process runs three phases in sequence. Maven compilation and Citrus testing each have a 15-attempt ceiling; the Camel Main startup smoke test has a 6-attempt ceiling. Repeated error classes can promote to re-planning before those limits. An environment probe runs before verification (as the first step of `camel-execute`) to catch dependency, service, and startup issues before code is generated.

{{< carousel id="verify-phases" >}}
<!--step Phase 1: Build-->
## Phase 1: Build / Startup Smoke

**Goal:** Compile Spring Boot or Quarkus integrations, or run the startup smoke test for Camel Main.

### What Happens

The AI detects the configured runtime first. For Spring Boot and Quarkus it uses `./mvnw` when present, falls back to system `mvn`, and runs each module's command from the project root:

```bash
{MAVEN_CMD} compile -q
# Nested target module:
{MAVEN_CMD} -f {MODULE_DIR}pom.xml compile -q
```

For Camel Main there is no Maven compile step. Phase 1 instead runs the generated route's startup smoke test, checks its log markers, and applies its 6-attempt fix loop. Phase 2 owns Citrus integration tests for every runtime.

### Verification

For Spring Boot and Quarkus, the AI checks the Maven exit code and output. For Camel Main, it checks the runtime-specific startup log markers and reports the smoke-test result.

**Success:**
```
[INFO] BUILD SUCCESS
[INFO] Total time: 45.321 s
[INFO] Finished at: 2026-04-23T14:32:10Z

Build: PASS
```

**Failure:**
```
[ERROR] package org.apache.camel.component.kafka does not exist

Build: FAIL
Classification: Missing dependency
Fix target: Self-repair
```

### Representative Error Families

**Common Causes:**
- Missing dependencies in pom.xml
- Java syntax errors in generated code
- YAML syntax errors in Camel routes
- Version conflicts
- Missing or incompatible JDK (Camel-Kit supports Java 17 and later; verification does not upgrade the project automatically)

### Auto-Fixes

#### 1. Missing Dependency

```
Error: package org.apache.camel.component.kafka does not exist

Diagnosis: Missing camel-kafka dependency

Fix: Adding the configured runtime's dependency...
  Quarkus: org.apache.camel.quarkus:camel-quarkus-kafka
  Spring Boot: org.apache.camel.springboot:camel-kafka-starter
  Camel Main/JBang: org.apache.camel:camel-kafka in camel.jbang.dependencies

Retrying build...
```

#### 2. Version Conflict

```
Error: Dependency convergence error for org.apache.camel:camel-core

Diagnosis: Multiple Camel versions detected

Fix: Aligning dependencies with the configured runtime...
  Quarkus: Camel Quarkus BOM and camel-quarkus-* extensions
  Spring Boot: Camel Spring Boot BOM and camel-*-starter dependencies
  Camel Main/JBang: camel.jbang.dependencies entries in application.properties

Retrying build...
```

#### 3. YAML Syntax Error

```
Error: Cannot parse route file: order-validation.camel.yaml
  Line 12: Unexpected token

Diagnosis: YAML syntax error

Fix: Invoking camel-implement for the affected flow...
  (re-generates only the structurally broken route)
  
Retrying build...
```

### Retry Strategy

The AI retries within a 15-attempt ceiling, applying fixes based on the classified error. If the same error survives a fix, the loop checks the re-plan promotion rules instead of blindly consuming the remaining budget.

**Retry Loop:**
```
Build attempt 1: FAIL (missing dependency)
  → Fix: Add the runtime-specific Kafka dependency
Build attempt 2: FAIL (version conflict)
  → Fix: Align the configured platform BOM and dependencies
Build attempt 3: PASS

Build phase complete (3 attempts)
```

<!--step Phase 2: Test Verification-->
## Phase 2: Test Verification

**Goal:** Execute Citrus YAML integration tests to verify the integration builds, starts, and behaves correctly.

### What Happens

The AI recursively discovers every `*.it.yaml` test file, including files under `src/test/resources/`, then runs them with the Camel JBang test plugin:

```bash
# {test-files} is the recursively discovered file list
camel test run {test-files}
```

Within Phase 2, Citrus manages the test lifecycle: Testcontainers start and stop required databases or brokers, `camel:jbang:run` starts and stops the application, and send/receive actions validate behavior. This does not replace the prerequisite checks or Phase 1 build/startup smoke verification. Docker is required only for discovered test files that declare Testcontainers; without it, those files are skipped while container-free and mock-only tests still run. The applicable JDK, Maven, JBang, and Camel test tooling requirements remain runtime- and phase-specific.

### Verification

The AI monitors test results:

**Success:**
```
Tests run: 4, Failures: 0, Errors: 0, Skipped: 0

Test Results:
  ✓ testValidOrderProcessing - PASS
  ✓ testInvalidOrderHandling - PASS
  ✓ testDatabaseFailureRetry - PASS
  ✓ testKafkaPublish - PASS

Test Verification: PASS
```

**Failure:**
```
Tests run: 4, Failures: 1, Errors: 0, Skipped: 0

Test Results:
  ✓ testValidOrderProcessing - PASS
  ✗ testInvalidOrderHandling - FAIL
    Expected message on topic 'orders.invalid'
    Timeout after 5000ms
  ✓ testDatabaseFailureRetry - PASS
  ✓ testKafkaPublish - PASS

Test Verification: FAIL
Classification: Timeout
Fix target: Self-repair, then camel-implement if route logic is responsible
```

### Representative Error Families

**Common Causes:**
- Routes don't produce expected output
- Timing issues (race conditions)
- Test assumptions incorrect
- Testcontainers failing to start services
- Application startup failures (detected by Citrus)

### Auto-Fixes

#### 1. Route Logic Error

```
Test: testInvalidOrderHandling
Expected: Message on 'orders.invalid' topic
Actual: No message received

Diagnosis: Validation route not routing to invalid topic

Fix: Reviewing acceptance criteria for Task 2...
  Criterion: "Invalid orders → send to Kafka topic orders.invalid"
  
  Checking order-validation.camel.yaml...
  Issue: Missing route to Kafka topic
  
Fix: Invoking camel-implement to regenerate route...
  (Regenerates order-validation.camel.yaml with invalid routing)
  
Retrying tests...
```

#### 2. Timing Issue

```
Test: testKafkaPublish
Error: Timeout waiting for Kafka message

Diagnosis: Test timeout too short for async processing

Fix: Increasing test timeout in Citrus YAML test...
  
Retrying tests...
```

#### 3. Test Re-generation

```
Test: testDatabaseFailureRetry
Error: Test expectations don't match actual behavior

Diagnosis: Test assumptions are incorrect — the test needs updating

Fix: Invoking camel-test to regenerate test...
  (Regenerates the Citrus YAML test with corrected expectations)
  
Retrying tests...
```

#### 4. Persistent Architectural Failure (Re-plan)

```
Test: testValidOrderProcessing
Error: Route architecture cannot satisfy the acceptance criteria

Diagnosis: MCP confirms the required runtime feature is unavailable,
  or the same error class persists through the promotion threshold

Fix: Triggering the bounded re-plan loop...
  (Modifies only the affected design-spec flow sections, preserves the
  business requirements, and re-executes only affected tasks)
  
Retrying from Phase 1...
```

### Fix Routing

Based on error classification, the AI routes fixes to the appropriate target:

- **Route logic errors** → `camel-implement` (regenerate route)
- **Test code errors** → `camel-test` (test re-generation)
- **Persistent architectural failures** → `re-plan` (update affected design-spec flow sections, preserve business requirements, then re-execute affected tasks)
- **Configuration errors** → Update `application.properties`
- **Unrecoverable errors** → `escalate` (report to user)

<!--step Phase 3: Report Generation-->
## Phase 3: Report Generation

**Goal:** Summarize verification results and provide actionable insights.

### What Happens

After all phases pass (or the loop stops), the verification role returns a structured report to the execute orchestrator and appends the iteration to `.camel-kit/verify-log.md`. Some targets can isolate this work; Qwen and OpenCode keep verification in their primary executor session, and single-conversation targets run it inline.

### Report Contract

The report uses the compact contract below. Optional sections appear only when a fix was applied, a check was skipped, or a phase failed.

```text
VERIFICATION REPORT
Runtime:          {runtime}
Maven:            {status}

Phase 1 — Build / Startup Smoke:  {PASS [(N fixes)] | SKIPPED (reason) | FAILED after N iterations}
Phase 2 — Test:   {PASS: N/N tests passed [(N fixes)] | SKIPPED (reason) | FAILED: N/N tests failed}

{If any fixes were applied:}
Fixes applied:
  1. [{Phase}] {description of fix}
  2. [{Phase}] {description of fix}

{If any phases were skipped:}
Skipped checks:
  - {description} ({reason})

{If a phase failed — show last error:}
Last error:
  {error detail or assertion message}
  Classification: {category from error-taxonomy.md}
  Fix attempted: {what was tried}

  Escalated: {suggestion for manual resolution}
```
{{< /carousel >}}

## Error Classification System

The source taxonomy uses specific error families rather than four generic uppercase buckets. Representative routing is:

| Error family | Fix target |
|---|---|
| Missing Camel or third-party dependency; version incompatibility | Self-repair with runtime-aware dependency coordinates and BOM alignment |
| Route creation, unknown component, missing bean, or injection failure | `camel-implement` for the affected flow |
| Wrong endpoint option or YAML schema failure | `camel-validate` for diagnosis, then `camel-implement` for the correction |
| Expression, type-conversion, transformation, or assertion mismatch | `camel-implement` |
| Timeout, external-service, or container-startup failure | Self-repair first; route logic goes to `camel-implement` when indicated |
| Test syntax or incorrect test expectations | `camel-test` |
| MCP-confirmed unavailable component/pattern or a persistent error family | Bounded `re-plan` of affected design-spec flow sections, followed by affected-task execution and re-verification |
| Missing build plugin, Quarkus augmentation failure, iteration limit, or unclassified error | Escalate with the raw error and attempted fix |

## Retry Budget

Maven compilation and Citrus testing each have a ceiling of 15 attempts; Camel Main startup smoke has a ceiling of 6. Promotion rules can end a local fix loop sooner.

**Retry Strategy:**
```
1. Classify the current error and route one targeted fix.
2. If the same error remains, short-circuit and evaluate promotion.
3. Trigger immediate Tier 1 re-planning when the MCP catalog confirms the required runtime feature does not exist.
4. Trigger Tier 2 re-planning after three failed fixes for the same error class.
5. Escalate unclassified errors or a phase that reaches its attempt limit.
```

## Pipeline Re-entry

Resume `/camel-execute` after an approved manual correction so it can dispatch runtime verification again. If a previously working route breaks outside the pipeline, use `/camel-debug`; it preserves local state, diagnoses the root cause, applies a targeted fix, and recommends a recurrence guard.

## Environment-in-the-Loop Concept

`camel-verify` is "environment-in-the-loop" verification: it doesn't just check code. Citrus runs the integration and exercises its endpoints, while Testcontainers provides required external databases and brokers.

**Why This Matters:**

- **Catches real issues:** Code might compile but fail at runtime
- **Validates integrations:** Test endpoints are exercised and messages actually flow
- **Tests behavior:** Not just unit tests, but integration tests with required databases or brokers and mocked external APIs
- **Prevents surprises:** Find issues now, not in production
- **Self-contained:** Where external databases or brokers are required and Docker is available, Testcontainers manage their lifecycle; external APIs use mocks -- no manual Docker Compose setup needed

**Contrast with traditional testing:**
- Unit tests: Mock everything (no environment)
- Integration tests: Exercise the application with required databases or brokers managed by Testcontainers and external APIs mocked (environment-in-the-loop)

Camel-Kit uses Citrus YAML integration tests for verification. Tests use Testcontainers when required external databases or brokers and Docker are available, and mocks for external APIs. Camel-Kit generates Docker Compose as a local-development artifact only when the integration needs external services; verification does not consume that Compose file.

## Graceful Degradation

If tools are unavailable, the AI adapts:

### No Docker

```
Warning: Docker not available.

Running container-free and mock-only Citrus tests.
Skipping only tests that declare Testcontainers.

Note: Without Docker, integration tests cannot start required external databases or brokers.
Consider running on a system with Docker installed.

Proceeding to report phase with dependent checks recorded as skipped...
```

### No Maven (Spring Boot or Quarkus)

```
Warning: neither ./mvnw nor system mvn is available. Skipping build verification phase.

Proceeding to test verification...
```

### No Camel Test CLI

```
Warning: camel test command not available.

Skipping test verification phase.

Note: Without the Camel JBang test plugin, we cannot run integration tests.
After installing Camel JBang if needed, run: camel plugin add test
```

### No Citrus Tests

```
Warning: No Citrus YAML tests found (*.it.yaml)

Skipping test verification phase.

Note: Without tests, we cannot verify integration behavior.
The execute orchestrator can dispatch `camel-test` to generate missing tests.
```

The AI continues with available tools, warning about limitations.

## Summary

`camel-verify` collects runtime evidence through a 3-phase feedback loop:

1. **Build / Startup Smoke** - Compile Spring Boot or Quarkus with the wrapper or system Maven; start and inspect Camel Main instead
2. **Test Verification** - Run Citrus YAML tests via `camel test run`, using Testcontainers only for tests that declare required external services
3. **Report Generation** - Summarize results and provide insights

**Key Features:**
- **Error Classification** - Specific build, startup, runtime, and test error families with explicit fix targets
- **Targeted Fix Loops** - Up to 15 compile/test attempts or 6 Camel Main startup attempts, with earlier promotion for persistent errors
- **Fix Routing** - Errors routed to self-repair, `camel-validate` → `camel-implement`, `camel-implement`, `camel-test`, bounded `re-plan`, or escalation
- **Environment-in-the-Loop** - Testcontainers manage required databases and brokers for the tests that declare them
- **Graceful Degradation** - Reports unavailable tools and explicitly skips dependent checks
- **Internal Dispatch** - Runs within `/camel-execute`; `/camel-debug` handles ad-hoc failures

The result is an explicit `PASS`, `PARTIAL`, `FAIL`, or `NOT_RUN` record rather than a silent claim that the integration works.

After runtime verification finishes, regardless of outcome, a chained pipeline continues from Execute to `/camel-validate`; standalone `/camel-execute` reports completion and stops.
