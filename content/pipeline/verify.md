---
title: "Runtime Verification"
weight: 4
description: "Internal runtime verification feedback loop"
---

## Overview

`camel-verify` is the internal runtime verification skill that checks whether generated integrations actually work. Through a 3-phase feedback loop with error classification and automated fixes, it ensures the application builds, passes integration tests, and handles failures gracefully.

The output is a verified, working integration ready for deployment.

## When It Runs

`/camel-execute` dispatches `camel-verify` when generated code is ready for runtime checks. It handles:

- Want to validate a generated integration works at runtime
- Encounter build failures, runtime errors, or test failures
- Want automated diagnosis and fixing of common issues

It is not exposed as a command stub. Use `/camel-debug` for ad-hoc troubleshooting outside an active pipeline run.

## The Verification Loop

The verification process runs three phases in sequence. If any phase fails, the AI classifies the error, fixes it, and retries (up to 15 attempts per phase). An environment probe runs before verification (as the first step of `camel-execute`) to catch dependency, service, and startup issues before code is generated.

{{< carousel id="verify-phases" >}}
<!--step Phase 1: Build-->
## Phase 1: Build

**Goal:** Compile the integration and resolve all Maven dependencies.

### What Happens

The AI runs the Maven build:

```bash
./mvnw clean package -DskipTests
```

**Why skip tests?** We're verifying the build compiles. Tests run in Phase 2. For JBang-based integrations, this phase is skipped entirely since JBang handles compilation on the fly.

### Verification

The AI checks the Maven exit code and output:

**Success:**
```
[INFO] BUILD SUCCESS
[INFO] Total time: 45.321 s
[INFO] Finished at: 2026-04-23T14:32:10Z

Build: PASS
```

**Failure:**
```
[ERROR] Failed to execute goal org.apache.maven.plugins:maven-compiler-plugin:3.11.0:compile

Build: FAIL
Error type: BUILD_ERROR
```

### Error Classification

**Error Type:** `BUILD_ERROR`

**Common Causes:**
- Missing dependencies in pom.xml
- Java syntax errors in generated code
- YAML syntax errors in Camel routes
- Version conflicts
- Missing Java version (requires Java 17+)

### Auto-Fixes

#### 1. Missing Dependency

```
Error: package org.apache.camel.component.kafka does not exist

Diagnosis: Missing camel-kafka dependency

Fix: Adding to pom.xml...
  <dependency>
    <groupId>org.apache.camel</groupId>
    <artifactId>camel-kafka</artifactId>
  </dependency>

Retrying build...
```

#### 2. Version Conflict

```
Error: Dependency convergence error for org.apache.camel:camel-core

Diagnosis: Multiple Camel versions detected

Fix: Enforcing version via BOM...
  <dependencyManagement>
    <dependency>
      <groupId>org.apache.camel</groupId>
      <artifactId>camel-bom</artifactId>
      <version>4.21.0</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencyManagement>

Retrying build...
```

#### 3. YAML Syntax Error

```
Error: Cannot parse route file: order-validation.camel.yaml
  Line 12: Unexpected token

Diagnosis: YAML syntax error

Fix: Invoking camel-validate skill to repair...
  (camel-validate analyzes and fixes YAML)
  
Retrying build...
```

#### 4. Java Version

```
Error: Source option 17 is no longer supported. Use 21 or later.

Diagnosis: Java version mismatch

Fix: Updating pom.xml maven.compiler properties...
  <maven.compiler.source>21</maven.compiler.source>
  <maven.compiler.target>21</maven.compiler.target>

Retrying build...
```

### Retry Strategy

The AI retries the build up to 15 times, applying different fixes based on error patterns.

**Retry Loop:**
```
Build attempt 1: FAIL (missing dependency)
  → Fix: Add camel-kafka dependency
Build attempt 2: FAIL (version conflict)
  → Fix: Add BOM dependency management
Build attempt 3: PASS

Build phase complete (3 attempts)
```

<!--step Phase 2: Test Verification-->
## Phase 2: Test Verification

**Goal:** Execute Citrus YAML integration tests to verify the integration builds, starts, and behaves correctly.

### What Happens

The AI runs Citrus integration tests using the Camel JBang test plugin:

```bash
camel test run *.it.yaml
```

These tests are self-contained: Testcontainers automatically start external services (databases, message brokers), `camel:jbang:run` starts the application, and send/receive actions validate behavior. There is no need for a separate startup or environment setup phase.

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
Error type: TEST_ERROR
```

### Error Classification

**Error Type:** `TEST_ERROR`

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

Diagnosis: Persistent failure across multiple fix attempts —
  the TDD plan itself needs modification

Fix: Triggering re-plan to modify the TDD structure...
  (Automatically adjusts the task decomposition and test expectations)
  
Retrying from Phase 1...
```

### Fix Routing

Based on error classification, the AI routes fixes to the appropriate target:

- **Route logic errors** → `camel-implement` (regenerate route)
- **Test code errors** → `camel-test` (test re-generation)
- **Persistent architectural failures** → `re-plan` (automatic TDD modification)
- **Configuration errors** → Update `application.properties`
- **Unrecoverable errors** → `escalate` (report to user)

<!--step Phase 3: Report Generation-->
## Phase 3: Report Generation

**Goal:** Summarize verification results and provide actionable insights.

### What Happens

After all phases pass (or max retries are exhausted), the subagent returns a structured verification report to `/camel-execute` and appends the iteration to `.camel-kit/verify-log.md`.

### Success Report

**Returned to the execute orchestrator:**
```markdown
# Verification Report: Order Processing Integration

**Status:** ✓ SUCCESS

## Summary

- Build: ✓ PASS (2 attempts)
- Test Verification: ✓ PASS (1 attempt)

## Build

- Maven version: 3.9.5
- Java version: 21.0.2
- Camel version: 4.21.0
- Build time: 45.3s

## Tests

- Total tests: 4
- Passed: 4
- Failed: 0
- Coverage: 100% of acceptance criteria
- Services managed by: Testcontainers

### Test Details

1. **testValidOrderProcessing** - ✓ PASS
   - Verified: REST endpoint, validation, credit lookup, Kafka publish
   - Latency: 1.2s (under 2s requirement)

2. **testInvalidOrderHandling** - ✓ PASS
   - Verified: Validation failure routing to orders.invalid topic
   
3. **testDatabaseFailureRetry** - ✓ PASS
   - Verified: 3 retries with exponential backoff
   
4. **testKafkaPublish** - ✓ PASS
   - Verified: Message delivery to warehouse.orders topic

## Metrics

- orders.received.total: 12
- orders.valid.total: 10
- orders.invalid.total: 2
- database.lookup.time: avg 145ms
- kafka.publish.time: avg 23ms

## Next Steps

Integration is ready for deployment.

Consider:
1. Running load tests with 500 orders/minute
2. Setting up production database and Kafka cluster
3. Configuring alerting for error thresholds
4. Deploying to staging environment
```

### Failure Report

If verification fails after 15 retries per phase:

```markdown
# Verification Report: Order Processing Integration

**Status:** ✗ FAILED

## Summary

- Build: ✓ PASS (2 attempts)
- Test Verification: ✗ FAIL (15 attempts)

## Error Details

**Phase:** Test Verification
**Error Type:** TEST_ERROR
**Error Message:** testInvalidOrderHandling — route logic does not match acceptance criteria

**Attempted Fixes:**
1. Regenerated route via camel-implement (attempt 1)
2. Regenerated test via camel-test (attempt 5)
3. Triggered re-plan for TDD modification (attempt 10)
...

**Root Cause:**
Acceptance criterion conflicts with the actual data model — the test expects
a field that does not exist in the source schema.

**Manual Fix Required:**

Review the Design Specification acceptance criteria and update the
data model or test expectations accordingly.

After applying the manual fix, resume execution so runtime verification is dispatched again:
```
/camel-execute
```

## Partial Results

- Build: Successful
- Tests: 3/4 passing, 1 failing

## Recommendations

1. Review the acceptance criteria for order validation
2. Verify the source schema includes all expected fields
3. Resume `/camel-execute` to regenerate and verify tests after schema updates
```
{{< /carousel >}}

## Error Classification System

The AI classifies every error into one of four categories and routes fixes to the appropriate target:

### 1. BUILD_ERROR

**Indicators:**
- Maven compilation errors
- Missing dependencies
- YAML syntax errors
- Java source errors

**Fix Strategy:**
- Add missing dependencies to pom.xml
- Repair YAML with `camel-validate` skill
- Update Java code (rare for generated code)
- Resolve version conflicts with BOM

**Routed To:** Build system, dependency manager, `camel-validate` skill

### 2. RUNTIME_ERROR

**Indicators:**
- Application fails to start (detected by Citrus test runner)
- Connection refused errors
- Port conflicts
- Configuration errors

**Fix Strategy:**
- Update configuration properties
- Fix route startup issues
- Change ports
- Verify Testcontainers service configuration

**Routed To:** `camel-implement` skill (route fixes), configuration manager

### 3. TEST_ERROR

**Indicators:**
- Test failures
- Assertion errors
- Timeouts in tests
- Testcontainers startup failures

**Fix Strategy:**
- Regenerate routes if logic wrong (`camel-implement`)
- Regenerate tests if assumptions wrong (`camel-test`)
- Modify the TDD plan for persistent architectural failures (`re-plan`)
- Increase timeouts
- Fix Testcontainers configuration

**Routed To:** `camel-implement` (route logic), `camel-test` (test re-generation), `re-plan` (TDD modification)

### 4. ENVIRONMENT_ERROR

**Indicators:**
- Docker not running (required for Testcontainers)
- Testcontainers unable to start services
- Port conflicts
- Image pull errors

**Fix Strategy:**
- Start Docker daemon (required for Testcontainers)
- Fix Testcontainers service configuration
- Change conflicting ports
- Pull missing images

**Routed To:** Environment manager, Testcontainers configuration

## Retry Budget

Each phase has a retry budget of 15 attempts.

**Retry Strategy:**
```
Attempt 1: Try original approach
Attempt 2: Apply simple fix (restart service)
Attempt 3: Apply configuration fix
Attempt 4: Apply code fix
Attempt 5: Apply environment fix
...
Attempt 15: Last attempt
  → If still failing, give up and report
```

**Exponential Backoff:**

Between retries, the AI waits:
- Attempts 1-3: 5 seconds
- Attempts 4-7: 10 seconds
- Attempts 8-12: 30 seconds
- Attempts 13-15: 60 seconds

This gives external services time to recover.

## Pipeline Re-entry

Resume `/camel-execute` after an approved manual correction so it can dispatch runtime verification again. If a previously working route breaks outside the pipeline, use `/camel-debug`; it preserves local state, diagnoses the root cause, applies a targeted fix, and recommends a recurrence guard.

## Environment-in-the-Loop Concept

`camel-verify` is "environment-in-the-loop" verification: it doesn't just check code, it actually runs the integration with real databases, message brokers, and HTTP endpoints via Testcontainers.

**Why This Matters:**

- **Catches real issues:** Code might compile but fail at runtime
- **Validates integrations:** Endpoints actually connect, messages actually flow
- **Tests behavior:** Not just unit tests, but full integration tests with real services
- **Prevents surprises:** Find issues now, not in production
- **Self-contained:** Testcontainers manage the service lifecycle -- no manual Docker Compose setup needed

**Contrast with traditional testing:**
- Unit tests: Mock everything (no environment)
- Integration tests: Run against real services managed by Testcontainers (environment-in-the-loop)

Camel-Kit uses Citrus YAML integration tests with Testcontainers for verification because integrations are, by definition, about connecting systems. Docker Compose files are still generated as user artifacts for local development, but they are not used during the verification loop.

## Graceful Degradation

If tools are unavailable, the AI adapts:

### No Docker

```
Warning: Docker not available.

Skipping test verification phase (Testcontainers requires Docker).

Note: Without Docker, integration tests cannot start external services.
Consider running on a system with Docker installed.

Proceeding to report phase with partial results...
```

### No Maven Wrapper

```
Warning: ./mvnw not found. Skipping build verification phase.

Proceeding to test verification...
```

### No Camel Test CLI

```
Warning: camel test command not available.

Skipping test verification phase.

Note: Without the Camel JBang test plugin, we cannot run integration tests.
Consider installing Camel JBang: https://camel.apache.org/manual/camel-jbang.html
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

`camel-verify` validates integrations through a 3-phase feedback loop:

1. **Build** - Compile and resolve dependencies (skipped for JBang)
2. **Test Verification** - Run Citrus YAML tests via `camel test run` with Testcontainers
3. **Report Generation** - Summarize results and provide insights

**Key Features:**
- **Error Classification** - BUILD, RUNTIME, TEST, ENVIRONMENT errors
- **Auto-Fixes** - 15 retry attempts with intelligent fixes
- **Fix Routing** - Errors routed to `camel-implement`, `camel-test`, `re-plan`, or escalated to user
- **Environment-in-the-Loop** - Testcontainers manage real databases and brokers
- **Graceful Degradation** - Works even when tools unavailable
- **Internal Dispatch** - Runs within `/camel-execute`; `/camel-debug` handles ad-hoc failures

The result is confidence that your integration actually works, not just compiles.

After runtime verification passes, the pipeline continues from Execute to `/camel-validate`.
