---
title: "BizTalk Migration"
weight: 2
description: "Migrate from Microsoft BizTalk Server to Apache Camel 4.x"
---

## Overview

Migrate from Microsoft BizTalk Server to Apache Camel 4.x using Camel-Kit's automated parsing capabilities. Camel-Kit analyzes BizTalk orchestrations (.odx), pipelines (.btp), schemas (.xsd), maps (.btm), and port binding files to produce equivalent Camel YAML routes.

**Supported BizTalk versions:** 2004, 2006, 2006 R2, 2009, 2010, 2013, 2013 R2, 2016, 2020.

**Key features:**
- Orchestration (.odx) to Camel YAML routes with equivalent control flow (37 shape types supported)
- Maps (.btm) to XSLT stylesheets via `camel-xslt-saxon` (45 functoid type mappings)
- Pipelines (.btp) to Camel processor chains
- Port bindings to Camel endpoint configuration
- UTF-16 binding file detection (BizTalk Admin Console exports)

## What Gets Parsed

| Artifact | File Extension | Description |
|----------|---------------|-------------|
| Orchestrations | `.odx` | Business process flows with shapes |
| Maps | `.btm` | Data transformation definitions with functoids |
| Pipelines | `.btp` | Receive and send processing stages |
| Schemas | `.xsd` | Message format definitions |
| Bindings | `.xml` | Port and adapter configurations |

## Adapter Mapping

BizTalk adapters map to corresponding Camel components. The AI automatically selects the appropriate Camel component based on the BizTalk adapter configuration.

| BizTalk Adapter | Camel Component | Notes |
|----------------|-----------------|-------|
| FILE | `camel-file` | |
| FTP | `camel-ftp` | |
| FTPS | `camel-ftp` | FTPS protocol |
| SFTP | `camel-ftp` | SFTP protocol |
| HTTP/HTTPS | `camel-http`, `camel-rest` | |
| SOAP | `camel-cxf` | |
| SQL Server | `camel-sql`, `camel-jdbc` | |
| Oracle Database | `camel-sql`, `camel-jdbc` | |
| IBM Db2 | `camel-sql`, `camel-jdbc` | |
| MSMQ | User decision required | See note below |
| MQ Series | `camel-jms` | With IBM MQ client |
| SMTP | `camel-mail` | |
| POP3/IMAP | `camel-mail` | |
| WCF-BasicHttp | `camel-platform-http`, `camel-cxf` | |
| WCF-WSHttp | `camel-cxf` | |
| Azure Service Bus | `camel-azure-servicebus` | BizTalk 2016+ |

**Note on MSMQ:** There is no direct Camel equivalent for MSMQ. When encountered, the AI will ask you to choose between ActiveMQ Artemis (`camel-jms`), RabbitMQ (`camel-rabbitmq`), or Azure Service Bus (`camel-azure-servicebus`) as the target messaging platform.

## Orchestration Shape Mapping

BizTalk orchestration shapes map to Camel EIPs and route patterns:

| BizTalk Shape | Camel EIP / Pattern |
|--------------|-------------------|
| Receive | `from()` consumer |
| Send | `to()` producer |
| Decide / Switch | `choice` EIP |
| Loop | `loop` EIP |
| ForEach | `split` EIP |
| Parallel Actions | `multicast` with `parallelProcessing(true)` |
| Call Orchestration | `to("direct:...")` |
| Start Orchestration | `wireTap` |
| Scope / Try-Catch | `doTry` / `doCatch` / `doFinally` |
| Delay | `delay` EIP |
| Construct Message + Transform | `to("xslt-saxon:...")` |
| Expression | `process()` or Groovy script |

**Note:** The Suspend Shape is NOT supported. BizTalk dehydration has no Camel equivalent - the AI flags this for manual review.

## Pipeline Mapping

{{< tabs id="pipeline-mapping" >}}

<!--tab Receive Pipeline-->

| Pipeline Component | Camel Pattern |
|-------------------|---------------|
| XML Disassembler | `split()` + `unmarshal().jacksonXml()` |
| Flat File Disassembler | `unmarshal().flatpack()` or `.bindy()` |
| JSON Decoder | `unmarshal().jackson()` |
| XML Validator | `to("validator:schema.xsd")` |
| MIME/SMIME Decoder | `unmarshal().mime()` |

<!--tab Send Pipeline-->

| Pipeline Component | Camel Pattern |
|-------------------|---------------|
| XML Assembler | `marshal().jacksonXml()` or `aggregate()` |
| Flat File Assembler | `marshal().flatpack()` or `.bindy()` |
| JSON Encoder | `marshal().jackson()` |
| MIME/SMIME Encoder | `marshal().mime()` |

{{< /tabs >}}

## Map & Functoid Conversion

BizTalk maps (.btm) contain XSLT-based transformations enhanced with visual functoids. Camel-Kit converts these to XSLT 2.0 stylesheets or Groovy scripts depending on complexity.

{{< carousel id="biztalk-functoid-patterns" >}}

<!--step Direct Link (field copy)-->
Simple field-to-field mapping translates to `setBody` with Simple expression:

```yaml
- setBody:
    simple: "${body.source.customerName}"
```

<!--step String Concatenate-->
Combine multiple fields using XSLT `concat()` function:

```xslt
<xsl:value-of select="concat(firstName, ' ', lastName)"/>
```

<!--step Logical Condition-->
Conditional mapping using `choice` EIP with predicates:

```yaml
- choice:
    when:
      - simple: "${body.status} == 'ACTIVE'"
        steps:
          - setBody:
              simple: "Approved"
    otherwise:
      steps:
        - setBody:
            simple: "Rejected"
```

<!--step Database Lookup-->
External data enrichment via `enrich` EIP with `camel-sql`:

```yaml
- enrich:
    expression:
      constant: "sql:SELECT price FROM products WHERE id = :#${body.productId}"
    aggregationStrategy: "#bean:priceEnricher"
```

<!--step Scripting Functoid (Manual Review)-->
C#/VB.NET code is converted to Groovy script and flagged for manual review:

```yaml
- script:
    groovy: |
      // MANUAL REVIEW REQUIRED - converted from C# scripting functoid
      def calculateDiscount(amount) {
        return amount > 1000 ? amount * 0.1 : 0
      }
      calculateDiscount(body.amount)
```

{{< /carousel >}}

## Example: Order Processing Migration

{{< before-after before="BizTalk Orchestration" after="Camel YAML" id="order-processing-example" >}}

```xml
<ServiceBody>
  <ReceiveShape Name="ReceiveOrder"
    PortName="OrderPort" Operation="SubmitOrder"/>
  <TransformShape Name="MapOrder"
    Map="OrderToInvoiceMap"/>
  <DecisionShape Name="CheckAmount">
    <Branch Expression="OrderAmount > 1000">
      <SendShape Name="SendHighValue"
        PortName="HighValuePort"/>
    </Branch>
    <DefaultBranch>
      <SendShape Name="SendStandard"
        PortName="StandardPort"/>
    </DefaultBranch>
  </DecisionShape>
</ServiceBody>
```

<!--after-->

```yaml
- route:
    id: process-order
    from:
      uri: "platform-http:/api/orders"
      parameters:
        httpMethodRestrict: POST
      steps:
        - to: "xslt-saxon:transforms/order-to-invoice.xslt"
        - choice:
            when:
              - simple: "${body.amount} > 1000"
                steps:
                  - to: "direct:high-value-processing"
            otherwise:
              steps:
                - to: "direct:standard-processing"
```

{{< /before-after >}}

## Features Requiring Manual Review

The AI flags the following items for manual review during migration:

- **Scripting functoids** with C#/VB.NET code - converted to Groovy but requires validation
- **Custom .NET pipeline components** - no automatic equivalent, requires custom Camel processor
- **MSMQ adapter** - requires replacement decision (ActiveMQ, RabbitMQ, or Azure Service Bus)
- **Suspend Shape** - no Camel equivalent, redesign required
- **EDI Disassembler/Assembler** - use `camel-edi` or `camel-edifact` with custom mapping
- **External assembly calls** in expressions - requires Java/Groovy reimplementation
