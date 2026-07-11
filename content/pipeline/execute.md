---
title: "Code Generation"
weight: 3
description: "/camel-execute — Phase 3: Orchestrated execution with two-stage review"
---

## Overview

`/camel-execute` is the Phase 3 orchestrator that transforms the approved Implementation Plan into working code. Through wave-based execution, internal skill loading, and two-stage review, the AI generates Camel routes, tests, and configuration files.

The output is a complete Maven project with YAML routes, Citrus tests, application properties, a Docker Compose environment, and `docs/camel-kit/<pipeline-id>/execution-report.md`.

## When to Use

Invoke `/camel-execute` when you:

- Have an Implementation Plan from `/camel-plan`
- Want to generate code based on the task breakdown
- Need to implement the entire integration in one orchestrated run

**Auto-invocation:** After `/camel-plan` completes the Implementation Plan, the AI automatically invokes `/camel-execute`. There is no separate plan approval gate — the design approval covers all downstream work. You rarely need to invoke `/camel-execute` manually.

**Environment Probe:** Before dispatching any implementers, `/camel-execute` runs an environment probe — generating a throwaway skeleton project to verify that dependencies resolve, Docker services start, and the runtime boots. This catches feasibility issues before any code is generated. If the probe finds an architectural problem (e.g., a component doesn't exist for the target runtime), it triggers automatic re-planning to adjust the affected design documents.

## Input: Implementation Plan

`/camel-execute` reads the Implementation Plan from `docs/camel-kit/<pipeline-id>/implementation-plan.md` (created by `/camel-plan`).

The executor analyzes:
- **Task list** - What to implement
- **Acceptance criteria** - How to validate each task
- **Wave analysis** - Parallel vs. sequential execution order
- **Component requirements** - Which Camel components per task
- **Review specifications** - Two-stage validation per task

## The Execution Process

The AI transforms the Implementation Plan into working code through wave-based execution with continuous validation.

{{< tabs id="execution-stages" >}}
<!--tab Implement-->
## Implementation Per Task

For each task (respecting wave order), the executor invokes the `camel-implement` skill with:

- Task description
- Acceptance criteria
- Component list (from the plan)
- Design Specification (context)

**Example: Task 1 (REST Endpoint)**

### Step 1: Wave Analysis Parsing

The executor parses the wave analysis to determine execution order.

**Example Plan:**
```markdown
## Wave Analysis

Wave 1 (Parallel):
- Task 1: REST Endpoint
- Task 8: Error Handler

Wave 2 (Sequential, depends on Wave 1):
- Task 2: Validation

Wave 3 (Sequential, depends on Wave 2):
- Task 3: Credit Lookup

Wave 4 (Sequential, depends on Wave 3):
- Task 4: Routing Decision

Wave 5 (Parallel, depends on Wave 4):
- Task 5: Kafka Warehouse Publisher
- Task 6: Kafka Pending Publisher
- Task 7: Kafka Invalid Publisher
```

**Execution Strategy:**
```
Execute Wave 1 (Tasks 1 + 8 in parallel)
  → Wait for both to complete
Execute Wave 2 (Task 2)
  → Wait for completion
Execute Wave 3 (Task 3)
  → Wait for completion
Execute Wave 4 (Task 4)
  → Wait for completion
Execute Wave 5 (Tasks 5 + 6 + 7 in parallel)
  → Wait for all to complete
```

### Step 2: Internal Skill Composition

During execution, the orchestrator composes three internal skills:

**camel-implement.md** - Route generation skill
- Generates Camel YAML routes from task specifications
- Uses route templates and follows the Constitution
- Handles route structure, naming, observability

**camel-test.md** - Test generation skill
- Creates Citrus integration tests
- Generates test scenarios from acceptance criteria
- Handles mocking and assertions

**camel-verify.md** - Runtime verification skill
- Builds the generated application
- Runs Citrus integration tests
- Classifies failures and routes targeted fixes

These skills are internal and have no generated command stubs. Static quality validation is the next public pipeline stage, `/camel-validate`.

### Generated Route Example

The `camel-implement` skill generates a YAML route following the Constitution:

**Output: `order-reception.camel.yaml`**
```yaml
- route:
    id: order-reception-rest
    from:
      uri: "platform-http:/api/orders"
      parameters:
        httpMethodRestrict: POST
      parameters:
        port: "{{rest.port}}"
      steps:
        - log:
            message: "Order received: ${body.orderId}"
        - unmarshal:
            json:
              library: Jackson
              unmarshalType: com.example.Order
        - to: "seda:orders.processing?waitForTaskToComplete=Never"
        - setBody:
            constant: "Order accepted"
        - setHeader:
            name: Content-Type
            constant: application/json
        - setHeader:
            name: CamelHttpResponseCode
            constant: 202
        - to: "micrometer:counter:orders.received.total"
```

**Key Features:**
- External configuration (`{{rest.port}}`)
- Fire-and-forget pattern (SEDA queue)
- Observability (metrics, logging)
- No business logic (separation of concerns)

<!--tab Spec Review-->
## Stage 1: Spec Compliance Review

The executor validates the generated route against the task's acceptance criteria.

**Validation Checklist:**

```
Task 1 Acceptance Criteria:
✓ REST endpoint listens on port ${rest.port} (externalized config)
✓ Accepts POST requests at /api/orders
✓ Expects JSON payload with orderId, customerId, items, totalAmount
✓ Returns HTTP 202 Accepted immediately (fire-and-forget)
✓ Passes order to internal SEDA queue for async processing
✓ No business logic in this route (separation of concerns)

Spec Compliance: PASS
```

If any criterion fails:

```
✗ Returns HTTP 202 Accepted immediately
  Found: HTTP 200 OK

Spec Compliance: FAIL
Regenerating route...
```

The executor invokes `camel-implement` again with feedback. It retries up to 3 times per task.

<!--tab Quality Review-->
## Stage 2: Code Quality Review

After spec compliance passes, the executor validates against the Constitution.

**Constitution Checklist:**

```
Constitution Rule 1 (Route Structure): ✓ PASS
  - Route follows from → process → to structure

Constitution Rule 2 (Single Responsibility): ✓ PASS
  - Route has one responsibility: receive and queue orders

Constitution Rule 3 (Separation of Concerns): ✓ PASS
  - No business logic in REST endpoint route

Constitution Rule 4 (Naming Conventions): ✓ PASS
  - Route ID: order-reception-rest (kebab-case)

Constitution Rule 5 (Observability): ✓ PASS
  - Micrometer counter: orders.received.total
  - Log statement on reception

Constitution Rule 6 (External Configuration): ✓ PASS
  - REST port from {{rest.port}} property

Constitution Rule 7 (Supported Components): ✓ PASS
  - camel-rest: supported by Apache Camel
  - camel-jackson: supported by Apache Camel
  - camel-seda: supported by Apache Camel

Code Quality: PASS
```

If any rule fails:

```
Constitution Rule 6 (External Configuration): ✗ FAIL
  - Found hardcoded port 8080 in REST URI
  - Expected: {{rest.port}} property reference

Code Quality: FAIL
Regenerating route...
```

The executor provides specific feedback to `camel-implement` and retries.

<!--tab Generated Artifacts-->
## Complete Project Artifacts

After all tasks complete, the executor collects generated artifacts:

**Camel YAML Routes:**
{{< filetree >}}
src/
  main/
    resources/
      routes/
        order-reception.camel.yaml
        order-validation.camel.yaml
        customer-credit-lookup.camel.yaml
        routing-decision.camel.yaml
        kafka-warehouse-publisher.camel.yaml
        kafka-pending-publisher.camel.yaml
        kafka-invalid-publisher.camel.yaml
        error-handler.camel.yaml
{{< /filetree >}}

**Application Configuration:**
```
src/main/resources/application.properties
```

**Docker Compose Environment:**
```
docker-compose.yaml
```

**Citrus Integration Tests:**
{{< filetree >}}
src/
  test/
    java/
      OrderProcessingIT.java
{{< /filetree >}}

**Execution Report:**
```
docs/camel-kit/<pipeline-id>/execution-report.md
```

### Maven Project Structure

The executor ensures the Maven project structure exists:

**Generated POM:**
```xml
<project>
  <groupId>com.example</groupId>
  <artifactId>order-processing</artifactId>
  <version>1.0.0-SNAPSHOT</version>
  
  <dependencyManagement>
    <dependencies>
      <dependency>
        <groupId>org.apache.camel</groupId>
        <artifactId>camel-bom</artifactId>
        <version>4.21.0</version>
        <type>pom</type>
        <scope>import</scope>
      </dependency>
    </dependencies>
  </dependencyManagement>
  
  <dependencies>
    <!-- Camel Core -->
    <dependency>
      <groupId>org.apache.camel</groupId>
      <artifactId>camel-yaml-dsl</artifactId>
    </dependency>
    
    <!-- Components from tasks -->
    <dependency>
      <groupId>org.apache.camel</groupId>
      <artifactId>camel-rest</artifactId>
    </dependency>
    <dependency>
      <groupId>org.apache.camel</groupId>
      <artifactId>camel-jackson</artifactId>
    </dependency>
    <dependency>
      <groupId>org.apache.camel</groupId>
      <artifactId>camel-kafka</artifactId>
    </dependency>
    <dependency>
      <groupId>org.apache.camel</groupId>
      <artifactId>camel-sql</artifactId>
    </dependency>
    
    <!-- Testing -->
    <dependency>
      <groupId>org.citrusframework</groupId>
      <artifactId>citrus-camel</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>
</project>
```

**Version Management:**
- Camel version: `4.21.0` (Apache Camel)
- All components use the BOM for version consistency
- No version numbers on individual dependencies
{{< /tabs >}}

## Detailed Artifact Examples

### Camel YAML Routes

Each task produces one `.camel.yaml` file following the Constitution.

**Example: `customer-credit-lookup.camel.yaml`**
```yaml
- route:
    id: customer-credit-lookup
    from:
      uri: seda:orders.enrichment
      steps:
        - to:
            uri: sql:SELECT credit_status, warehouse_location FROM customers WHERE id = :#${body.customerId}
            parameters:
              dataSource: "#bean:dataSource"
        - setHeader:
            name: creditStatus
            simple: "${body[0]['credit_status']}"
        - setHeader:
            name: warehouseLocation
            simple: "${body[0]['warehouse_location']}"
        - log:
            message: "Customer ${body.customerId}: creditStatus=${header.creditStatus}"
        - to: "micrometer:timer:database.lookup.time"
        - onException:
            - exception: java.sql.SQLException
              redeliveryPolicy:
                maximumRedeliveries: 3
                redeliveryDelay: 2000
                backOffMultiplier: 2
                maximumRedeliveryDelay: 8000
              handled:
                constant: true
              steps:
                - log:
                    message: "Database error after retries: ${exception.message}"
                    loggingLevel: ERROR
                - to: seda:orders.error
                - to: "micrometer:counter:errors.database.total"
```

**Key Features:**
- **Route structure:** from → process → to (Rule 1)
- **Single responsibility:** Only credit lookup, no routing decisions (Rule 2)
- **External config:** dataSource bean reference (Rule 6)
- **Observability:** Timer and counter metrics, log statements (Rule 5)
- **Error handling:** Retry with exponential backoff per Design Spec (Section 5)

### Application Properties

All externalized configuration in one file:

**`application.properties`:**
```properties
# REST Endpoint
rest.port=8080

# Database Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/orders
spring.datasource.username=orderuser
spring.datasource.password=change-me-in-production

# Kafka Configuration
kafka.brokers=localhost:9092
kafka.topic.warehouse=warehouse.orders
kafka.topic.pending=orders.pending
kafka.topic.invalid=orders.invalid

# SMTP Configuration (Error Alerts)
smtp.host=smtp.company.com
smtp.port=587
smtp.username=alerts@company.com
smtp.password=change-me-in-production
ops.email=ops@company.com

# Camel Configuration
camel.component.kafka.brokers=${kafka.brokers}
camel.component.sql.data-source=#bean:dataSource

# Observability
management.endpoints.web.exposure.include=health,metrics,prometheus
management.metrics.export.prometheus.enabled=true
```

### Docker Compose Environment

Development environment for testing:

**`docker-compose.yaml`:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: orders
      POSTGRES_USER: orderuser
      POSTGRES_PASSWORD: change-me-in-production
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    ports:
      - "9092:9092"
    depends_on:
      - zookeeper

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    ports:
      - "2181:2181"

volumes:
  postgres-data:
```

### Citrus Integration Tests

Behavioral tests from acceptance criteria:

**`OrderProcessingIT.java`:**
```java
@Test
public void testValidOrderProcessing() {
    // Given: Valid order JSON
    String validOrder = """
        {
          "orderId": "ORD-12345",
          "customerId": "CUST-67890",
          "items": [{"sku": "WIDGET-A", "quantity": 2, "price": 19.99}],
          "totalAmount": 39.98
        }
        """;
    
    // When: POST to /api/orders
    http()
        .client("restClient")
        .send()
        .post("/api/orders")
        .contentType("application/json")
        .payload(validOrder);
    
    // Then: Receive HTTP 202 Accepted
    http()
        .client("restClient")
        .receive()
        .response(HttpStatus.ACCEPTED);
    
    // And: Message appears on Kafka topic warehouse.orders
    kafka()
        .endpoint("kafkaEndpoint")
        .receive()
        .topic("warehouse.orders")
        .messageKey("ORD-12345")
        .payload(containsString("\"creditStatus\":\"ACTIVE\""));
}

@Test
public void testInvalidOrderHandling() {
    // Given: Invalid order (totalAmount = 0)
    String invalidOrder = """
        {
          "orderId": "ORD-99999",
          "customerId": "CUST-11111",
          "items": [],
          "totalAmount": 0
        }
        """;
    
    // When: POST to /api/orders
    http()
        .client("restClient")
        .send()
        .post("/api/orders")
        .contentType("application/json")
        .payload(invalidOrder);
    
    // Then: Receive HTTP 202 Accepted (fire-and-forget)
    http()
        .client("restClient")
        .receive()
        .response(HttpStatus.ACCEPTED);
    
    // And: Message appears on Kafka topic orders.invalid
    kafka()
        .endpoint("kafkaEndpoint")
        .receive()
        .topic("orders.invalid")
        .messageKey("ORD-99999")
        .payload(containsString("\"error\":\"totalAmount must be > 0\""));
}
```

### Execution Report

Summary of generated artifacts, staged reviews, and runtime verification:

**`docs/camel-kit/<pipeline-id>/execution-report.md`:**
```markdown
# Execution Report: Order Processing Integration

## Component Verification

| Component | Status | Version |
|-----------|--------|---------|
| camel-rest | ✓ Supported | 4.21.0 |
| camel-jackson | ✓ Supported | 4.21.0 |
| camel-seda | ✓ Supported | 4.21.0 |
| camel-kafka | ✓ Supported | 4.21.0 |
| camel-sql | ✓ Supported | 4.21.0 |
| camel-mail | ✓ Supported | 4.21.0 |

## YAML Syntax Check

All 8 route files: ✓ Valid YAML

## Route Structure Check

All 8 routes follow Constitution Rule 1 (from → process → to)

## Summary

- Total routes: 8
- Components verified: 6
- Constitution compliance: 100%
- MCP verification: 100%

No issues found.
```

## Two-Stage Review in Action

### Example: Task Fails Spec Compliance

```
Implementing Task 2: Order Validation Flow

Generated route: order-validation.camel.yaml

Stage 1: Spec Compliance Review
  Checking acceptance criteria...
  
  ✓ Consumes from SEDA queue "orders.processing"
  ✓ Validates: orderId not null
  ✓ Validates: totalAmount > 0
  ✗ Validates: customerId not null
    → Not found in route
  
  Spec Compliance: FAIL
  
Regenerating route with feedback:
  "Add validation for customerId not null"

Generated route: order-validation.camel.yaml (attempt 2)

Stage 1: Spec Compliance Review
  Checking acceptance criteria...
  
  ✓ All criteria met
  
  Spec Compliance: PASS
  
Stage 2: Code Quality Review
  Checking Constitution...
  
  ✓ Rule 1: Route structure
  ✓ Rule 2: Single responsibility
  ✓ Rule 3: Separation of concerns
  ✓ Rule 4: Naming conventions
  ✓ Rule 5: Observability
  ✓ Rule 6: External configuration
  ✓ Rule 7: Supported components
  
  Code Quality: PASS

Task 2 complete.
```

### Example: Task Fails Code Quality

```
Stage 1: Spec Compliance Review
  ✓ PASS

Stage 2: Code Quality Review
  Checking Constitution...
  
  ✓ Rule 1: Route structure
  ✓ Rule 2: Single responsibility
  ✓ Rule 3: Separation of concerns
  ✓ Rule 4: Naming conventions
  ✗ Rule 5: Observability
    → No metrics found in route
  ✓ Rule 6: External configuration
  ✓ Rule 7: Supported components
  
  Code Quality: FAIL

Regenerating route with feedback:
  "Add micrometer counter for validation failures"

(Retry...)

Stage 2: Code Quality Review
  ✓ All rules passed
  
  Code Quality: PASS

Task 2 complete.
```

## Parallel Execution

Tasks in the same wave execute in parallel using AI agent concurrency:

**Wave 5 (3 parallel tasks):**
```
Starting Wave 5 (parallel execution)...

[Task 5 thread] Implementing Kafka Warehouse Publisher...
[Task 6 thread] Implementing Kafka Pending Publisher...
[Task 7 thread] Implementing Kafka Invalid Publisher...

[Task 5 thread] Spec compliance: PASS
[Task 7 thread] Spec compliance: PASS
[Task 6 thread] Spec compliance: PASS

[Task 5 thread] Code quality: PASS
[Task 6 thread] Code quality: PASS
[Task 7 thread] Code quality: PASS

Wave 5 complete (elapsed: 2m 15s)
```

Parallel execution reduces total execution time from ~24 minutes (8 tasks × 3 min) to ~12 minutes (5 waves, some parallel).

## Resume From Task

If execution fails mid-way, you can resume:

```
/camel-execute --resume-from=task-5
```

The executor skips completed tasks and starts from Task 5.

## DataMapper Integration

If the Design Specification includes DataMapper transformations, `/camel-execute` invokes the DataMapper implementation skill.

**Task Example:**
```markdown
## Task 2: Order Transformation (DataMapper)

**Description:**
Transform incoming order JSON to canonical format using XSLT DataMapper.

**Acceptance Criteria:**
- Input: Mule-style order JSON
- Output: Camel canonical order JSON
- Transformation: XSLT via DataMapper
- Field mappings: orderId → id, customer.email → customerEmail, etc.
```

The `camel-implement` skill generates:

1. **XSLT stylesheet:** `src/main/resources/xslt/order-transform.xslt`
2. **Route with XSLT processor:**
```yaml
- route:
    id: order-transformation
    from:
      uri: seda:orders.raw
      steps:
        - to: xslt:xslt/order-transform.xslt?saxon=true
        - to: seda:orders.canonical
```

## Summary

`/camel-execute` transforms Implementation Plans into working code through:

1. **Wave Analysis** - Parallel and sequential task execution
2. **Internal Skills** - camel-implement, camel-test, camel-verify
3. **Per-Task Loop** - Implement → Spec Compliance → Code Quality
4. **Two-Stage Review** - Acceptance criteria validation, Constitution validation
5. **Artifact Generation** - YAML routes, tests, config, Docker Compose
6. **Runtime Verification** - Dispatches internal `camel-verify`
7. **Pipeline Transition** - Continues to `/camel-validate`

The result is a Maven project with verified routes.

Next: [Runtime Verification](../verify/) explains the internal feedback loop before the pipeline continues to `/camel-validate`.
