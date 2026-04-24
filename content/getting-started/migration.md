---
title: "Migration Workflow"
weight: 2
description: "Migrate existing integrations to Apache Camel"
toc: false
---

## Overview

The migration workflow converts existing integrations from other platforms to Apache Camel 4.x using YAML DSL. Instead of manual rewriting, the AI analyzes your existing artifacts, builds a dependency graph, and migrates flow-by-flow with full validation.

Camel-Kit supports migration from MuleSoft Mule and Apache Camel 2.x/3.x.

## Supported Migration Paths

{{< before-after before="MuleSoft Mule 3.x/4.x" after="Camel 2.x/3.x Modernization" id="migration-paths" >}}

**MuleSoft → Apache Camel 4.x** — the most common migration path.

Camel-Kit understands Mule XML flows, DataWeave 1.x/2.x, connectors, error handling, choice routers, scatter-gather, sub-flows, and flow references.

**Key features:**
- Automatic DataWeave → XSLT conversion via DataMapper
- Component mapping from Mule connectors to Camel components
- Preservation of error handling semantics
- Flow-ref → `direct:` route conversion

<!--after-->

**Camel 2.x/3.x → Camel 4.x YAML DSL** — modernization for existing projects, including legacy Fuse-based deployments.

- XML DSL (Spring XML, Blueprint XML) → YAML DSL
- Deprecated components → modern equivalents
- OSGi Blueprint → `application.properties`
- Karaf features → Maven dependencies

**Key updates:** `camel-http4` → `camel-http`, `camel-jetty9` → `camel-jetty`, `camel-netty4` → `camel-netty`, `camel-activemq` → `camel-jms`

{{< /before-after >}}

## Migration Workflow Steps

{{< carousel id="migration-steps" >}}
<!--step Initialize for Migration-->

Unlike greenfield, migration projects are initialized in an existing directory:

```bash
cd my-existing-mule-project
camel-kit init --here --ai claude --source-platform mulesoft
```

Key flags:
- `--here` - Initialize in current directory (don't create new folder)
- `--source-platform mulesoft` - Specify migration source (mulesoft, camel2, or fuse)

Camel-Kit adds the pipeline commands without disturbing your existing files:

{{< filetree >}}
my-existing-mule-project/
  src/
    main/
      mule/ # Your existing Mule flows (unchanged)
  pom.xml # Your existing POM (unchanged)
  AGENTS.md # New: AI routing table
  .claude/
    commands/
      camel-migrate.md # New: Migration orchestrator
      camel-plan.md
      camel-execute.md
      camel-verify.md
    skills/
  .camel-kit/
{{< /filetree >}}

<!--step Run the Migration Command-->

Invoke the migration orchestrator:

```
/camel-migrate
```

The AI begins the migration pipeline.

<!--step Vendor Detection and Artifact Discovery-->

The AI automatically detects your platform and locates migration artifacts:

```
Detecting source platform...
Found: MuleSoft Mule 4.x

Scanning for artifacts...
Discovered:
- 12 Mule XML flow files
- 3 DataWeave transformation scripts
- 1 application properties file
- 2 connector configurations

Parsing artifacts...
- orders-api.xml: 3 flows, 1 sub-flow
- customer-sync.xml: 2 flows
- inventory-update.xml: 1 flow
...
```

What gets parsed per platform:

| MuleSoft | Camel 2.x/3.x |
|----------|---------------|
| Flow XML in `src/main/mule/` | Camel Context XML (Spring/Blueprint) |
| DataWeave scripts (`.dwl`) | Java DSL routes (RouteBuilder) |
| Connector configurations | Properties files |
| POM dependencies | Blueprint XML, Karaf features, fabric8 |



<!--step Graph Analysis-->

The AI builds a dependency graph to understand flow relationships:

```
Building dependency graph...

Flow Dependencies:
- orders-api.xml::receiveOrder
    └─> calls orders-api.xml::validateOrder (sub-flow)
    └─> calls customer-sync.xml::lookupCustomer (flow-ref)
    └─> publishes to Kafka (no dependency)

- customer-sync.xml::lookupCustomer
    └─> queries Database (no dependency)

- inventory-update.xml::updateInventory
    └─> standalone (no dependencies)

Migration Order (topological sort):
1. customer-sync.xml::lookupCustomer (no dependencies)
2. orders-api.xml::validateOrder (no dependencies)
3. orders-api.xml::receiveOrder (depends on #1, #2)
4. inventory-update.xml::updateInventory (standalone)
```

The graph ensures migrations happen in dependency order. Sub-flows and referenced flows are migrated before their callers.

<!--step Automatic Design Interview-->

For each flow, the AI conducts a design interview extracting requirements from the existing implementation:

```
Migrating flow: orders-api.xml::receiveOrder

Analyzing existing flow:
- Source: HTTP listener on /api/orders (POST)
- Transformation: DataWeave 2.0 (order-transform.dwl)
- Enrichment: Flow-ref to customer-sync::lookupCustomer
- Destination: Kafka topic "orders.validated"
- Error Handling: On-error-continue with email notification

Generating Design Specification...
```

The Design Specification captures the semantics of the original flow:

The generated Design Specification captures the semantics of the original flow:

{{< accordion title="1. Business Purpose" open="true" >}}
Receive orders via REST API, transform to canonical format, enrich with customer data, and publish to Kafka.
{{< /accordion >}}

{{< accordion title="2. Integration Flows" >}}
- Flow 1: Receive order via HTTP POST `/api/orders`
- Flow 2: Transform order using DataWeave logic
- Flow 3: Enrich with customer lookup (flow reference)
- Flow 4: Publish to Kafka topic `orders.validated`
- Flow 5: On error, send email notification
{{< /accordion >}}

{{< accordion title="3. Systems and Endpoints" >}}
- **Source:** HTTP POST `/api/orders`
- **Customer Data:** Via flow-ref to `customer-sync::lookupCustomer`
- **Destination:** Kafka topic `orders.validated`
- **Error Notification:** SMTP email
{{< /accordion >}}

{{< accordion title="4. Data Formats" >}}
- **Input:** JSON order schema (Mule)
- **Transformation:** DataWeave 2.0 → XSLT via DataMapper
- **Output:** JSON canonical order format
{{< /accordion >}}

{{< accordion title="5. Error Handling" >}}
- On error: Send email to `support@company.com`
- Include: order ID, error message, timestamp
{{< /accordion >}}

{{< accordion title="6. Technical Requirements" >}}
- **Components:** `camel-rest`, `camel-xslt-saxon`, `camel-direct`, `camel-kafka`, `camel-mail`
- **Throughput:** Match existing (est. 200/minute based on logs)
{{< /accordion >}}

{{< accordion title="7. Observability and Configuration" >}}
- **Metrics:** order count, transform errors, Kafka publish status
- **External config:** HTTP port, Kafka brokers, SMTP server
{{< /accordion >}}

You review and approve this design just like greenfield.

<!--step Plan and Execute-->

After design approval, the AI auto-invokes `/camel-plan` and `/camel-execute`:

The AI auto-invokes `/camel-plan` and decomposes into tasks:

{{< accordion title="Task 1: HTTP Listener for Order Reception" open="true" >}}
Replaces Mule HTTP Listener with `camel-platform-http`. Maps path, method, and response handling.
{{< /accordion >}}

{{< accordion title="Task 2: DataMapper Transformation" >}}
Converts `order-transform.dwl` (DataWeave 2.0) to an equivalent XSLT stylesheet via the DataMapper engine.
{{< /accordion >}}

{{< accordion title="Task 3: Customer Enrichment via Direct Call" >}}
Converts Mule `flow-ref` to Camel `direct:` route call. Preserves the enrichment semantics.
{{< /accordion >}}

{{< accordion title="Task 4: Kafka Publisher" >}}
Maps Mule Kafka connector to `camel-kafka` with equivalent topic, key, and serializer configuration.
{{< /accordion >}}

{{< accordion title="Task 5: Error Handler with Email Notification" >}}
Converts Mule `on-error-continue` to Camel `onException` with `camel-mail` for email alerts.
{{< /accordion >}}

Then auto-invokes `/camel-execute` with wave-based parallel execution and two-stage review per task.

<!--step Runtime Verification-->

Just like greenfield, the AI auto-invokes `/camel-verify`:

```
Verifying migrated flow...

Phase 1: Environment
- Starting Kafka and SMTP server via Docker Compose
- Environment ready

Phase 2: Build
- Compiling Camel routes...
- Build successful

Phase 3: Start
- Starting Camel application...
- All routes started

Phase 4: Behavioral Tests
- Test: Order reception and transformation - PASS
- Test: Customer enrichment lookup - PASS
- Test: Kafka publish - PASS
- Test: Error handling email - PASS

Phase 5: Report
Migration verified successfully!
```

{{< /carousel >}}

## Flow-by-Flow Migration

Camel-Kit migrates one flow at a time, not big-bang:

```
Progress: 3 of 12 flows migrated

Completed:
  ✓ customer-sync.xml::lookupCustomer
  ✓ orders-api.xml::validateOrder
  ✓ orders-api.xml::receiveOrder

Remaining:
  - inventory-update.xml::updateInventory
  - shipping-notification.xml::sendShippingEmail
  ...
```

This incremental approach lets you:
- Verify each flow individually
- Deploy partial migrations
- Roll back if needed
- Learn from early flows before tackling complex ones

{{< carousel id="migration-reference" >}}
<!--step Component Mapping-->

**Mule Connector → Camel Component:**

| Mule Connector | Camel Component |
|----------------|-----------------|
| HTTP Listener | `camel-rest`, `camel-jetty` |
| Database | `camel-sql`, `camel-jdbc` |
| File | `camel-file` |
| JMS | `camel-jms` |
| Kafka | `camel-kafka` |
| Salesforce | `camel-salesforce` |
| FTP | `camel-ftp` |
| Email | `camel-mail` |
| VM | `camel-seda` |

No direct equivalent? The AI flags it and suggests alternatives (e.g., `camel-http` with REST API).

<!--step Deprecated Components-->

**Camel 2.x/3.x → 4.x updates** (automatic):

| Old | New |
|-----|-----|
| `camel-http4` | `camel-http` |
| `camel-jetty9` | `camel-jetty` |
| `camel-netty4` | `camel-netty` |
| `camel-activemq` | `camel-jms` (with ActiveMQ client) |

<!--step Graph Analysis-->

Analyze your project before migration:

```bash
camel-kit graph stats
camel-kit graph generate
camel-kit graph route-topology
```

![Graph visualization of a MuleSoft migration project](../../images/graph-visualize.png)

14 subcommands, 8 parsers. Ensures migrations happen in dependency order.
{{< /carousel >}}

## Common Migration Scenarios

{{< carousel id="migration-scenarios" >}}
<!--step HTTP-to-Database-->

{{< before-after before="Mule XML" after="Camel YAML" id="scenario1" >}}
```xml
<flow name="get-customer">
  <http:listener path="/customer/{id}"/>
  <db:select config-ref="dbConfig">
    <db:sql>SELECT * FROM customers WHERE id = :id</db:sql>
    <db:input-parameters>
      #[{'id': attributes.uriParams.id}]
    </db:input-parameters>
  </db:select>
</flow>
```
<!--after-->
```yaml
- route:
    id: get-customer
    from:
      uri: "platform-http:/customer/{id}"
      parameters:
        httpMethodRestrict: GET
      steps:
        - to: "sql:SELECT * FROM customers WHERE id = :#${header.id}"
```
{{< /before-after >}}

<!--step Scatter-Gather-->

{{< before-after before="Mule XML" after="Camel YAML" id="scenario2" >}}
```xml
<scatter-gather>
  <route>
    <http:request url="http://inventory-service/check"/>
  </route>
  <route>
    <http:request url="http://pricing-service/price"/>
  </route>
</scatter-gather>
```
<!--after-->
```yaml
- multicast:
    parallelProcessing: true
    steps:
      - to: http://inventory-service/check
      - to: http://pricing-service/price
- aggregate:
    strategy: GroupedBodyAggregationStrategy
```
{{< /before-after >}}

<!--step DataWeave to XSLT-->

{{< before-after before="DataWeave" after="XSLT" id="scenario3" >}}
```dataweave
%dw 2.0
output application/xml
---
{
  Order: {
    ID: payload.orderId,
    Customer: payload.customer.name,
    Items: payload.items map {
      Item: {
        SKU: $.sku,
        Qty: $.quantity
      }
    }
  }
}
```
<!--after-->
```xml
<xsl:stylesheet version="2.0">
  <xsl:template match="/">
    <Order>
      <ID><xsl:value-of select="/order/orderId"/></ID>
      <Customer><xsl:value-of select="/order/customer/name"/></Customer>
      <Items>
        <xsl:for-each select="/order/items/item">
          <Item>
            <SKU><xsl:value-of select="sku"/></SKU>
            <Qty><xsl:value-of select="quantity"/></Qty>
          </Item>
        </xsl:for-each>
      </Items>
    </Order>
  </xsl:template>
</xsl:stylesheet>
```
{{< /before-after >}}

<!--step Sub-Flow Conversion-->

{{< before-after before="Mule XML" after="Camel YAML" id="scenario4" >}}
```xml
<flow name="main-flow">
  <http:listener path="/api"/>
  <flow-ref name="validate-order"/>
</flow>

<sub-flow name="validate-order">
  <validation:is-not-null value="#[payload.orderId]"/>
</sub-flow>
```
<!--after-->
```yaml
- route:
    id: main-flow
    from:
      uri: "platform-http:/api"
      parameters:
        httpMethodRestrict: POST
      steps:
        - to: "direct:validate-order"

- route:
    id: validate-order
    from:
      uri: "direct:validate-order"
      steps:
        - validate:
            simple: "${body.orderId} != null"
```
{{< /before-after >}}

<!--step Choice Router-->

{{< before-after before="Mule XML" after="Camel YAML" id="scenario5" >}}
```xml
<choice>
  <when expression="#[payload.amount &gt; 1000]">
    <flow-ref name="high-value-processing"/>
  </when>
  <otherwise>
    <flow-ref name="standard-processing"/>
  </otherwise>
</choice>
```
<!--after-->
```yaml
- choice:
    when:
      - simple: ${body.amount} > 1000
        steps:
          - to: direct:high-value-processing
    otherwise:
      steps:
        - to: direct:standard-processing
```
{{< /before-after >}}

<!--step Spring XML to Properties-->

{{< before-after before="Camel 2.x Spring XML" after="Camel 4.x application.properties" id="scenario6" >}}
```xml
<bean id="myDataSource" class="org.apache.commons.dbcp2.BasicDataSource">
  <property name="url" value="jdbc:postgresql://localhost/orders"/>
  <property name="username" value="dbuser"/>
</bean>
```
<!--after-->
```properties
camel.component.sql.data-source=#class:org.apache.commons.dbcp2.BasicDataSource
camel.component.sql.data-source.url=jdbc:postgresql://localhost/orders
camel.component.sql.data-source.username=dbuser
```
{{< /before-after >}}

{{< /carousel >}}

## Troubleshooting

{{< carousel id="migration-troubleshooting" >}}
<!--step Graph Analysis Fails-->

**Circular dependency detected?**

```
Error: Circular dependency detected between flows A and B
```

Use the Graph CLI to visualize the dependency graph and identify the cycle:

```bash
camel-kit graph visualize
```

Break the circular dependency manually before re-running migration.

<!--step DataWeave Too Complex-->

**Advanced DataWeave features can't be auto-converted?**

```
Warning: DataWeave script uses advanced features
(custom functions, external libraries)
```

The AI will suggest a **custom Java processor** instead of XSLT. Complex DataWeave logic maps better to Java beans than to XSLT stylesheets.

<!--step Missing Camel Component-->

**No Camel equivalent for a Mule connector?**

```
Error: No Camel component found for
"mule-proprietary-connector"
```

Options:
1. Use `camel-http` to call the same APIs
2. Write a custom Camel component
3. Wrap existing libraries with Camel's Vendor Extensions

<!--step Verification Fails-->

**Build or runtime errors after migration?**

Run `/camel-verify` standalone — it classifies the error (build/runtime/test/config) and routes the fix to the appropriate skill. Retries automatically up to 15 times.

```
/camel-verify
```
{{< /carousel >}}

## Summary

The migration workflow automates platform conversion through six steps:

1. **Initialize** - `camel-kit init --here --ai claude --source-platform mulesoft`
2. **Detect** - AI identifies platform and parses artifacts
3. **Graph** - Builds dependency graph and determines migration order
4. **Design** - Generates Design Specification per flow
5. **Implement** - Plan and execute code generation
6. **Verify** - Runtime validation with behavioral tests

The result: Camel 4.x YAML routes that preserve the semantics of your original integration, validated with runtime tests, and ready for deployment.

Flow-by-flow migration reduces risk compared to big-bang rewrites. You migrate, verify, and deploy incrementally.
