---
title: Command Reference
weight: 1
---

Camel-Kit provides both CLI commands for project initialization and skills for use within your AI coding assistant. `/camel-start` is the generated entry point on slash-command targets; OpenAI Codex CLI invokes the same router as `$camel-start` from `/skills`.

## Pipeline Commands

{{< carousel id="pipeline-cmds" >}}
<!--step /camel-brainstorm — Design Stage-->

Design an integration through an AI-guided interview. This is **Stage 1** of the greenfield pipeline; `/camel-start` is the routing entry point for Camel-Kit work.

**When to use:** Any new integration, connecting systems, building data pipelines, or starting migration projects.

**Process:**

1. Detects project type (greenfield or migration)
2. Runs a Socratic interview: business purpose, systems, data formats, processing, error handling, performance
3. Verifies all components via MCP catalog (Iron Law 1)
4. Produces a formal Design Specification
5. Stops after approval when invoked directly, or returns control to the orchestrator

**Output:** `docs/camel-kit/<pipeline-id>/design-spec.md`


<!--step /camel-plan — Planning Stage-->

Generate an implementation plan from an approved design spec. This is **Stage 2** of the pipeline.

**Process:**

1. Reads the approved design spec
2. Decomposes into implementation tasks with acceptance criteria
3. Runs wave analysis to identify parallelizable tasks
4. Specifies two-stage review per task (spec compliance then quality)
5. Continues to `/camel-execute` when running inside an orchestrated pipeline

**Output:** `docs/camel-kit/<pipeline-id>/implementation-plan.md`

**Key rule:** The plan is a recipe, not the meal — it describes WHAT to generate, not the generated code itself.


<!--step /camel-execute — Execution Stage-->

Execute the implementation plan with orchestrated task dispatch. This is **Stage 3** of the pipeline.

**Process:**

1. Analyzes plan for parallel execution waves
2. For each task: implement → spec compliance review → code quality review
3. Loads internal skills as needed (`camel-implement`, `camel-test`, `camel-verify`)
4. Runs internal runtime verification, then transitions to `/camel-validate`

**Generated artifacts:**
- `.camel.yaml` routes
- `application.properties`
- `docker-compose.yaml`
- DataMapper files (XSLT/Groovy)
- Citrus test definitions
- Execution report


<!--step /camel-validate — Validation Stage-->

Run static quality analysis after execution. This final pipeline stage validates routes for correctness, security, and constitution compliance and produces a timestamped report.

**Validation categories:**
- Schema and endpoint verification
- Configuration validation
- Quality and anti-pattern checks
- Security analysis
- Constitution compliance (all 8 rules)

**Output:** `docs/camel-kit/<pipeline-id>/validation-report.md`

{{< /carousel >}}

## Entry Point Commands

{{< carousel id="entry-cmds" >}}
<!--step /camel-start — Skill Router-->

The single entry point for integration work. It inspects the request and routes to the right pipeline stage or utility.

Use `/camel-start` when you are unsure which skill to invoke. New work routes to `/camel-brainstorm`; migrations, approved designs, approved plans, validation, and debugging route directly to their matching skills.


<!--step /camel-migrate — Migration-->

Migration-specific discovery and design for existing integrations.

**Supported source platforms:**

| Platform | Versions | Detection |
|----------|---------|-----------|
| MuleSoft Mule | 3.x, 4.x | XML namespace, pom.xml groupId |
| Microsoft BizTalk | - | `.odx`, `.btm`, `.btp`, BizTalk namespace |
| JBoss Fuse | 6.x, 7.x | Fuse BOM, Blueprint XML |
| Apache Camel | 2.x, 3.x | camel-context.xml, Spring XML, Blueprint |

**Features:**
- Auto-detect source vendor
- Graph-based flow analysis
- DataWeave and BizTalk map parsing
- Flow-by-flow incremental migration

{{< /carousel >}}

## Standalone Commands

{{< carousel id="standalone-cmds" >}}
<!--step /camel-knowledge — Docs-->

Look up Apache Camel documentation, component details, CVEs, migration guides, release notes, and JIRA issues via MCP tools.

**MCP Tools:**
- `camel_docs_search` — general documentation search
- `camel_docs_component_info` — component information + CVE lookup
- `camel_docs_cve_search` — security advisory search
- `camel_docs_release_info` — release notes
- `camel_docs_jira_lookup` — JIRA issue lookup

<!--step /camel-debug — Troubleshooting-->

Diagnose and repair broken routes outside an active pipeline run with a strict **STOP → PRESERVE → DIAGNOSE → FIX → GUARD** sequence.

Use it for startup failures, runtime exceptions, or incorrect behavior. Build and test failures during pipeline execution remain part of the internal `camel-verify` loop.

<!--step /camel-ship — Ship Delegate-->

Delegate a Ship run to the local workflow controller. `/camel-ship` is a thin wrapper: it runs the registered `camel-kit ship` (or `camel kit ship`) command once with the options you supply, adds no defaults, and returns the command output. The local controller — not the agent — owns Ship stages, run state, oversight, evidence, and guarded publication. No harness command implements a second workflow.

**Per-harness surfaces:**

| Harness | Surface |
|---------|---------|
| Claude Code, Gemini CLI, Qwen Code, OpenCode | Generated `/camel-ship` stub that interpolates your arguments into the CLI invocation |
| IBM Bob / Bob 2 | Generated stub that forwards the supplied options in prose (Bob documents only positional placeholders) |
| Pi | `/skill:camel-ship` only — no `/camel-ship` prompt is generated, because Pi's prompt-file argument expansion flattens quoted option values |
| OpenAI Codex CLI, GitHub Copilot CLI | Native skills only (`$camel-ship`, `.github/skills/`) — no generated command files |

**Upgrading from the prompt-owned Ship:** earlier releases generated an agent-orchestrated Ship workflow. After upgrading, regenerate the workspace with `camel-kit init --here --ai <same-agent> --force` (or `camel kit init ...`); `--force` rewrites generated assets, so commit or back up customizations first. Re-initialization removes the obsolete Ship guides, harness traits, and Bob 2 Ship mode assets. A pre-controller `.camel-kit/ship-state.json` (or a non-manual `.camel-kit/pipeline.json`) makes Ship fail closed — archive it outside the project first.

See `camel-kit ship` under CLI Commands for the full option reference.

{{< /carousel >}}

## CLI Commands

{{< carousel id="cli-cmds" >}}
<!--step camel-kit init-->

Initialize a new Camel-Kit project.

**Usage:**

```bash
camel-kit init <project-name> [options]
camel-kit init --here [options]
```

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--ai`, `-a` | `bob2` | AI target: `bob2`, `bob` (legacy), `gemini`, `claude`, `codex`, `copilot`, `pi`, `qwen`, or `opencode` |
| `--citrus-version` | `5.0.0-M2` | Citrus Framework version for test schemas and generated test dependencies |
| `--here` | `false` | Initialize in current directory |
| `--no-fetch` | `false` | Skip external catalog fetching |
| `--source-platform` | `auto` | Source platform for migration: `mulesoft`, `biztalk`, `fuse`, `camel`, `auto` |
| `--force` | `false` | Overwrite existing project without prompting |
| `--silent` | `false` | Suppress all output — useful for CI/scripted environments |
| `-p` | - | Override a single distribution property (e.g., `-p camel.main.version=4.21.0`) |
| `-c` | - | Load configuration from a properties file (e.g., `-c my-config.properties`) |
| `-V`, `--version` | - | Print camel-kit version and exit |

The Citrus Framework and MCP runner have separate distribution properties: `citrus.version` defaults to `5.0.0-M2`, while `citrus.mcp.version` is temporarily pinned to `5.0.0-M1`. See [Citrus MCP version compatibility](../../architecture/mcp/#citrus-mcp-version-compatibility) for fallback behavior when the versions differ.

**Prerequisite check:**

On startup, `init` verifies that required tools are installed and reports their status. Missing tools produce warnings but don't block initialization — design and planning work without Camel JBang.

**Overwrite detection:**

If the target directory already contains `AGENTS.md` or `.camel-kit/`, init warns and exits. Use `--force` to overwrite an existing project.

**Examples:**

```bash
# Create new project for Claude Code
camel-kit init my-integration --ai claude

# Create a project for OpenAI Codex CLI
camel-kit init my-integration --ai codex

# The Camel JBang plugin accepts the same target
camel kit init my-integration --ai codex

# Create a project with the default IBM Bob 2 target
camel-kit init my-integration

# Initialize in current directory
camel-kit init --here --ai claude

# Explicitly declare MuleSoft source platform
camel-kit init my-integration --ai claude --source-platform mulesoft

# Overwrite an existing project
camel-kit init my-integration --ai claude --force

# Check version
camel-kit --version
```

**Output structure (Claude Code example):**

{{< filetree >}}
my-integration/
  AGENTS.md # Cross-agent skill routing and iron laws
  CLAUDE.md # Agent-specific configuration (or GEMINI.md / QWEN.md)
  .claude/
    commands/ # Slash commands (Claude Code)
      camel-start.md
      camel-brainstorm.md
      camel-migrate.md
      camel-plan.md
      camel-execute.md
      camel-validate.md
      camel-ship.md
      camel-knowledge.md
      camel-debug.md
    skills/ # Skill files with guides
  .mcp.json # MCP server configuration
  docs/
    constitution.md # Best practices (8 rules)
  .camel-kit/
    config.properties # Project configuration
    templates/ # Generated route, validation, and build templates
    .cache/ # Cached catalogs and schemas
{{< /filetree >}}

Codex uses repository-native skills and TOML configuration instead of command stubs:

{{< filetree >}}
my-integration/
  AGENTS.md # Codex project instructions and routing
  .agents/
    skills/ # All Camel-Kit skills; start with $camel-start
  .codex/
    config.toml # Camel, Camel Knowledge, and Citrus MCP servers
    agents/ # Seven Camel-Kit custom agents
  docs/
    constitution.md
  .camel-kit/
{{< /filetree >}}

No `.codex/commands/` directory is generated. See [OpenAI Codex CLI setup](../../getting-started/codex/) for repository trust, `/skills`, `/mcp`, approvals, and sandbox behavior.


<!--step camel-kit ship-->

Start, inspect, resume, or abort a local Camel Ship run. The controller performs discovery → design → plan → execute → validate and, after the configured approval and validation gates, publishes accepted changes to the project. The harness commands (`/camel-ship`, `$camel-ship`, `/skill:camel-ship`) are thin wrappers around this command.

**Usage:**

```bash
camel-kit ship [options]
camel kit ship [options]
```

A bare `camel-kit ship` starts a new run at discovery with a short discovery conversation. Initial context is optional: text, one or more documents, or both — a requirements document is never mandatory. Supplied material is included in discovery input before questions.

**Options** (canonical descriptions, defaults, and prerequisites: [Command and Options](../../pipeline/ship/#command-and-options) on the Ship Workflow page):

- **Context:** `--text TEXT` and `--document PATH`, both repeatable — valid when starting or resuming a run
- **Oversight:** `--ask always|smart|never` (default `smart`) — valid when starting a run, including with `--start-from`; not with `--resume`, `--status`, or `--abort`
- **Run operations:** `--resume RUN_ID`, `--status RUN_ID`, `--abort RUN_ID`, `--start-from discovery|design|plan` — mutually exclusive; `--start-from` prerequisites are listed on the Ship page
- **Runtime and configuration:** `--pi PATH`, `--node PATH`, `--maven-repository PATH`, `--stage-timeout DURATION`, `--accept-experimental`, `-c`/`--config PATH`, `-p`/`--property KEY=VALUE` — valid when starting or resuming

Configuration is loaded strictly: a missing or unreadable config file or a malformed override is an error, not a warning. Repeat the same `-c`/`-p` options when resuming a run.

**Oversight (`--ask`):**

- `always` — pauses after design, plan, execute, and validate, and on material ambiguity.
- `smart` (default) — pauses after plan and execute and on material ambiguity; a fully passing validation proceeds to guarded publication without a further pause.
- `never` — records reasonable defaults and does not pause, but the run still fails on failed mandatory validation checks, and publication remains controller-gated.

**Run state and Stamp:** run state lives outside the project, under `$CAMEL_KIT_SHIP_STATE_HOME`, else `$XDG_STATE_HOME/camel-kit/ship`, else `~/.local/state/camel-kit/ship`. `.camel-kit/pipeline.json` remains a manual-mode pointer only; Ship never stores run state there. `--resume` re-reads recorded context and artifacts, compares digests, and restarts the earliest stale or incomplete stage. Validation produces a local Stamp whose pass/fail status is derived from the required checks; per check it records the executable, version, arguments with secrets redacted, exit status, and retained output. The Stamp describes checks performed on this machine and is not a signed release attestation.

**Publication and recovery:** discovery, design, plan, and validate never modify application source; execute works in a controller-owned staging copy, and accepted changes are published to the live project only after the configured approval and validation gates. An interrupted process is recoverable with the run ID, but Ship is a local orchestrator — not a daemon, a hostile same-user sandbox, a credential broker, or a release-attestation system. Provider credentials remain with Pi and provider tooling; Ship does not persist them or include them in command arguments, logs, or reports.

**Requirements and compatibility:** the first Ship worker runs on Linux only and needs Pi, Node, and Bubblewrap on a merged-/usr host. The maintained configuration is Pi 0.83.0 with Node 22.22.2; any other detected version is reported as experimental and runs only with `--accept-experimental`. The compatibility tiers and the current live-gate status are documented in [Worker Requirements and Support Tiers](../../pipeline/ship/#worker-requirements-and-support-tiers).

**Examples:**

```bash
camel-kit ship
camel-kit ship --text "Consume Kafka orders and send them to Salesforce"
camel-kit ship --document requirements.md
camel-kit ship --document requirements.md --text "Prefer YAML and Simple; no Java"
camel-kit ship --resume <run-id>
camel-kit ship --status <run-id>
camel-kit ship --abort <run-id>
camel-kit ship --start-from plan
```


<!--step camel-kit doctor-->

Validate a generated Camel-Kit workspace. Use `camel-kit doctor` for the standalone CLI or `camel kit doctor` for the Camel JBang plugin.

```bash
camel-kit doctor [--project-dir <path>] [--json]
camel kit doctor [--project-dir <path>] [--json]
```

Doctor checks generated configuration, target-native entry points, skills, MCP configuration and allowlists, graph availability, command-prefix settings, prerequisites, and stale generated references. For Codex it also validates `.codex/config.toml`, prompt approval defaults, and `.codex/agents/*.toml`. It prints `PASS`, `WARN`, and `FAIL` findings with remediation; any failure returns exit code 1.


<!--step camel-kit doc-->

Track pipeline artifact provenance and staleness in YAML frontmatter.

```bash
camel-kit doc init --by camel-plan --from design-spec.md <file>
camel-kit doc check <file>
camel-kit doc stale --reason "design changed" --cascade <file>
camel-kit doc unstale <file>
```

`--cascade` follows each document's `generated.from` chain and marks downstream artifacts stale. Regenerated artifacts are cleared with `doc unstale`.


<!--step camel-kit graph-->

Query the project's property graph for code intelligence.

```bash
camel-kit graph stats                           # Graph availability check
camel-kit graph generate                        # Rebuild project graph
camel-kit graph find --type CAMEL_ROUTE         # Find nodes by type
camel-kit graph neighbors <node-id>             # Get connected nodes
camel-kit graph route-flow <route-id>           # Trace a route's flow
camel-kit graph dead-code                       # Detect unused code
camel-kit graph project-norms                   # Get project norms for validation
camel-kit graph project-context                 # Get context for implementation
camel-kit graph route-context <route-id>        # Get context for testing
camel-kit graph migration-context <route-id>    # Structured migration context (JSON)
camel-kit graph visualize                       # Generate interactive HTML visualization
camel-kit plan analyze <plan-file>              # Analyze plan for parallel execution waves
```

{{< /carousel >}}

## Command Cheat Sheet

```bash
# CLI
camel-kit init my-project --ai claude           # Create project
camel-kit init my-project --ai codex            # Create a Codex project
camel-kit doctor                                # Validate generated workspace
camel-kit doc check docs/camel-kit/001-order-processing/design-spec.md  # Check artifact staleness
camel-kit graph stats                           # Check graph availability
camel-kit graph visualize                       # Interactive graph HTML
camel-kit plan analyze docs/camel-kit/001-order-processing/implementation-plan.md  # Wave analysis

# Routed Pipeline (in AI assistant)
/camel-brainstorm                # Phase 1: Design interview → design-spec.md
/camel-plan                      # Phase 2: Task decomposition → implementation-plan.md
/camel-execute                   # Phase 3: Generate code + tests + runtime verification
/camel-validate                  # Phase 4: Static quality analysis

# Entry Points
/camel-start                     # Route a request to the right skill
/camel-migrate                   # Migration discovery and design

# Ship (local workflow controller)
camel-kit ship --document requirements.md       # Start a controller-owned Ship run
camel-kit ship --resume <run-id>                # Resume an interrupted run
/camel-ship                      # Thin wrapper around camel-kit ship

# Standalone
/camel-knowledge                 # Documentation lookup
/camel-debug                     # Ad-hoc route troubleshooting

# Codex project skills
/skills                          # Inspect installed project skills
$camel-start                     # Route Camel-Kit work in Codex
/mcp                             # Verify the three configured MCP servers
```
