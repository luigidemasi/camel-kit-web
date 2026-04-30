---
title: "Camel 2.x/3.x Upgrade"
weight: 3
description: "Modernize Apache Camel 2.x/3.x projects to Camel 4.x YAML DSL"
---

## Overview

Camel-Kit helps you modernize legacy Apache Camel 2.x/3.x projects to Camel 4.x with YAML DSL, including projects based on Red Hat Fuse 6.x/7.x. The AI assistant analyzes your existing routes, configuration, and deployment artifacts, then generates updated code following Camel 4.x best practices.

Key transformations handled by Camel-Kit:

- **XML DSL to YAML DSL** — Spring XML and Blueprint XML routes converted to modern YAML syntax
- **Deprecated components** — Automatic replacement with Camel 4.x equivalents
- **OSGi Blueprint to configuration files** — Blueprint service definitions migrated to `application.properties` or `application.yaml`
- **Karaf features to Maven dependencies** — OSGi feature bundles converted to standard Maven dependencies
- **Platform modernization** — Migration paths from Karaf/OSGi to Spring Boot or Quarkus

## What Gets Parsed

Camel-Kit analyzes the following artifacts from your Camel 2.x/3.x project:

| Artifact | Description |
|----------|-------------|
| Camel Context XML (Spring/Blueprint) | Route definitions, endpoint configurations, error handlers |
| Java DSL routes (RouteBuilder) | Programmatic route definitions |
| Properties files | Configuration properties, endpoint URIs, credentials |
| Blueprint XML | OSGi service wiring, bean definitions |
| Karaf features | Dependency bundles, OSGi feature declarations |
| fabric8 descriptors | Container metadata, deployment configuration |

The AI assistant parses all these artifacts together to understand the complete application structure before generating the modernized output.

## Deprecated Component Updates

Several Camel components were renamed, consolidated, or removed in Camel 4.x. Camel-Kit automatically updates component references to their modern equivalents:

| Old Component (2.x/3.x) | New Component (4.x) |
|-------------------------|---------------------|
| `camel-http4` | `camel-http` |
| `camel-jetty9` | `camel-jetty` |
| `camel-netty4` | `camel-netty` |
| `camel-netty4-http` | `camel-netty-http` |
| `camel-activemq` | `camel-jms` (with ActiveMQ client) |
| `camel-mina2` | `camel-mina` |
| `camel-quartz2` | `camel-quartz` |
| `camel-rxjava2` | Removed (use Camel reactive streams) |
| `camel-mongodb3` | `camel-mongodb` |
| `camel-hdfs2` | `camel-hdfs` |

The AI will also flag components that have been fully removed and suggest modern alternatives.

## Platform Migration Paths

### Karaf/Blueprint → Spring Boot or Quarkus

For projects running on Apache Karaf or Red Hat Fuse Karaf distributions:

- **OSGi Blueprint** (`<blueprint>` XML) is replaced with `application.properties` or `application.yaml` configuration files
- **Karaf features** (feature XML files) are converted to standard Maven `<dependency>` declarations in `pom.xml`
- **OSGi service injection** (`<reference>` tags) is replaced with CDI beans (Quarkus) or Spring dependency injection (Spring Boot)

The AI will ask which target platform you prefer (Spring Boot or Quarkus) and generate the appropriate configuration.

### Spring XML → YAML DSL

For projects using Spring XML-based Camel configuration:

- **`<camelContext>` and `<route>` elements** are converted to `.camel.yaml` route files
- **`<bean>` definitions** are migrated to CDI beans (Quarkus) or Spring `@Component` classes (Spring Boot)
- **`<endpoint>` declarations** are converted to inline URIs within routes

Bean references are preserved using the same bean IDs in the target platform's dependency injection framework.

### Java DSL → YAML DSL (Optional)

Camel-Kit can optionally convert Java DSL `RouteBuilder` classes to YAML route files. However, Java DSL is still fully supported in Camel 4.x, so this conversion is not always necessary or desired.

The AI assistant will ask whether you want to:
- **Keep Java DSL routes** (recommended for complex logic, dynamic routing, or heavy use of processors)
- **Convert to YAML DSL** (recommended for simple declarative routes)

You can mix both approaches in the same project.

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

Migrate OSGi Blueprint bean definitions and routes to Spring Boot/Quarkus configuration.

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

**application.properties:**

```properties
camel.component.sql.data-source=#class:org.apache.commons.dbcp2.BasicDataSource
camel.component.sql.data-source.url=jdbc:postgresql://localhost/orders
camel.component.sql.data-source.username=dbuser
```

**route.camel.yaml:**

```yaml
- route:
    id: order-poll
    from:
      uri: "timer:tick?period=5000"
      steps:
        - to: "sql:SELECT * FROM orders"
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
      uri: "jetty:http://0.0.0.0:8080/api"
      steps:
        - to: "jms:queue:orders"
```

**pom.xml** (add JMS client dependency):

```xml
<dependency>
  <groupId>org.apache.activemq</groupId>
  <artifactId>artemis-jakarta-client</artifactId>
</dependency>
```

{{< /before-after >}}

<!--step Karaf Features to Maven-->

Convert Karaf feature XML to standard Maven dependencies.

{{< before-after before="Karaf features XML" after="Maven pom.xml" id="karaf-maven" >}}

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

```xml
<dependencies>
  <dependency>
    <groupId>org.apache.camel</groupId>
    <artifactId>camel-core</artifactId>
  </dependency>
  <dependency>
    <groupId>org.apache.camel</groupId>
    <artifactId>camel-http</artifactId>
  </dependency>
  <dependency>
    <groupId>org.apache.camel</groupId>
    <artifactId>camel-jackson</artifactId>
  </dependency>
</dependencies>
```

{{< /before-after >}}

{{< /carousel >}}

## Red Hat Fuse Detection

Camel-Kit automatically detects Red Hat Fuse-based projects by looking for `redhat-*` or `fuse-*` version qualifiers in Maven dependencies (e.g., `camel-core-2.23.2.fuse-7_11_1-00015`).

For Fuse 6.x or 7.x projects, you can explicitly specify the source platform:

```bash
camel-kit migrate --source-platform fuse
```

This ensures the AI uses Fuse-specific component mappings and generates migration notes for Red Hat-specific features.

## Next Steps

After generating the modernized Camel 4.x code:

1. Review the generated YAML routes and configuration files
2. Update any custom processors or beans to use Jakarta EE APIs (if migrating to Quarkus)
3. Test routes locally using `camel run` (JBang) or your target platform's dev mode
4. Consult the [Apache Camel 4.x Migration Guide](https://camel.apache.org/manual/camel-4-migration-guide.html) for additional breaking changes

Camel-Kit handles the most common migration patterns automatically, but complex integrations may require manual adjustments.
