---
title: "Runtime Verification"
weight: 4
description: "/camel-verify — Runtime verification feedback loop"
---

## Overview

`/camel-verify` is the runtime verification orchestrator that validates generated integrations actually work. Through a 5-phase feedback loop with error classification and automated fixes, the AI ensures your integration builds, starts, passes behavioral tests, and handles failures gracefully.

The output is a verified, working integration ready for deployment.

## When to Use

Invoke `/camel-verify` when you:

- Want to validate a generated integration works at runtime
- Encounter build failures, runtime errors, or test failures
- Need to troubleshoot an existing integration
- Want automated diagnosis and fixing of common issues

**Auto-invocation:** After `/camel-execute` completes, the AI automatically invokes `/camel-verify`. You can also invoke it standalone for troubleshooting.

## The Five-Phase Loop

The verification process runs five phases in sequence. If any phase fails, the AI classifies the error, fixes it, and retries (up to 15 attempts per phase).

{{< carousel id="verify-phases" >}}
<!--step Phase 1: Environment Setup-->
## Phase 1: Environment Setup

**Goal:** Ensure all external dependencies (databases, message brokers, etc.) are running and accessible.

### What Happens

The AI analyzes the Design Specification (Section 3: Systems and Endpoints) and `docker-compose.yaml` to identify required services.

**Example Discovery:**
```
Design Specification requires:
- PostgreSQL database
- Kafka broker
- SMTP server (for error alerts)

Found docker-compose.yaml with services:
- postgres
- kafka
- zookeeper

Starting Docker Compose environment...
```

The AI runs:
```bash
docker-compose up -d
```

### Verification

After starting services, the AI verifies they're ready:

**PostgreSQL:**
```bash
docker exec postgres pg_isready -U orderuser
```

**Kafka:**
```bash
docker exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092
```

**Wait Loop:**

If a service isn't ready, the AI waits and retries:
```
PostgreSQL not ready (attempt 1/15)...
Waiting 5 seconds...

PostgreSQL not ready (attempt 2/15)...
Waiting 5 seconds...

PostgreSQL ready!
```

### Error Classification

If environment setup fails:

**Error Type:** `ENVIRONMENT_ERROR`

**Common Causes:**
- Docker not running
- Port conflicts (5432, 9092 already in use)
- Missing Docker images
- docker-compose.yaml syntax errors

**Auto-Fixes:**

1. **Docker not running:**
```
Error: Cannot connect to Docker daemon

Fix: Starting Docker daemon...
  sudo systemctl start docker
```

2. **Port conflict:**
```
Error: Port 5432 already in use

Fix: Updating docker-compose.yaml to use port 5433...
  ports:
    - "5433:5432"
    
Fix: Updating application.properties...
  spring.datasource.url=jdbc:postgresql://localhost:5433/orders
```

3. **Missing image:**
```
Error: Image postgres:15 not found

Fix: Pulling image...
  docker pull postgres:15
```

### Graceful Degradation

If Docker is unavailable and auto-fix fails:

```
Warning: Docker is not available on this system.

Skipping environment setup phase.

Note: Integration tests that require external services will fail.
Consider running on a system with Docker installed, or manually
start required services (PostgreSQL on port 5432, Kafka on 9092).

Proceeding to build phase...
```

The AI continues but warns that tests will likely fail.

<!--step Phase 2: Build-->
## Phase 2: Build

**Goal:** Compile the integration and resolve all Maven dependencies.

### What Happens

The AI runs the Maven build:

```bash
./mvnw clean package -DskipTests
```

**Why skip tests?** We're verifying the build compiles. Tests run in Phase 4.

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
      <version>4.14.0</version>
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

<!--step Phase 3: Start Integration-->
## Phase 3: Start Integration

**Goal:** Launch the Camel application and verify all routes start successfully.

### What Happens

The AI starts the integration in the background:

```bash
./mvnw camel:run &
```

**Alternative:** If using Spring Boot:
```bash
./mvnw spring-boot:run &
```

### Verification

The AI monitors the startup logs for route status:

**Success Pattern:**
```
[main] INFO  org.apache.camel.main.MainSupport - Apache Camel 4.14.4 (camel-1) started in 2s142ms
[main] INFO  org.apache.camel.impl.engine.AbstractCamelContext - Route: order-reception-rest started
[main] INFO  org.apache.camel.impl.engine.AbstractCamelContext - Route: order-validation started
[main] INFO  org.apache.camel.impl.engine.AbstractCamelContext - Route: customer-credit-lookup started
[main] INFO  org.apache.camel.impl.engine.AbstractCamelContext - Route: routing-decision started
[main] INFO  org.apache.camel.impl.engine.AbstractCamelContext - Total 8 routes, of which 8 are started

Start: PASS
```

**Failure Pattern:**
```
[main] ERROR org.apache.camel.impl.engine.AbstractCamelContext - Failed to start route: customer-credit-lookup
java.sql.SQLException: Connection refused to postgresql://localhost:5432/orders

Start: FAIL
Error type: RUNTIME_ERROR
```

### Error Classification

**Error Type:** `RUNTIME_ERROR`

**Common Causes:**
- Database connection failures
- Kafka broker unreachable
- Port conflicts (REST endpoint port already in use)
- Missing configuration values
- Component initialization failures

### Auto-Fixes

#### 1. Database Connection Failure

```
Error: Connection refused to postgresql://localhost:5432/orders

Diagnosis: PostgreSQL not accessible

Fix: Checking environment phase...
  PostgreSQL container status: running
  PostgreSQL port: 5432 → accessible
  
Issue: Database 'orders' doesn't exist

Fix: Creating database...
  docker exec postgres psql -U orderuser -c "CREATE DATABASE orders;"
  
Retrying start...
```

#### 2. Kafka Broker Unreachable

```
Error: Failed to connect to Kafka broker at localhost:9092

Diagnosis: Kafka not accessible

Fix: Restarting Kafka container...
  docker-compose restart kafka
  
Waiting for Kafka to be ready...
Kafka ready.

Retrying start...
```

#### 3. Port Conflict

```
Error: Address already in use: bind on port 8080

Diagnosis: REST endpoint port conflict

Fix: Updating application.properties...
  rest.port=8081
  
Retrying start...
```

#### 4. Missing Configuration

```
Error: Property '${kafka.brokers}' not found

Diagnosis: Missing required configuration property

Fix: Adding to application.properties...
  kafka.brokers=localhost:9092
  
Retrying start...
```

### Health Check

After routes start, the AI verifies health endpoints:

```bash
curl http://localhost:8080/actuator/health
```

**Expected:**
```json
{
  "status": "UP",
  "components": {
    "camel": {
      "status": "UP",
      "details": {
        "contextStatus": "Started",
        "routes": 8
      }
    }
  }
}
```

<!--step Phase 4: Behavioral Testing-->
## Phase 4: Behavioral Testing

**Goal:** Execute Citrus integration tests to verify the integration behaves correctly.

### What Happens

The AI runs the Citrus test suite:

```bash
./mvnw test -Dtest=OrderProcessingIT
```

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

Behavioral Testing: PASS
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

Behavioral Testing: FAIL
Error type: TEST_ERROR
```

### Error Classification

**Error Type:** `TEST_ERROR`

**Common Causes:**
- Routes don't produce expected output
- Timing issues (race conditions)
- Test assumptions incorrect
- Missing test data setup

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
  
Rebuilding and restarting...
Retrying tests...
```

#### 2. Timing Issue

```
Test: testKafkaPublish
Error: Timeout waiting for Kafka message

Diagnosis: Test timeout too short for async processing

Fix: Increasing test timeout...
  @CitrusTest(timeout = 10000) // was 5000
  
Retrying tests...
```

#### 3. Missing Test Data

```
Test: testDatabaseFailureRetry
Error: Customer CUST-67890 not found in database

Diagnosis: Test database not initialized

Fix: Adding test data setup...
  @BeforeAll
  void setupTestData() {
    jdbcTemplate.execute(
      "INSERT INTO customers (id, credit_status, warehouse_location) " +
      "VALUES ('CUST-67890', 'ACTIVE', 'WH-EAST')"
    );
  }
  
Retrying tests...
```

### Fix Routing

Based on error classification, the AI routes fixes to the appropriate skill:

- **Route logic errors** → `camel-implement` (regenerate route)
- **Test code errors** → `camel-test` (fix test)
- **Configuration errors** → Update `application.properties`
- **Environment errors** → Restart services

<!--step Phase 5: Report Generation-->
## Phase 5: Report Generation

**Goal:** Summarize verification results and provide actionable insights.

### What Happens

After all phases pass (or max retries exhausted), the AI generates a verification report.

### Success Report

**`.camel-kit/verification-report.md`:**
```markdown
# Verification Report: Order Processing Integration

**Status:** ✓ SUCCESS

## Summary

- Environment Setup: ✓ PASS (1 attempt)
- Build: ✓ PASS (2 attempts)
- Start Integration: ✓ PASS (1 attempt)
- Behavioral Testing: ✓ PASS (1 attempt)

## Environment

- PostgreSQL: Running on port 5432
- Kafka: Running on port 9092
- Zookeeper: Running on port 2181

## Build

- Maven version: 3.9.5
- Java version: 21.0.2
- Camel version: 4.14.0
- Build time: 45.3s

## Runtime

- Routes started: 8/8
- Startup time: 2.1s
- Health status: UP

## Tests

- Total tests: 4
- Passed: 4
- Failed: 0
- Coverage: 100% of acceptance criteria

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

- Environment Setup: ✓ PASS (1 attempt)
- Build: ✓ PASS (2 attempts)
- Start Integration: ✗ FAIL (15 attempts)

## Error Details

**Phase:** Start Integration
**Error Type:** RUNTIME_ERROR
**Error Message:** Connection refused to postgresql://localhost:5432/orders

**Attempted Fixes:**
1. Restarted PostgreSQL container (attempt 1)
2. Recreated database (attempt 3)
3. Updated connection URL (attempt 5)
4. Checked network connectivity (attempt 7)
...

**Root Cause:**
PostgreSQL container fails to start due to volume mount permission error.

**Manual Fix Required:**

```bash
# Fix volume permissions
sudo chown -R 999:999 ./postgres-data

# Restart Docker Compose
docker-compose down
docker-compose up -d
```

After applying the manual fix, run:
```
/camel-verify
```

## Partial Results

- Build: Successful
- Environment: PostgreSQL issue, Kafka running
- Tests: Not executed (integration didn't start)

## Recommendations

1. Fix PostgreSQL volume permissions (see above)
2. Consider using named volumes instead of bind mounts
3. Add health checks to docker-compose.yaml
```
{{< /carousel >}}

## Error Classification System

The AI classifies every error into one of four categories:

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
- Routes fail to start
- Connection refused errors
- Port conflicts
- Configuration errors

**Fix Strategy:**
- Restart services
- Update configuration properties
- Change ports
- Create missing resources (databases, topics)

**Routed To:** `camel-implement` skill (route fixes), configuration manager

### 3. TEST_ERROR

**Indicators:**
- Test failures
- Assertion errors
- Timeouts in tests
- Missing test data

**Fix Strategy:**
- Regenerate routes if logic wrong
- Fix test code if assumptions wrong
- Increase timeouts
- Add test data setup

**Routed To:** `camel-implement` (route logic), `camel-test` (test code)

### 4. ENVIRONMENT_ERROR

**Indicators:**
- Docker not running
- Container failures
- Port conflicts
- Image pull errors

**Fix Strategy:**
- Start Docker daemon
- Pull missing images
- Restart containers
- Change conflicting ports

**Routed To:** Docker/environment manager

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

## Standalone Invocation

You can invoke `/camel-verify` standalone for troubleshooting:

### Use Case 1: After Manual Code Changes

```
(You manually edit a route)

/camel-verify

→ Runs full 5-phase verification
→ Reports if your changes broke anything
```

### Use Case 2: Environment Issues

```
You: My integration used to work but now fails to start

/camel-verify

→ Phase 1: Checks environment (finds PostgreSQL container stopped)
→ Fix: Restarts PostgreSQL
→ Phases 2-5: Verify everything works again
```

### Use Case 3: New Test Scenarios

```
(You add a new Citrus test)

/camel-verify --phase=4

→ Skips phases 1-3 (already verified)
→ Runs only Phase 4 (Behavioral Testing)
→ Reports test results
```

## Environment-in-the-Loop Concept

`/camel-verify` is "environment-in-the-loop" verification: it doesn't just check code, it actually runs the integration with real databases, message brokers, and HTTP endpoints.

**Why This Matters:**

- **Catches real issues:** Code might compile but fail at runtime
- **Validates integrations:** Endpoints actually connect, messages actually flow
- **Tests behavior:** Not just unit tests, but full integration tests
- **Prevents surprises:** Find issues now, not in production

**Contrast with traditional testing:**
- Unit tests: Mock everything (no environment)
- Integration tests: Run against real services (environment-in-the-loop)

Camel-Kit uses integration tests for verification because integrations are, by definition, about connecting systems.

## Graceful Degradation

If tools are unavailable, the AI adapts:

### No Docker

```
Warning: Docker not available. Skipping environment setup.

Assuming external services are already running:
- PostgreSQL at localhost:5432
- Kafka at localhost:9092

Proceeding to build phase...
```

### No Maven Wrapper

```
Warning: ./mvnw not found. Using system Maven...

mvn clean package
```

### No Citrus Tests

```
Warning: No Citrus tests found in src/test/java/

Skipping behavioral testing phase.

Note: Without tests, we cannot verify integration behavior.
Consider generating tests with /camel-test skill.
```

The AI continues with available tools, warning about limitations.

## Summary

`/camel-verify` validates integrations through a 5-phase feedback loop:

1. **Environment Setup** - Start and verify external dependencies
2. **Build** - Compile and resolve dependencies
3. **Start Integration** - Launch Camel and verify routes start
4. **Behavioral Testing** - Run Citrus tests against real services
5. **Report Generation** - Summarize results and provide insights

**Key Features:**
- **Error Classification** - BUILD, RUNTIME, TEST, ENVIRONMENT errors
- **Auto-Fixes** - 15 retry attempts with intelligent fixes
- **Fix Routing** - Errors routed to appropriate skills for fixes
- **Environment-in-the-Loop** - Tests against real databases and brokers
- **Graceful Degradation** - Works even when tools unavailable
- **Standalone Invocation** - Use for troubleshooting existing integrations

The result is confidence that your integration actually works, not just compiles.

This completes the three-phase pipeline: Design → Plan → Execute → Verify.
