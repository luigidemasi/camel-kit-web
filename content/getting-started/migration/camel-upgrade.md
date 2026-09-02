---
title: "Camel 2.x/3.x Upgrade"
weight: 3
description: "Modernize Apache Camel 2.x/3.x projects to Camel 4.x YAML DSL"
---

## Overview

Camel-Kit helps you modernize legacy Apache Camel 2.x/3.x projects to Camel 4.x with YAML DSL, including projects based on Red Hat Fuse 6.x/7.x. The AI assistant analyzes your existing routes, configuration, and deployment artifacts, then generates updated code following Camel 4.x best practices.

Key transformations handled by Camel-Kit:

- **XML DSL to YAML DSL** — Spring XML and Blueprint XML routes converted to modern YAML syntax
- **Deprecated components** — Catalog-verified renames, with explicit decisions when no fixed replacement exists
- **OSGi Blueprint removal** — Property placeholders move to `application.properties`; routes, beans, references, and service exports move to their Camel 4 runtime equivalents
- **Karaf features to runtime dependencies** — OSGi feature bundles become Maven dependencies in `pom.xml` for Spring Boot or Quarkus; Camel Main records them in the module-root `application.properties`
- **Platform modernization** — Migration paths from Karaf/OSGi to Camel Main, Spring Boot, or Quarkus

## What Gets Parsed

Camel-Kit analyzes the following artifacts from your Camel 2.x/3.x project:

| Artifact | Description |
|----------|-------------|
| Camel Context XML (Spring/Blueprint) | Route definitions, endpoint configurations, error handlers |
| Java DSL routes (RouteBuilder) | Programmatic route definitions |
| Properties files | Configuration properties, endpoint URIs, authentication requirements, and secret references |
| Blueprint XML | OSGi service wiring, bean definitions |
| Karaf features | Dependency bundles, OSGi feature declarations |
| fabric8 descriptors | Container metadata, deployment configuration |

The AI assistant inspects these artifacts together to build an evidence-qualified view of the discovered application structure before generating the modernized output. Coverage and parse gaps remain explicit.

## Evidence, Retirement, and Cutover Planning

Before proposing a target design, Camel-Kit records Camel 2.x/3.x behavioral assumptions and evidence gaps in `migration-analysis.md`. Each entry links a stable ID to the affected route or interface, source evidence, a `Confirmed`, `Inferred`, or `Unknown` status, the impact if the assumption is false, and the validation and owner still required. A component rename or matching endpoint shape is not treated as proof of API or behavioral compatibility.

The source-retirement section uses bounded XML, Java, and configuration scanning to corroborate entry roots from structurally parsed external and scheduled consumers, then follows constant `direct:` and `seda:` route references. A `Retirement candidate` requires complete relevant supported source closure and no supported path from any corroborated entry root. Dynamic endpoints, reflective or custom dispatch, unresolved beans or services, parse failures, and callers outside the selected boundary remain `Unknown`; a current graph can only corroborate and accelerate the source evidence.

The `Migration Strategy` in `business-requirements.md` classifies a scope as `Incremental candidate` only when current evidence or explicit operator confirmation establishes an existing external control—for example, an operator-controlled gateway or load balancer, deterministic JMS selector or Kafka partition, mutually exclusive source directory, or pre-consumption source-side routing predicate—and the target conditions are confirmed design constraints with named owners and pre-cutover validation. A consumer endpoint, route predicate after consumption, static configuration, source scan, or graph can reveal a possible mechanism, but by itself is at most `Inferred` evidence that the control is currently operative. The classification is design candidacy, not cutover readiness.

`Single cutover required`, `Undetermined - evidence needed`, and `migration-runbook.md` follow the [shared evidence, authorization, and retirement rules](../); Camel platform evidence does not relax them.

## Deprecated Component Updates

Several Camel components were renamed, consolidated, or removed before Camel 4.x. Camel-Kit uses the mappings below as starting points, then verifies each target and its options against the MCP catalog for the selected Camel version and runtime:

| Old Component (2.x/3.x) | New Component (4.x) |
|-------------------------|---------------------|
| `camel-http4` | `camel-http` |
| `jetty9:` consumer (`camel-jetty9`) | `platform-http:` (`camel-platform-http`) |
| `camel-netty4` | `camel-netty` |
| `camel-netty4-http` | `camel-netty-http` |
| `camel-activemq` | No forced rename; keep or replace only after catalog verification and a broker/runtime decision |
| `camel-mina2` | `camel-mina` |
| `camel-quartz2` | `camel-quartz` |
| `camel-rxjava2` | `camel-rxjava`, subject to MCP verification |
| `camel-mongodb3` | `camel-mongodb` |
| `camel-hdfs2` | `camel-hdfs` |

The AI will also flag components that have been fully removed and suggest modern alternatives.

## Platform Migration Paths

### Karaf/Blueprint → Camel Main, Spring Boot, or Quarkus

For projects running on Apache Karaf or Red Hat Fuse Karaf distributions:

- **Blueprint route definitions** are converted to `.camel.yaml` route files
- **Blueprint property placeholders** move to `application.properties`
- **Blueprint `<bean>` and `<reference>` definitions** become named registry or dependency-injection entries for the target runtime; infrastructure beans follow the Forage-first configuration ladder
- **OSGi `<service>` exports** are removed when no longer needed outside OSGi; required service contracts are recorded for implementation with the target runtime's facilities
- **Karaf features** (feature XML files) become standard Maven `<dependency>` declarations in `pom.xml` for Spring Boot or Quarkus; Camel Main records the resolved coordinates under `camel.jbang.dependencies` in the module-root `application.properties`

The AI will ask which target runtime you prefer and generate the appropriate configuration. Camel Main is offered only when all required Java processors, beans, and Blueprint configuration can be translated to supported YAML DSL or inline Groovy. If Java source must remain, choose Spring Boot or Quarkus so it can be compiled and packaged through Maven.

### Spring XML → YAML DSL

For projects using Spring XML-based Camel configuration:

- **`<camelContext>` and `<route>` elements** are converted to `.camel.yaml` route files
- **`<bean>` definitions** are migrated using the target runtime's bean support; infrastructure beans follow the Forage-first configuration ladder
- **`<endpoint>` declarations** are converted to inline URIs within routes

Bean references are preserved using the same IDs in the target runtime's registry or dependency injection mechanism.

### Java DSL → YAML DSL

Camel-Kit analyzes Java DSL `RouteBuilder` classes and expresses their routes in the Camel 4.x YAML design. Required Java API updates, such as replacing removed exchange APIs in custom processors, are recorded as implementation actions for `/camel-execute`; the migration does not promise a mixed Java/YAML output choice. Camel Main remains available only if no Java source must remain after translation; otherwise the design requires Spring Boot or Quarkus.

## Common Scenarios

{{< carousel id="camel-upgrade-scenarios" >}}

<!--step Spring XML to YAML-->

Convert a Spring XML Camel route to YAML DSL format.

{{< before-after before="Spring XML route" after="YAML DSL route" id="spring-xml-yaml" >}}

```xml
<camelContext xmlns="http://camel.apache.org/schema/spring">
  <route id="file-processor">
    <from uri="file:input"/>
    <log message="Processing ${header.CamelFileName}"/>
    <to uri="file:output"/>
  </route>
</camelContext>
```

<!--after-->

```yaml
- route:
    id: file-processor
    from:
      uri: "file:input"
      steps:
        - log:
            message: "Processing ${header.CamelFileName}"
        - to: "file:output"
```

{{< /before-after >}}

<!--step Blueprint XML to Configuration-->

Migrate OSGi Blueprint bean definitions and routes to runtime-appropriate configuration.

{{< before-after before="Blueprint XML" after="Application properties + YAML route" id="blueprint-config" >}}

```xml
<blueprint xmlns="http://www.osgi.org/xmlns/blueprint/v1.0.0">
  <bean id="myDataSource" class="org.apache.commons.dbcp2.BasicDataSource">
    <property name="url" value="jdbc:postgresql://localhost/orders"/>
    <property name="username" value="dbuser"/>
  </bean>
  <camelContext xmlns="http://camel.apache.org/schema/blueprint">
    <route>
      <from uri="timer:tick?period=5000"/>
      <to uri="sql:SELECT * FROM orders?dataSource=#myDataSource"/>
    </route>
  </camelContext>
</blueprint>
```

<!--after-->

**application.properties** (Camel Main syntax):

```properties
forage.myDataSource.jdbc.db.kind=postgresql
forage.myDataSource.jdbc.url=jdbc:postgresql://{{db.host}}:{{db.port}}/{{db.name}}
forage.myDataSource.jdbc.username={{db.username}}
forage.myDataSource.jdbc.password={{db.password}}
```

This uses a Forage-backed named bean (`#myDataSource`) and keeps connection values external. Camel Main uses `{{key}}` references inside `application.properties`; Spring Boot and Quarkus use `${key}`. Camel-Kit first verifies Forage availability and these keys in its cached catalog. If Forage is unavailable, it continues down the configuration ladder to catalog-verified component properties, then uses `camel.beans.*` only as a documented last resort.

**route.camel.yaml:**

```yaml
- route:
    id: order-poll
    from:
      uri: "timer:tick?period=5000"
      steps:
        - to: "sql:SELECT * FROM orders?dataSource=#myDataSource"
```

{{< /before-after >}}

<!--step Deprecated Component Swap-->

Replace deprecated Camel 2.x/3.x components with Camel 4.x equivalents.

{{< before-after before="Camel 3.x components" after="Camel 4.x components" id="component-swap" >}}

```xml
<route>
  <from uri="jetty9:http://0.0.0.0:8080/api"/>
  <to uri="activemq:queue:orders"/>
</route>
```

<!--after-->

```yaml
- route:
    id: api-to-queue
    from:
      uri: "platform-http:/api"
      steps:
        - to: "activemq:queue:orders"
```

The `jetty9:` consumer becomes `platform-http:`; configure its listener port with the selected runtime's server property. The `activemq:` producer is intentionally not forced to `jms:`. Camel-Kit verifies the selected target in the MCP catalog and chooses dependencies or an alternative from the project's broker requirements.

{{< /before-after >}}

<!--step Karaf Features to Runtime Dependencies-->

For Spring Boot or Quarkus targets, convert Karaf feature XML to standard Maven dependencies.

{{< before-after before="Karaf features XML" after="Catalog-resolved runtime dependencies" id="karaf-maven" >}}

```xml
<features xmlns="http://karaf.apache.org/xmlns/features/v1.4.0">
  <feature name="my-camel-routes" version="1.0">
    <feature>camel-core</feature>
    <feature>camel-http4</feature>
    <feature>camel-jackson</feature>
    <bundle>mvn:com.example/my-routes/1.0</bundle>
  </feature>
</features>
```

<!--after-->

```text
Spring Boot: org.apache.camel.springboot:camel-<component>-starter
Quarkus:     org.apache.camel.quarkus:camel-quarkus-<component>

Exact component artifacts and versions are verified against the selected
runtime catalog before camel-execute writes them to pom.xml.
```

{{< /before-after >}}

For Camel Main, the equivalent dependency coordinates are recorded under `camel.jbang.dependencies` in the module-root `application.properties`; no `pom.xml` is generated.

{{< /carousel >}}

## Red Hat Fuse Detection

Camel-Kit automatically detects Red Hat Fuse-based projects by looking for `redhat-*` or `fuse-*` version qualifiers in Maven dependencies (e.g., `camel-core-2.23.2.fuse-7_11_1-00015`).

For Fuse 6.x or 7.x projects, initialize Camel-Kit in the existing project with the `camel` source-platform hint, then start the migration skill in your AI assistant:

```bash
camel-kit init --here --ai claude --source-platform camel
# Then run /camel-migrate in Claude Code
```

Camel-Kit detects Fuse-specific version qualifiers and the migration skill generates notes for Red Hat-specific features.

## Next Steps

After generating the modernized Camel 4.x code:

1. Review the generated YAML routes and configuration files
2. Update affected Java source from `javax.*` to `jakarta.*`; Camel 4 requires Jakarta EE 10 across target runtimes
3. Test routes locally using `camel run` (JBang) or your target platform's dev mode
4. Consult the [Apache Camel 4.x Migration Guide](https://camel.apache.org/manual/camel-4-migration-guide.html) for additional breaking changes

Camel-Kit handles the most common migration patterns automatically, but complex integrations may require manual adjustments.
