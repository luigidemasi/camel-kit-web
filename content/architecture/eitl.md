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

The full pipeline operates as a continuous feedback loop with a single human decision point:

```
Design ──→ [You approve] ──→ Plan ──→ Probe ──→ Implement ──→ Verify
                                ↑                                 │
                                │         (re-plan if needed)     │
                                └─────────────────────────────────┘
```

**One approval gate.** You approve the design (the architecture, the components, the integration patterns). After that, planning, probing, implementation, and verification flow continuously. If the environment discovers a problem, the system fixes it — either at the code level (self-repair, re-implement) or at the design level (re-plan).

This means:

- **No wasted implementation work** — the probe catches infeasible plans before code is generated
- **No manual test debugging** — test failures route automatically to the right fix target
- **No silent failures** — every error is classified, every fix attempt is tracked, every escalation includes context
- **No stale tests** — when tests are wrong, they're re-generated from the design spec, not manually patched

## What Makes This Different

Most AI coding tools follow a **generate-and-hope** model: produce code, let the developer figure out if it works. Some add a build check at the end. Camel-Kit goes further:

| Aspect | Generate-and-Hope | Camel-Kit EITL |
|--------|-------------------|----------------|
| **When environment is checked** | After all code is generated | Before (probe) and after (verify) |
| **What happens on failure** | User debugs | Auto-fix, re-generate, or re-plan |
| **Test strategy** | Generate tests, never run them | Generate tests, run them, fix them |
| **Feedback to design** | None — design is immutable | Re-plan loop modifies design documents |
| **Service management** | Manual Docker Compose | Testcontainers in self-contained tests |
