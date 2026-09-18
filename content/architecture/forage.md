---
title: "Forage Configuration Catalog"
weight: 6
description: "Catalog-verified infrastructure beans without hand-written wiring"
toc: false
---

Forage (`io.kaoto.forage`) creates infrastructure beans from `forage.<name>.<domain>.*` properties and registers each bean in Camel as `#<name>`. Camel-Kit uses only purpose-specific cached-catalog fields after validating the configured Forage version, cache path/schema, factory or property identity, and runtime coordinate. Catalog prose never directs actions.

## Availability and Version Streams

`camel-kit init` records `forage.version` and caches the matching catalogs under `.camel-kit/.cache/forage/{version}/`. If no version is mapped or the cache is absent, Camel-Kit skips the Forage rung instead of inventing configuration.

| Runtime / Camel version | Forage version |
|-------------------------|----------------|
| Camel Main / Spring Boot 4.22.0 | 1.6.0 |
| Camel Main / Spring Boot 4.18.4 | 1.4.1 |
| Camel Quarkus 4.18.3 | 1.4.0 |
| Unmapped streams | Forage unavailable; use the next configuration rung |

The version mappings in `distribution.properties` are authoritative.

## Configuration Ladder

For every datasource, connection factory, AI service, CXF endpoint, or other infrastructure need, Camel-Kit stops at the first supported option:

1. **Forage catalog coverage** — emit catalog-verified `forage.*` properties and reference the registered bean as `#<name>`.
2. **Camel component properties** — use `camel.component.<scheme>.*` scalar properties verified by Camel MCP.
3. **Custom bean** — when the first two rungs cannot construct the required object, prefer verified declarative bean configuration, with a one-line reason comment explaining why those rungs do not apply.

Example datasource:

```properties
forage.myDb.jdbc.db.kind=postgresql
forage.myDb.jdbc.url=jdbc:postgresql://{{db.host}}:{{db.port}}/{{db.name}}
forage.myDb.jdbc.username={{db.username}}
forage.myDb.jdbc.password={{db.password}}
```

A route can then use `sql:...?dataSource=#myDb`.

## Custom Bean Construction

Camel-Kit prefers constructors and properties, factory methods or factory beans, and supported builders before using
an initialization script. It verifies support against the project's Camel runtime and library versions, including
argument conversions and lifecycle methods. Existing supported `camel.beans.*` declarations can stay in properties;
YAML `beans` can express factory construction without a scripting dependency.

For example, when the configured versions support the InfluxDB client factory and Camel's token conversion:

```yaml
- beans:
    # Custom bean: verified Forage/component configuration cannot construct this client.
    - name: influxDbClient
      type: com.influxdb.client.InfluxDBClient
      factoryBean: com.influxdb.client.InfluxDBClientFactory
      factoryMethod: create
      constructors:
        0: "{{influxdb.url}}"
        1: "{{influxdb.token}}"
        2: "{{influxdb.org}}"
        3: "{{influxdb.bucket}}"
      destroyMethod: close
```

Here `constructors` supplies the static factory's arguments, and Camel converts the token to `char[]`. Connection
values stay in external configuration. The factory class does not need a no-argument constructor.

Scripts remain available when the verified API requires initialization that declarative configuration cannot express.
The generated bean must explain that limitation. Generation and review report missing verification as a concern;
they do not treat a failed lookup as proof that scripting is necessary. Review flags an unnecessary script only when
the replacement is verified. This preference concerns bean creation, so message transformations and DataMapper
engine selection are unchanged.

## Catalog Checks

The cache contains `forage-catalog.json` for factories, component coverage, bean kinds, and runtime GAVs, plus `forage-configuration-catalog.json` for property names and types. Skills query only the needed slice:

```bash
CACHE=.camel-kit/.cache/forage/${FORAGE_VERSION}

# Factory and bean-kind coverage
jq -r '.factories[] | .name + ": " + ([.beansByFeature[]?.beans[]?.name] | join(", "))' "$CACHE/forage-catalog.json"

# Components served by each factory
jq -r '.factories[] | .name + " -> " + (.components | join(", "))' "$CACHE/forage-catalog.json"

# Runtime dependency for a factory
jq -r '.factories[] | select(.name=="DataSource") | .variants.base.gav' "$CACHE/forage-catalog.json"

# Property keys for a module
jq -r '.modules[] | select(.artifactId=="forage-jdbc-common") | .configEntries[].name' "$CACHE/forage-configuration-catalog.json"
```

Named-bean keys are normalized to the catalog's default-bean form before validation: `forage.myDb.jdbc.url` is checked as `forage.jdbc.url`. An unknown `forage.*` key, or an unexplained hand-wired bean with a Forage equivalent, fails `/camel-validate`; a hand-wired bean with only a scalar component-property alternative produces a warning.
