# AGENTS.md

## Superpowers Usage Policy

Use Superpowers conservatively to keep token usage low.

- Use Superpowers only when the user explicitly requests it, or when one of the allow-listed cases below applies.
- Do not use Superpowers for simple questions, status checks, small explanations, direct shell-output requests, straightforward file lookups, or routine commits.
- Allowed by default:
  - `verification-before-completion`: before claiming implementation is complete, before committing code, or before PR handoff.
  - `systematic-debugging`: for test failures, runtime errors, flaky behavior, or unclear bugs.
  - `receiving-code-review`: when applying or evaluating review feedback.
  - `requesting-code-review`: for a self-review after broad or risky changes.
  - `writing-plans`: only for multi-step implementation work that touches several files/layers or has unclear sequencing.
- Use only when explicitly requested:
  - `brainstorming`
  - `test-driven-development`
  - `executing-plans`
  - `using-git-worktrees`
  - `finishing-a-development-branch`
  - `dispatching-parallel-agents`
  - `subagent-driven-development`
  - `writing-skills`
  - `using-superpowers`
- Avoid `using-superpowers` as a default turn starter. The policy in this file is the active routing rule for this repository.
- When a Superpowers skill is used, read only the selected `SKILL.md` first.
- Read Superpowers reference files only when the selected `SKILL.md` requires them for the current task or the work is blocked without them.
- Do not run the full brainstorming/spec/plan workflow for small, clear implementation tasks unless the user asks for that workflow.
- Prefer the repo-specific vote skills under `.agents/skills` for vote backend architecture, DDD, CQRS, adapter/cache, security, naming, and testing guidance.
- Keep skill-related user updates short: name the skill and why it is being used, then proceed.

If a Superpowers skill asks for broader or heavier behavior than this policy, follow this policy unless the user explicitly asks to run the full Superpowers workflow.

## RV Workflow plugin

Merged after reviewing the installer dry-run. The existing Superpowers Usage Policy above and applicable Vote-specific rules take precedence over generic RV Workflow guidance, including bundled workflow references. This integration adds no separate Superpowers dependency.

Use the smallest plugin-qualified role skill that covers the task: `$rv-workflow:backend`, `$rv-workflow:frontend`, `$rv-workflow:document`, `$rv-workflow:qa`, or `$rv-workflow:planner`. Use `$rv-workflow:project-toolchain` before executable work and its no-op path for prose-only work.

At the start of every tool-using agent task, including read-only inspection, status checks, and small tasks, invoke `$rv-workflow:task-progress` only long enough to resolve its installed plugin root, then run `npm --prefix <plugin-root> run progress:ensure -- --color --workspace <project-root>` exactly once before any role or task classification. This startup is independent of task tracking: it reuses a live watcher and opens a panel only when one is absent. An ensured watcher exits after the workspace has remained on completed work for 30 seconds. If a tracked task is created after the initial startup call, run the same `progress:ensure` command once immediately after creation so slow classification cannot leave that task without a panel. Do not pass `--task-id`. Pure conversational responses that require no tools do not launch the panel.

For explicitly tracked or medium/large work, use `$rv-workflow:task-progress` only at phase boundaries (task/step creation, step start, major milestone, block, completion or skip). Small questions, status checks, file lookups, localized routine edits, and routine commits remain untracked even though the shared panel startup runs. The inline MCP dashboard is read-only; write progress explicitly through the MCP tools. The terminal companion may apply only its confirmed, allowlisted step commands through the same task service. Repeat the `progress:ensure` command once just after tracked task creation as described above, but not at later milestones.

Before sending a final response for tracked work, the coordinating agent must read the latest task snapshot. It must not leave a runnable step `pending` or `in_progress`: start and complete the step with evidence, or skip it with a concrete reason when it is genuinely unnecessary. Never infer step completion from an agent or terminal disappearing. Render the dashboard once the task is completed or blocked so the final recorded state is visible.

Use `$rv-workflow:scoped-superpowers` only for medium, large, or high-risk work or an explicitly requested bundled workflow. Preserve its explicit-only allow-list and load at most one phase-specific bundled reference. Keep `test-writer` separate from production implementation.

### Vote-specific routing and contracts

- Keep the installed Codex plugin ID `rv-workflow` and plugin-qualified skill names unchanged. The npm package name `@rvkang/rv-workflow` is a separate contract; do not reinstall the plugin or copy its role skills into this repository.
- For backend work under `server/`, combine `$rv-workflow:backend` with the applicable local skills: `vote-architecture`, `vote-ddd-aggregate`, `vote-cqrs`, `vote-adapter-cache`, `vote-security`, `vote-naming`, `vote-testing`, and `vote-transaction-outbox`. Read only skills relevant to the change and their required canonical rules.
- For frontend work under `ui/`, combine `$rv-workflow:frontend` with `vote-ui-structure`; use `design-taste-frontend` and `web-design-guidelines` when their task-specific triggers apply.
- For backend verification or test authoring, combine `$rv-workflow:qa` with `vote-testing` and relevant Vote policy skills. The `test-writer` role is separate from production implementation; its registration does not authorize automatic TDD or agent delegation.
- Preserve all existing project skills under `.agents/skills` and their canonical rules under `skills/`. They are project-specific guidance, not duplicate RV role skills.
- Resolve Node from `.nvmrc` (24) and package manager from root `package.json` (`pnpm@9.15.9`), respecting any more specific module pins. Do not change runtime pins, package-manager declarations, lockfiles, or application code merely to apply workflow templates.
- Custom agents are registered in `.codex/config.toml` with role settings under `.codex/agents/`. Registration does not authorize commits, pushes, PRs, dependency installation, or server startup.
