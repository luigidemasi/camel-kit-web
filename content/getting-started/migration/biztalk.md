---
title: "BizTalk Migration"
weight: 2
description: "Migrate from Microsoft BizTalk Server to Apache Camel 4.x"
---

## Overview

Migrate from Microsoft BizTalk Server to Apache Camel 4.x using Camel-Kit's automated parsing capabilities. Camel-Kit analyzes BizTalk orchestrations (.odx), pipelines (.btp), schemas (.xsd), maps (.btm), and port binding files to produce migration candidates for Camel YAML routes; unsupported or ambiguous constructs remain explicit for manual review.

**Supported BizTalk versions:** 2004, 2006, 2006 R2, 2009, 2010, 2013, 2013 R2, 2016, 2020.

**Key features:**
- Orchestration (.odx) analysis with 38 recognized shape element names; each recognized shape can be automatic, manual-review, or unsupported for conversion
- Maps (.btm) to canonical DataMapper mappings, rendered as inline Groovy or XSLT by the shared engine-selection rule (45 functoid type mappings)
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

For each BizTalk adapter, the AI proposes a catalog-verified Camel component when a direct mapping exists. Otherwise it records the gap and asks for a target-platform decision.

| BizTalk Adapter | Camel Component | Notes |
|----------------|-----------------|-------|
| FILE | `camel-file` | |
| FTP | `camel-ftp` | |
| FTPS | `camel-ftp` | FTPS protocol |
| SFTP | `camel-ftp` | SFTP protocol |
| HTTP/HTTPS | Receive: catalog-verified target-runtime consumer such as `camel-platform-http`; send: `camel-http` | Direction determines the component |
| SOAP | `camel-cxf-soap` (`cxf:` endpoint scheme) | |
| SQL Server | `camel-sql`, `camel-jdbc` | |
| Oracle Database | `camel-sql`, `camel-jdbc` | |
| IBM Db2 | `camel-sql`, `camel-jdbc` | |
| MSMQ | User decision required | See note below |
| MQ Series | `camel-jms` | With IBM MQ client |
| SMTP | `camel-mail` | |
| POP3/IMAP | `camel-mail` | |
| WCF-BasicHttp | `camel-platform-http`, `camel-cxf-soap` | Direction and SOAP requirements determine the component |
| WCF-WSHttp | `camel-cxf-soap` | `cxf:` endpoint scheme |
| Azure Service Bus | `camel-azure-servicebus` | BizTalk 2016+ |

**Note on MSMQ:** There is no direct Camel equivalent for MSMQ. When encountered, the AI will ask you to choose between ActiveMQ Artemis (`camel-jms`), a runtime- and catalog-verified RabbitMQ component such as `camel-spring-rabbitmq`, or Azure Service Bus (`camel-azure-servicebus`) as the target messaging platform.

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
| Construct Message + Transform | Canonical DataMapper mapping: inline Groovy or `xslt-saxon`, as selected |
| Expression | `process()` or Groovy script |

**Note:** The Suspend Shape is NOT supported. BizTalk dehydration has no Camel equivalent - the AI flags this for manual review.

## Pipeline Mapping

{{< tabs id="pipeline-mapping" >}}

<!--tab Receive Pipeline-->

| Pipeline Component | Camel Pattern |
|-------------------|---------------|
| XML Disassembler | Candidate: split plus the Jackson XML data format with the required POJO/list model; otherwise a generated or custom processor |
| Flat File Disassembler | Candidate: Flatpack with a definition or Bindy with an annotated model; otherwise a custom processor |
| JSON Decoder | JSON/Jackson data format |
| XML Validator | `to("validator:schema.xsd")` |
| MIME Decoder | `unmarshal().mimeMultipart()` (`camel-mail`) |
| S/MIME Decoder | Manual, catalog-verified crypto/mail or custom implementation after certificate and keystore review |

<!--tab Send Pipeline-->

| Pipeline Component | Camel Pattern |
|-------------------|---------------|
| XML Assembler | Candidate: Jackson XML data format with a POJO model; BizTalk envelope assembly may require a generated or custom processor |
| Flat File Assembler | Candidate: Bindy with an annotated model or a generated/custom serializer |
| JSON Encoder | JSON/Jackson data format |
| MIME Encoder | `marshal().mimeMultipart()` (`camel-mail`) |
| S/MIME Encoder | Manual, catalog-verified crypto/mail or custom implementation after certificate and keystore review |

{{< /tabs >}}

## Map & Functoid Conversion

BizTalk maps (.btm) define transformations through visual functoids. Camel-Kit first extracts the complete semantic mapping, then applies the shared DataMapper rule: inline Groovy when both schemas are absent or the mapping has fewer than 20 leaf fields; XSLT only when the mapping has at least 20 leaf fields and at least one schema.

{{< carousel id="biztalk-functoid-patterns" >}}

<!--step Direct Link (field copy)-->
Each direct link contributes a source-to-target field mapping to the complete map; it is not emitted as a separate Simple-expression engine:

```text
source.customerName -> target.customerName
```

<!--step String Concatenate-->
String-concatenation functoids are recorded semantically. When the complete mapping selects XSLT, the rendering uses `concat()`:

```xslt
<xsl:value-of select="concat(firstName, ' ', lastName)"/>
```

<!--step Logical Condition-->
Conditional functoids are recorded as conditional mapping semantics and rendered by the selected Groovy or XSLT engine. A route-level business decision remains a `choice` EIP:

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
C#/VB.NET code and its semantics are preserved and flagged for manual review. When the logic is compatible, the design may suggest an illustrative Groovy replacement like this; otherwise it records a custom-processor action that requires Spring Boot or Quarkus:

```yaml
- script:
    groovy: |
      // MANUAL REVIEW REQUIRED - illustrative compatible replacement
      def calculateDiscount(amount) {
        return amount > 1000 ? amount * 0.1 : 0
      }
      calculateDiscount(body.amount)
```

{{< /carousel >}}

## Example: Order Processing Migration

This example assumes `OrderToInvoiceMap` has at least 20 leaf fields and an available schema, so the canonical engine selection is XSLT; the map is abbreviated below.

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
        - step:
            id: kaoto-datamapper-a1b2c3d4
            steps:
              - to:
                  id: kaoto-datamapper-xslt-a1b2
                  uri: "xslt-saxon:kaoto-datamapper-a1b2c3d4.xsl"
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

- **Scripting functoids** with C#/VB.NET code - preserved for manual review; compatible Groovy may be suggested, otherwise use a custom processor on Spring Boot or Quarkus
- **Custom .NET pipeline components** - no automatic equivalent, requires custom Camel processor
- **MSMQ adapter** - requires replacement decision (ActiveMQ, RabbitMQ, or Azure Service Bus)
- **Suspend Shape** - no Camel equivalent, redesign required
- **EDI Disassembler/Assembler** - select a catalog-verified DFDL or Smooks path from the actual EDI format and schema, then review the mapping manually
- **External assembly calls** in expressions - requires Java/Groovy reimplementation
