---
title: "MuleSoft Migration"
weight: 1
description: "Migrate from MuleSoft Mule 3.x/4.x to Apache Camel 4.x"
---

## Overview

MuleSoft to Apache Camel 4.x is one of the most common migration paths. Camel-Kit understands Mule XML flows, DataWeave 1.x/2.x, connectors, error handling, choice routers, scatter-gather, sub-flows, and flow references.

Key features:

- DataWeave migration through DataMapper, using inline Groovy or XSLT from the canonical engine-selection rules
- Component mapping from Mule connectors to Camel components
- Preservation of error handling semantics
- Flow-ref to `direct:` route conversion

## What Gets Parsed

Camel-Kit analyzes the following MuleSoft artifacts:

| Artifact | Location |
|----------|----------|
| Flow XML | `src/main/mule/` |
| DataWeave scripts | `.dwl` files |
| Connector configurations | XML configs |
| POM dependencies | `pom.xml` |

## Connector Mapping

Camel-Kit maps MuleSoft connectors to their Apache Camel equivalents:

| Mule Connector | Camel Component |
|----------------|-----------------|
| HTTP Listener | Catalog-verified target-runtime HTTP consumer, such as `camel-platform-http` |
| Database | `camel-sql`, `camel-jdbc` |
| File | `camel-file` |
| JMS | `camel-jms` |
| Kafka | `camel-kafka` |
| Salesforce | `camel-salesforce` |
| FTP | `camel-ftp` |
| Email | `camel-mail` |
| VM | `camel-seda` |

Note: If there is no direct equivalent, Camel-Kit flags the connector and suggests alternatives.

## Common Migration Scenarios

{{< carousel id="mule-scenarios" >}}

<!--step HTTP-to-Database-->

A typical HTTP endpoint that queries a database based on URI parameters.

{{< before-after before="Mule XML" after="Camel YAML" id="http-db" >}}

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

Parallel processing pattern that calls multiple services concurrently and aggregates results.

{{< before-after before="Mule XML" after="Camel YAML" id="scatter-gather" >}}

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
    aggregationStrategy: "#class:org.apache.camel.processor.aggregate.GroupedBodyAggregationStrategy"
    steps:
      - to: http://inventory-service/check
      - to: http://pricing-service/price
```

{{< /before-after >}}

<!--step DataWeave to DataMapper-->

DataWeave transformations are migrated through DataMapper. Camel-Kit uses inline Groovy when both schemas are absent or the mapping has fewer than 20 leaf fields; it selects XSLT only when the mapping has at least 20 leaf fields and at least one schema. The excerpt below illustrates part of an XSLT selected for a mapping with at least 20 leaf fields and available schemas; the remaining fields and schemas are omitted for brevity.

{{< before-after before="DataWeave" after="XSLT" id="dataweave-xslt" >}}

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

Mule sub-flows and flow references are converted to Camel direct routes.

{{< before-after before="Mule XML" after="Camel YAML" id="subflow" >}}

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

Conditional routing based on message content.

{{< before-after before="Mule XML" after="Camel YAML" id="choice" >}}

```xml
<choice>
  <when expression="#[payload.amount > 1000]">
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

{{< /carousel >}}
