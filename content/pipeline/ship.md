---
title: "Ship Workflow"
weight: 7
description: "camel-kit ship — a local controller-owned run from requirements to published code"
---

## Overview

Ship is a local workflow controller. The command `camel-kit ship` starts, inspects, resumes, or aborts a Ship run on your machine. A plugin built from current `0.3.2-SNAPSHOT` source exposes the equivalent `camel kit ship` form; published stable `0.3.1` exposes only `camel kit init`. One run takes an integration from requirements to published code through five controller-owned stages: discovery, design, plan, execute, and validate.

The harness entry points — `/camel-ship`, `$camel-ship`, and `/skill:camel-ship` — are thin delegates. They forward your options to the registered CLI command once and return its output. The AI agent does not orchestrate the workflow: the local controller is the sole owner of stages, run state, oversight, evidence, publication, and recovery.

Ship is a local orchestrator, not a daemon, a secrets service, a hostile-process sandbox, or a release-attestation system. Provider credentials stay with the worker — the AI process the controller launches for each stage — and provider tooling; Ship does not persist them or include them in command arguments, logs, reports, or project artifacts.

## When to Use

Run Ship when you:

- Want one resumable run from requirements to validated, published code
- Need to resume an interrupted run by its run ID
- Already have an approved manual design spec and want the controller to start at planning

During a normal Ship run you never invoke `/camel-brainstorm`, `/camel-plan`, `/camel-execute`, or `/camel-validate` yourself — the controller drives its own stages.

**Manual alternative:** If you prefer the prompt-owned workflow or need to enter at a known stage, use `/camel-start` or invoke that stage directly. After the design approval, a chained manual run continues through downstream stages automatically.

## Command and Options

```
camel-kit ship [--text TEXT]... [--document PATH]... [--ask always|smart|never] [--start-from STAGE]
camel-kit ship --resume RUN_ID | --status RUN_ID | --abort RUN_ID
```

Initial context is optional: a bare `camel-kit ship` starts a short discovery conversation. You can pass text, one or more documents, or both — a requirements document is never mandatory. Supplied material is included in discovery input before any questions, and the worker reports only grouped unresolved questions.

### Context and lifecycle

| Option | Description |
|---|---|
| `--text TEXT` | Add text context (repeatable) |
| `--document PATH` | Add document context (repeatable) |
| `--ask POLICY` | Oversight policy: `always`, `smart`, or `never` (default `smart`); valid when starting a run, including with `--start-from` — not with `--resume`, `--status`, or `--abort` |
| `--resume RUN_ID` | Resume an existing run |
| `--status RUN_ID` | Show an existing run |
| `--abort RUN_ID` | Abort an existing run |
| `--start-from STAGE` | Start a new run at `discovery`, `design`, or `plan` |

`--resume`, `--status`, `--abort`, and `--start-from` are mutually exclusive — at most one per invocation. `--text` and `--document` are valid when starting or resuming a run, not with `--status` or `--abort`.

### Runtime and configuration

| Option | Default | Description |
|---|---|---|
| `--pi PATH` | discovered on `PATH` | Pi executable |
| `--node PATH` | discovered on `PATH` | Node executable |
| `--maven-repository PATH` | under the Ship state directory | Private Maven repository for validation catalogs |
| `--stage-timeout DURATION` | `10m` | Time limit for one stage attempt, like `90s`, `10m`, or `1h` |
| `--accept-experimental` | off | Accept an experimental Pi or Node version after its warning |
| `-c`, `--config PATH` | `~/.camel-kit/config.properties` | Config properties file |
| `-p`, `--property KEY=VALUE` | none | Override a config property (repeatable) |

Runtime and config options apply when starting or resuming a run, not with `--status` or `--abort`. Repeat the same `-c`/`-p` options when resuming a run that used overrides.

## The Stages

A run moves through five stages; PAUSED, FAILED, and ABORTED are run outcomes, and a fully published run ends COMPLETED.

{{< carousel id="ship-run-stages" >}}
<!--step Discovery-->
## Discovery

The controller gathers requirements. With no initial context it starts a short discovery conversation; supplied `--text` and `--document` material is included in the discovery input before any questions, and open points come back as grouped unresolved questions rather than one-at-a-time prompts.

Discovery is read-only for your application source.

<!--step Design-->
## Design

The controller produces a design for the integration from the discovery output. Design is read-only for your application source.

<!--step Plan-->
## Plan

The controller decomposes the approved design into an implementation plan. Plan is read-only for your application source. Under the default `smart` oversight, the run pauses after this stage — before any implementation work.

<!--step Execute-->
## Execute

Implementation happens in a controller-owned staging copy of the project, prepared from a baseline snapshot — the live project is not modified during this stage. Changed files containing known secrets from the environment are rejected.

<!--step Validate-->
## Validate

Validation is owned by the controller and deterministic — no worker prose decides the outcome. The controller runs required checks covering route and artifact policy, Camel catalog and schema validation, dependency and runtime consistency, direct JVM YAML validation, Camel Main resolution and startup, and discovery and execution of required Citrus tests. Evidence commands run in a separate JVM launched by the controller with a pinned, controller-resolved classpath, a scrubbed environment, and a frozen read-only copy of the accepted project tree. In-memory stubs prevent application endpoints from performing external I/O, but initial catalog and validation-payload resolution can still download artifacts from Maven Central; this is not an OS-level network sandbox.

<!--step Stamp and publication-->
## Stamp and Publication

The result of validation is the Stamp: a local run report with a pass or fail status derived from the required checks. A failed mandatory check fails the run under every oversight policy — there is no waiver flow.

After validation and the configured approval gates, the controller publishes the staged changes to the live project.
{{< /carousel >}}

## Oversight Modes

The `--ask` policy controls where the controller pauses for approval:

{{< tabs id="ship-oversight" >}}
<!--tab always — Full Control-->

**Best for:** First-time users and critical integrations.

The run pauses for approval after design, plan, execute, and validate — including a final approval before publication. Material ambiguity reported by a stage also pauses the run.

<!--tab smart — Contextual (Default)-->

**Best for:** Day-to-day use.

The run pauses after plan (before any implementation) and after execute. Material ambiguity reported by a stage pauses the run. A fully passing validation proceeds to guarded publication without a further pause.

<!--tab never — Minimal Pauses-->

**Best for:** Well-understood integrations where you accept recorded defaults.

The controller may choose and record reasonable defaults instead of pausing. It still stops for missing tools, failed mandatory checks, or actions requiring authority you did not grant — `never` does not publish unconditionally, and a failed mandatory validation check fails the run.

{{< /tabs >}}

## Run State, Status, and Resume

Ship run state lives outside your project, under the first of:

1. `$CAMEL_KIT_SHIP_STATE_HOME`
2. `$XDG_STATE_HOME/camel-kit/ship`
3. `~/.local/state/camel-kit/ship`

Each run has an ID (shown when the run starts and in every summary). `.camel-kit/pipeline.json` in the project is only the manual-mode active-pipeline pointer — Ship never stores run state there.

### Status and abort

```
camel-kit ship --status <run-id>
camel-kit ship --abort <run-id>
```

`--status` prints the run, its stage, oversight policy, any pause report, and the next actionable command. `--abort` ends the run; aborted runs cannot be resumed.

### Resume

```
camel-kit ship --resume <run-id>
camel-kit ship --resume <run-id> --text "Use eu-west-1"
```

Resume re-reads the recorded context and every completed stage's artifacts, compares digests, and restarts the earliest stale or incomplete stage; later stages are reset and re-run. Any upstream change invalidates everything downstream — resuming is safe after your own edits because the controller detects them.

Context (`--text`/`--document`) can be added only while a run is paused. Adding context to a run paused after validation restarts it from discovery and discards the validation Stamp — the command warns you first.

If the Ship process is interrupted, the next invocation reports the latest durable run state. The next locked mutation attempts recovery of an interrupted publication from its journal before proceeding; status alone does not perform recovery, and a partial rollback can require manual resolution.

### Start from existing artifacts

```
camel-kit ship --start-from plan
```

`--start-from` starts a new run at `discovery`, `design`, or `plan`:

- `discovery` — no imported-artifact prerequisite (same as a bare start); the normal Linux, Pi, and Node Ship prerequisites still apply
- `design` — requires `--text` or `--document` context and a manual-mode `.camel-kit/pipeline.json` with a non-null `activePipeline`
- `plan` — requires the same non-null `activePipeline`, imports that pipeline's approved `docs/camel-kit/<pipeline-id>/design-spec.md`, and starts the controller at planning

An existing `implementation-plan.md`, execution report, or validation report cannot be imported into Ship. Starting from `execute` or `validate` is unsupported because those stages require the controller's own generated plan and Pi evidence; start from `plan` and let the controller regenerate downstream artifacts.

## Evidence and the Stamp

The controller — not worker prose — decides whether required checks ran. For each validation command it records:

- The executable (absolute path) and its version
- The arguments, with secrets redacted
- Exit status, timing, and whether the command timed out
- Retained stdout/stderr logs with their digests

The Stamp is a local run report with a pass or fail status derived from those required checks. It describes what ran on this machine. It is not a signed attestation or a certification, and Ship does not certify the exact OS, architecture, or package tree of the tools it detected — it reports their versions.

## Publication and Recovery

Accepted changes reach the live project only after the configured approval and validation gates. Before applying anything, the controller re-verifies every completed stage exactly as recorded and re-checks that the live project has not changed; a changed live tree stops publication and asks you to resume the run. The apply itself is journaled: if it is interrupted, the next locked mutating Ship operation attempts rollback before proceeding. Recovery can stop for manual resolution if it cannot restore every path safely.

Ordinary process interruption is recoverable with the run ID, but Ship is not a daemon and not a guarantee against OS or power loss. It assumes the invoking OS account is trusted: it is not a hostile same-user sandbox, credential broker, or long-lived service.

## Worker Requirements and Support Tiers

The first Ship worker is Pi on Linux. Ship targets Camel Main at the configured `camel.main.version`. Resolution order is a CLI `-p camel.main.version=...` override, the `-c` file or default `~/.camel-kit/config.properties`, then the bundled distribution default; a valid override may select another supported value. Ship uses YAML DSL, Simple expressions, no Java artifacts, and a required Citrus test for every route. It requires:

- A Linux host
- Pi and Node executables (discovered on `PATH`, or set with `--pi`/`--node`)
- Outbound access to Maven Central for catalog and validation-payload resolution

Harness and runtime compatibility is reported in tiers:

| Tier | Meaning |
|---|---|
| Supported | A maintained configuration covered by a live end-to-end test |
| Experimental | Unverified; allowed to attempt a run only with `--accept-experimental` |
| Incompatible | A required capability is known absent |
| Untested | No current result |

The certified Pi versions are `0.84.2` and `0.83.0`, with Node `22.22.2`, pinned in the bundled distribution; `0.84.2` is the primary install target — user configuration cannot promote another version to supported. Any other detected Pi or Node version is labeled experimental with an explicit warning, and the stage refuses to start until you pass `--accept-experimental`. Pi `0.80.3` is incompatible: it lacks a required capability and is rejected outright. Missing or broken executables fail with install guidance.

Both certified configurations — Pi `0.84.2` and Pi `0.83.0`, each with Node `22.22.2` — completed authenticated live-gate runs through the registered `camel-kit ship` entry point on 2026-08-19, with passing Stamps covering all mandatory checks. Ship reports the harness and runtime versions it detects, but does not snapshot or certify their package closure.

### Maintainer live gate

The live gate is a manual, maintainer-run test — not a CI default and not something end users run. Maintainers opt in by setting `CAMEL_KIT_SHIP_LIVE_PI` and `CAMEL_KIT_SHIP_LIVE_NODE` to absolute paths of the maintained versions and building with the `linux-ship-certification` profile. Release certification also includes one authenticated run through the registered `camel-kit ship` entry point or the current-source plugin's `camel kit ship` form.

## Harness Commands and Migration

The harness-native commands are thin wrappers around the local CLI command — none of them implements a second workflow:

- **Claude Code, Gemini CLI, Qwen Code, OpenCode, IBM Bob, IBM Bob 2** generate a `/camel-ship` command stub that forwards your options to the registered command once. Gemini and Qwen interpolate arguments directly; Bob and Bob 2 forward the options in prose because their command format only supports positional placeholders.
- **Codex and GitHub Copilot CLI** expose Ship through their native skills (`$camel-ship`, `.github/skills/`) — no generated command files.
- **Pi** exposes Ship only through `/skill:camel-ship`. There is deliberately no Pi `/camel-ship` prompt, because Pi's prompt-file argument expansion flattens quoted option values.

### Upgrading from the old harness commands

Earlier releases shipped `/camel-ship` as a prompt-owned workflow that the AI agent orchestrated itself, with state in `.camel-kit`. That design is retired. To move an existing workspace to the thin delegates:

1. Back up or commit any customizations to generated assets — the next step rewrites them.
2. Re-initialize with the same agent: `camel-kit init --here --ai <same-agent> --force` (or use `camel kit init ...` from a current-source plugin). Re-initialization also removes the obsolete Ship guides, harness traits, and Bob 2 Ship mode and rule assets.
3. If the workspace has a pre-controller `.camel-kit/ship-state.json`, or a `.camel-kit/pipeline.json` not in manual mode, archive it outside the project — Ship fails closed on that state and leaves it unchanged. Old runs are not resumable by the controller. Manual-mode `pipeline.json` stays supported for the standalone skills and `--start-from` imports.

Initialization aborts if a managed agent directory (such as `.claude` or `.bob`) is a symbolic link — replace the link with a real directory first.

## Usage Examples

{{< tabs id="ship-usage" >}}
<!--tab Start a run-->

```
# No context: start with a short discovery conversation
camel-kit ship

# Text context
camel-kit ship --text "Consume Kafka orders and send them to Salesforce"

# Document context
camel-kit ship --document requirements.md

# Combined
camel-kit ship --document requirements.md --text "Prefer YAML and Simple; no Java"
```

<!--tab Oversight-->

```
# Pause at every approval point
camel-kit ship --document requirements.md --ask always

# Record reasonable defaults; still stop on missing tools,
# failed mandatory checks, or ungranted authority
camel-kit ship --document requirements.md --ask never
```

<!--tab Resume and inspect-->

```
# Continue an interrupted or paused run
camel-kit ship --resume <run-id>

# Answer an open question while resuming
camel-kit ship --resume <run-id> --text "Use eu-west-1"

# Inspect or end a run
camel-kit ship --status <run-id>
camel-kit ship --abort <run-id>
```

<!--tab Start from a design-->

```
# An approved design-spec.md already exists for the active pipeline
camel-kit ship --start-from plan
```

{{< /tabs >}}

## Comparison: Ship vs Manual Pipeline

| Aspect | Manual Pipeline | `camel-kit ship --ask smart` | `camel-kit ship --ask never` |
|--------|----------------|------------------------------|------------------------------|
| **Entry point** | `/camel-start` or a known stage | `camel-kit ship` (or `/camel-ship`) | `camel-kit ship --ask never` |
| **Who runs the stages** | AI agent; chained stages hand off automatically | Local controller | Local controller |
| **Approval gates** | One required design approval | After plan and execute, plus material ambiguity | None, but missing tools, failed mandatory checks, and ungranted authority still stop the run |
| **Resume** | No controller run ID; re-enter from on-disk artifacts | Yes (`--resume <run-id>`) | Yes (`--resume <run-id>`) |
| **Where code changes happen** | Working tree | Staged workspace, published after gates | Staged workspace, published after gates |
| **Best for** | Learning, exploration | Day-to-day use | Well-understood integrations |

## What's Next

- [Skill Router](../start/) — Manual entry point for step-by-step pipeline control
- [/camel-brainstorm](../brainstorm/) — The manual design interview
- [Skills System](../../architecture/skills/) — How skills and command stubs are generated per agent
- [Command Reference](../../reference/commands/) — Full command and option reference
