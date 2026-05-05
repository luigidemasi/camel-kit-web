---
title: Command Reference
weight: 1
---

Camel-Kit provides both CLI commands for project initialization and slash commands for use within your AI coding assistant. The slash commands follow a 3-phase orchestrated flow: Design → Plan → Execute.

## Pipeline Commands

{{< carousel id="pipeline-cmds" >}}
<!--step /camel-brainstorm — Design Phase-->

Design an integration through an AI-guided interview. This is **Phase 1** of the pipeline and the primary entry point for all camel-kit work.

**When to use:** Any new integration, connecting systems, building data pipelines, or starting migration projects.

**Process:**

1. Detects project type (greenfield or migration)
2. Runs a Socratic interview: business purpose, systems, data formats, processing, error handling, performance
3. Verifies all components via MCP catalog (Iron Law 1)
4. Produces a formal Design Specification
5. After user approval, automatically invokes `/camel-plan`

**Output:** `docs/design-spec.md`


<!--step /camel-plan — Planning Phase-->

Generate an implementation plan from an approved design spec. This is **Phase 2** of the pipeline, auto-invoked by `/camel-brainstorm` after spec approval.

**Process:**

1. Reads the approved design spec
2. Decomposes into implementation tasks with acceptance criteria
3. Runs wave analysis to identify parallelizable tasks
4. Specifies two-stage review per task (spec compliance then quality)
5. After the plan is complete, automatically invokes `/camel-execute`

**Output:** `docs/implementation-plan.md`

**Key rule:** The plan is a recipe, not the meal — it describes WHAT to generate, not the generated code itself.


<!--step /camel-execute — Execution Phase-->

Execute the implementation plan with orchestrated task dispatch. This is **Phase 3** of the pipeline, auto-invoked by `/camel-plan` after the plan is complete.

**Process:**

1. Analyzes plan for parallel execution waves
2. For each task: implement → spec compliance review → code quality review
3. Loads internal skills as needed (camel-implement, camel-test, camel-validate)
4. After all tasks complete, auto-invokes `/camel-verify`

**Generated artifacts:**
- `.camel.yaml` routes
- `application.properties`
- `docker-compose.yaml`
- DataMapper files (XSLT/Groovy)
- Citrus test definitions
- Validation report

{{< /carousel >}}

## Entry Point Commands

{{< carousel id="entry-cmds" >}}
<!--step /camel-flow — Greenfield-->

Shortcut into `/camel-brainstorm` for greenfield projects. Use when creating a new integration from scratch.

Immediately starts the design interview process optimized for new integrations.


<!--step /camel-migrate — Migration-->

Shortcut into `/camel-brainstorm` for migration projects.

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
<!--step /camel-verify — Verification-->

Runtime verification feedback loop. Builds, starts, tests, classifies errors, applies fixes, and retries until the application works.

**3-phase loop:**

1. **Build** — Maven/Gradle compilation
2. **Test** — run `camel test run` for route verification
3. **Report** — structured summary of findings and fixes

Can be invoked standalone for troubleshooting or auto-invoked by `/camel-execute`.


<!--step /camel-validate — Validation-->

Validate Camel routes for correctness, security, and constitution compliance. Produces timestamped validation reports.

**Validation categories:**
- Schema validation
- Endpoint verification
- Quality checks
- Security analysis
- Anti-pattern detection
- Constitution compliance (all 7 rules)

**Output:** `docs/validation-report-YYYY-MM-DD_HH-mm.md`


<!--step /camel-knowledge — Docs-->

Look up Apache Camel documentation, component details, CVEs, migration guides, release notes, and JIRA issues via MCP tools.

**MCP Tools:**
- `camel_docs_search` — general documentation search
- `camel_docs_component_info` — component information + CVE lookup
- `camel_docs_cve_search` — security advisory search
- `camel_docs_release_info` — release notes
- `camel_docs_jira_lookup` — JIRA issue lookup

<!--step /camel-ship — Autonomous Pipeline-->

Autonomous pipeline orchestrator that chains all four phases (brainstorm → plan → execute → verify) in a single command with configurable oversight.

**Process:**

1. **Brainstorm** — Design interview with the user
2. **Plan** — Task decomposition from approved design
3. **Execute** — Code generation with two-stage review
4. **Verify** — Runtime verification loop

**Oversight levels (`--ask`):**

| Level | Behavior |
|-------|----------|
| `always` | Pause for user approval at every stage transition |
| `smart` | Auto-approve when all criteria pass, pause on ambiguity |
| `never` | Fully autonomous — only stop on blocking errors |

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
| `--ai`, `-a` | `bob` | AI coding assistant to configure (bob, gemini, claude, qwen, opencode) |
| `--citrus-version` | `4.9.2` | Citrus Framework version for test schemas |
| `--here` | `false` | Initialize in current directory |
| `--no-fetch` | `false` | Skip external catalog fetching |
| `--source-platform` | `auto` | Source platform for migration: `mulesoft`, `biztalk`, `fuse`, `camel`, `auto` |
| `--force` | `false` | Overwrite existing project without prompting |
| `--silent` | `false` | Suppress all output — useful for CI/scripted environments |
| `-p` | - | Override a single configuration property (e.g., `-p camelVersion=4.20.0`) |
| `-c` | - | Load configuration from a properties file (e.g., `-c my-config.properties`) |
| `-V`, `--version` | - | Print camel-kit version and exit |

**Prerequisite check:**

On startup, `init` verifies that required tools are installed and reports their status. Missing tools produce warnings but don't block initialization — design and planning work without Camel JBang.

**Overwrite detection:**

If the target directory already contains `AGENTS.md` or `.camel-kit/`, init warns and exits. Use `--force` to overwrite an existing project.

**Examples:**

```bash
# Create new project for Claude Code
camel-kit init my-integration --ai claude

# Create new project for IBM Project Bob
camel-kit init my-integration --ai bob

# Initialize in current directory
camel-kit init --here --ai claude

# Explicitly declare MuleSoft source platform
camel-kit init my-integration --ai claude --source-platform mulesoft

# Overwrite an existing project
camel-kit init my-integration --ai claude --force

# Check version
camel-kit --version
```

**Output structure:**

{{< filetree >}}
my-integration/
  AGENTS.md # Cross-agent skill routing and iron laws
  CLAUDE.md # Agent-specific configuration (or GEMINI.md / QWEN.md)
  .claude/
    commands/ # Slash commands (Claude Code)
      camel-brainstorm.md
      camel-plan.md
      camel-execute.md
      camel-verify.md
      camel-ship.md
      camel-flow.md
      camel-validate.md
      camel-migrate.md
      camel-knowledge.md
    skills/ # Skill files with guides
  .mcp.json # MCP server configuration
  .camel-kit/
    config.properties # Project configuration
    constitution.md # Best practices (7 rules)
{{< /filetree >}}


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
camel-kit graph stats                           # Check graph availability
camel-kit graph visualize                       # Interactive graph HTML
camel-kit plan analyze docs/implementation-plan.md  # Wave analysis

# 3-Phase Pipeline (in AI assistant)
/camel-brainstorm                # Phase 1: Design interview → design-spec.md
/camel-plan                      # Phase 2: Task decomposition → implementation-plan.md
/camel-execute                   # Phase 3: Generate code + tests + validation

# Entry Points
/camel-flow                      # Greenfield shortcut → brainstorm
/camel-migrate                   # Migration shortcut → brainstorm

# Autonomous
/camel-ship                      # Full pipeline: brainstorm → plan → execute → verify

# Standalone
/camel-verify                    # Runtime verification loop
/camel-validate                  # Route quality check
/camel-knowledge                 # Documentation lookup
```
