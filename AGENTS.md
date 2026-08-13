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
