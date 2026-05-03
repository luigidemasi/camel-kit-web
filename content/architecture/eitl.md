---
title: "Environment-in-the-Loop"
weight: 5
description: "How camel-kit uses the execution environment as a dynamic participant in code generation"
toc: false
---

Code migration tools typically follow a linear path: analyze source code, generate target code, hope it works. When it doesn't — a dependency that won't resolve, a Docker service that won't start, a component that doesn't exist for the target runtime — the developer is left debugging alone. The AI agent finished its job and moved on.

Camel-Kit takes a different approach. The execution environment is not an afterthought — it's a **first-class participant** in the code generation pipeline. Inspired by the [Environment-in-the-Loop](https://arxiv.org/abs/2602.09944) paradigm (Li et al., ReCode '26), camel-kit creates a **closed feedback loop** where environment signals actively drive code refinement.

## The Core Insight

> *"Without automated environment interaction, the automation of code migration is only half complete."*
> — Li et al., ReCode '26

Traditional code generation treats the environment as static: generate code based on specifications, then verify at the end. This approach has three problems:

1. **Late discovery of failures** — dependency conflicts, missing runtime extensions, and service availability issues are only found after significant code has been generated
2. **No automatic recovery** — when the environment rejects the generated code, the AI can't fix it without starting over
3. **Disconnected testing** — test generation happens independently of test execution, so tests are never iteratively refined based on actual runtime behavior

Camel-Kit solves all three by embedding environment interaction at every stage of the pipeline.

## How It Works

The pipeline creates a continuous feedback loop between three concerns: **code generation**, **environment verification**, and **test validation**.

{{< tabs id="eitl-phases" >}}
<!--tab Environment Probe-->

### Before Any Code Is Generated

The first step of `/camel-execute` is an **environment probe** — a lightweight feasibility check that runs before any implementer subagent is dispatched.

The probe generates a **throwaway skeleton** in a temporary directory:
- `pom.xml` with all planned dependencies
- `docker-compose.yaml` with required services
- An empty route (just enough to verify the runtime boots)

Then it runs three checks:

| Check | What It Validates | Command |
|-------|-------------------|---------|
| **Dependency resolution** | All Maven artifacts exist and resolve | `./mvnw dependency:resolve` |
| **Docker services** | Required databases, brokers, etc. can start | `docker compose up -d` |
| **Runtime startup** | The framework itself boots | Runtime-specific start command |

If a check fails, the probe classifies the error:

- **Mechanical failure** (wrong artifact name, port conflict) — auto-fix and re-probe
- **Architectural failure** (component doesn't exist for this runtime) — trigger [automatic re-planning](#automatic-re-planning)

The skeleton is deleted after the probe completes. The real implementation generates proper project files.

<!--tab Verification Loop-->

### After Code Is Generated

The verification loop (`/camel-verify`) runs [Citrus](https://citrusframework.org/) integration tests to validate the generated code against real infrastructure.

**Three phases:**

| Phase | What Happens |
|-------|-------------|
| **Build** | Compile the project (`./mvnw compile`). Classify and fix build errors. Skipped for JBang. |
| **Test** | Run Citrus YAML tests via `camel test run`. Tests are self-contained: [Testcontainers](https://testcontainers.com/) start services, the Camel integration launches within the test, send/receive actions validate behavior. |
| **Report** | Structured summary of phases, fixes applied, and issues found. |

Each phase retries up to 15 times. On each iteration, errors are classified and routed to the appropriate fix:

| Fix Target | When Used |
|-----------|-----------|
| **Self-repair** | Missing dependency, Docker config issue — fix directly |
| **camel-implement** | Route logic error — re-generate from the design spec |
| **camel-validate** | Wrong component options — re-verify against the MCP catalog |
| **camel-test** | Test itself is wrong — re-generate the test from the design spec |
| **re-plan** | Persistent architectural failure — modify the design and re-implement |

<!--tab Re-Planning-->

### When the Approach Is Wrong

Sometimes the problem isn't in the code — it's in the plan. A component that works in isolation might conflict with another, or a runtime extension might not exist for the chosen platform.

When fix attempts fail repeatedly, camel-kit **automatically re-plans**:

1. **Identify the scope** — which design document sections need to change
2. **Find alternatives via MCP** — query the catalog for components that fulfill the same role
3. **Modify the design** — update only the affected sections, preserving everything else
4. **Re-implement and re-verify** — generate new code and run tests again

The re-plan loop runs up to **3 rounds**. If the same failure class persists after a round, it short-circuits immediately rather than trying the same approach again. After 3 rounds, it escalates to the user with a full report of what was tried.

**Two-tier promotion model:**

The system decides *when* to re-plan based on how experienced developers think about errors:

- **Tier 1 (immediate):** After one failed fix, query the MCP catalog. If the catalog confirms the component doesn't exist for this runtime — re-plan immediately. A senior developer would check the docs first, not try 15 random fixes.

- **Tier 2 (progressive):** After three failed fixes on the same error class — the approach is wrong, not just the code. Re-plan.
{{< /tabs >}}

## The Closed Loop

<div style="margin: 2rem 0; overflow-x: auto;">
  <div style="min-width: 750px;">
    <!-- Grid: 11 columns = Design, arrow, Badge, arrow, Plan, arrow, Probe, arrow, Implement, arrow, Verify -->
    <div style="display: grid; grid-template-columns: 100px 30px auto 30px 100px 30px 100px 30px 100px 30px 100px; align-items: center; justify-items: center; gap: 0;">
      <!-- Row 1: boxes and arrows -->
      <div style="background: var(--color-card-bg); border: 2px solid var(--color-accent); border-radius: 12px; text-align: center; width: 100px; height: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="font-size: 1.2rem;">&#128161;</div>
        <div style="font-weight: 600; font-size: 0.85rem; color: var(--color-text-heading);">Design</div>
      </div>
      <div style="color: var(--color-accent); font-weight: bold;">&rarr;</div>
      <div style="background: var(--color-accent); color: white; border-radius: 20px; padding: 0.4rem 0.75rem; font-size: 0.75rem; font-weight: 600; white-space: nowrap;">You approve</div>
      <div style="color: var(--color-accent); font-weight: bold;">&rarr;</div>
      <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; text-align: center; width: 100px; height: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="font-size: 1.2rem;">&#128203;</div>
        <div style="font-weight: 600; font-size: 0.85rem; color: var(--color-text-heading);">Plan</div>
      </div>
      <div style="color: var(--color-accent); font-weight: bold;">&rarr;</div>
      <div style="background: var(--color-card-bg); border: 2px dashed var(--color-accent); border-radius: 12px; text-align: center; width: 100px; height: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="font-size: 1.2rem;">&#128269;</div>
        <div style="font-weight: 600; font-size: 0.85rem; color: var(--color-text-heading);">Probe</div>
      </div>
      <div style="color: var(--color-accent); font-weight: bold;">&rarr;</div>
      <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; text-align: center; width: 100px; height: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="font-size: 1.2rem;">&#9881;&#65039;</div>
        <div style="font-weight: 600; font-size: 0.85rem; color: var(--color-text-heading);">Implement</div>
      </div>
      <div style="color: var(--color-accent); font-weight: bold;">&rarr;</div>
      <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; text-align: center; width: 100px; height: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="font-size: 1.2rem;">&#9989;</div>
        <div style="font-weight: 600; font-size: 0.85rem; color: var(--color-text-heading);">Verify</div>
      </div>
    </div>
    <!-- Row 2: re-plan dashed line spanning from Plan (col 5) to Verify (col 11) -->
    <div style="display: grid; grid-template-columns: 100px 30px auto 30px 100px 30px 100px 30px 100px 30px 100px; gap: 0;">
      <!-- Cols 1-4 empty -->
      <div style="grid-column: 1 / 5;"></div>
      <!-- Cols 5-11: dashed U-shape from Plan center to Verify center -->
      <div style="grid-column: 5 / 12; padding: 0 50px;">
        <div style="border: 2px dashed #e74c3c; border-top: none; border-radius: 0 0 16px 16px; height: 36px; position: relative;">
          <div style="position: absolute; left: -2px; top: -8px; color: #e74c3c; font-size: 0.7rem;">&#9664;</div>
        </div>
      </div>
    </div>
    <!-- Row 3: label -->
    <div style="display: grid; grid-template-columns: 100px 30px auto 30px 100px 30px 100px 30px 100px 30px 100px; gap: 0;">
      <div style="grid-column: 5 / 12; text-align: center; padding-top: 0.25rem;">
        <span style="font-size: 0.8rem; font-weight: 600; color: #e74c3c;">re-plan if architectural failure</span>
      </div>
    </div>
  </div>
</div>

**One approval gate.** You approve the design (the architecture, the components, the integration patterns). After that, planning, probing, implementation, and verification flow continuously. If the environment discovers a problem, the system fixes it — either at the code level (self-repair, re-implement) or at the design level (re-plan).

This means:

- **No wasted implementation work** — the probe catches infeasible plans before code is generated
- **No manual test debugging** — test failures route automatically to the right fix target
- **No silent failures** — every error is classified, every fix attempt is tracked, every escalation includes context
- **No stale tests** — when tests are wrong, they're re-generated from the design spec, not manually patched

## Error Taxonomy

Every error discovered during probing or verification is classified and routed. The classification determines what gets fixed and how.

### Mechanical vs Architectural

The probe and verify loop use an **"assume mechanical, promote on failure"** rule:

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1.5rem 0;">
  <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 1.25rem;">
    <div style="font-weight: 700; color: var(--color-accent); margin-bottom: 0.5rem; font-size: 0.95rem;">Mechanical Errors</div>
    <div style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 0.75rem;">Fixable without changing the plan</div>
    <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.85rem;">
      <li>Wrong Maven artifact name</li>
      <li>Docker port conflict</li>
      <li>Missing transitive dependency</li>
      <li>Docker image tag not found</li>
      <li>Incorrect property key</li>
    </ul>
    <div style="margin-top: 0.75rem; padding: 0.5rem 0.75rem; background: rgba(46, 204, 113, 0.1); border-radius: 8px; font-size: 0.8rem;">
      <strong>Action:</strong> auto-fix and re-probe/re-verify
    </div>
  </div>
  <div style="background: var(--color-card-bg); border: 1px solid #e74c3c; border-radius: 12px; padding: 1.25rem;">
    <div style="font-weight: 700; color: #e74c3c; margin-bottom: 0.5rem; font-size: 0.95rem;">Architectural Errors</div>
    <div style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 0.75rem;">The plan itself is infeasible</div>
    <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.85rem;">
      <li>Component doesn't exist for target runtime</li>
      <li>Irreconcilable dependency conflict</li>
      <li>Component removed in target version</li>
      <li>Private/licensed Docker image</li>
      <li>Incompatible component combination</li>
    </ul>
    <div style="margin-top: 0.75rem; padding: 0.5rem 0.75rem; background: rgba(231, 76, 60, 0.1); border-radius: 8px; font-size: 0.8rem;">
      <strong>Action:</strong> trigger re-plan loop (max 3 rounds)
    </div>
  </div>
</div>

The key insight: **MCP is the oracle** that distinguishes mechanical from architectural. When a dependency fails, the probe queries `camel_catalog_component` — if MCP confirms the component doesn't exist for this runtime/version, it's architectural. If MCP returns a valid artifact with a different name, it's mechanical.

### How Errors Promote

Not every error reveals its nature immediately. The system uses a **two-tier promotion model** that mirrors how experienced developers think:

<div style="margin: 1.5rem 0;">
  <div style="display: flex; gap: 0; flex-direction: column;">
    <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-bottom: none; border-radius: 12px 12px 0 0; padding: 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <div style="font-weight: 700; color: var(--color-accent); font-size: 0.95rem;">Tier 1: Immediate Promotion</div>
        <div style="font-size: 0.75rem; color: var(--color-text-secondary);">0-1 fix attempts</div>
      </div>
      <div style="font-size: 0.85rem; margin-top: 0.5rem;">After <strong>one</strong> failed fix, query the MCP catalog. If it confirms the failure is structural (component missing, extension unavailable), skip further fix attempts and re-plan immediately.</div>
      <div style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--color-text-secondary); font-style: italic;">Like a senior developer who checks the docs first, not tries 15 random fixes.</div>
    </div>
    <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 0 0 12px 12px; padding: 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <div style="font-weight: 700; color: var(--color-accent); font-size: 0.95rem;">Tier 2: Progressive Promotion</div>
        <div style="font-size: 0.75rem; color: var(--color-text-secondary);">3 failed fix attempts</div>
      </div>
      <div style="font-size: 0.85rem; margin-top: 0.5rem;">After <strong>three</strong> failed fixes on the same error class — each with a different strategy — the approach is wrong, not just the code. Promote to re-plan.</div>
      <div style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--color-text-secondary); font-style: italic;">Like a developer who tries fixing the code a few times before questioning the spec.</div>
    </div>
  </div>
</div>

### Fix Routing

Every classified error routes to a specific fix target. The taxonomy covers errors from both the probe (pre-implementation) and the verification loop (post-implementation):

| Error Category | Examples | Fix Target |
|---------------|----------|------------|
| **Missing dependency** | `ClassNotFoundException`, unresolved artifact | Self-repair (add to pom.xml) |
| **Version conflict** | `NoSuchMethodError`, BOM misalignment | Self-repair (align versions) |
| **Wrong component options** | `ResolveEndpointFailedException` | camel-validate (re-verify via MCP) |
| **Route logic error** | `FailedToCreateRouteException`, wrong output | camel-implement (re-generate route) |
| **Test is wrong** | Assertion expects wrong value, test parse error | camel-test (re-generate test) |
| **Docker/service issue** | `Connection refused`, container won't start | Self-repair (restart, fix config) |
| **Architectural** | Component doesn't exist, irreconcilable conflict | Re-plan (modify design, max 3 rounds) |
| **Unresolvable** | Build tool error, Quarkus augmentation failure | Escalate to user |

## What Makes This Different

Most AI coding tools follow a **generate-and-hope** model: produce code, let the developer figure out if it works. Some add a build check at the end. Camel-Kit goes further:

| Aspect | Generate-and-Hope | Camel-Kit EITL |
|--------|-------------------|----------------|
| **When environment is checked** | After all code is generated | Before (probe) and after (verify) |
| **What happens on failure** | User debugs | Auto-fix, re-generate, or re-plan |
| **Test strategy** | Generate tests, never run them | Generate tests, run them, fix them |
| **Feedback to design** | None — design is immutable | Re-plan loop modifies design documents |
| **Service management** | Manual Docker Compose | Testcontainers in self-contained tests |
