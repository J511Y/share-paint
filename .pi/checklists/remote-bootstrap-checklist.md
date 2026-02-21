# Remote Bootstrap Checklist (PAI-16 devops)

When completion gate requires `push + PR URL` but repository has no remote, run this checklist immediately.

## 1) Confirm local evidence
- `git rev-parse --short HEAD`
- `git diff --stat develop..HEAD`
- `./.pi/checks/ci_gate_non_docs_change.sh develop HEAD`

## 2) Confirm remote absence
- `git remote -v`
- If empty, proceed to bootstrap.

## 3) Bootstrap remote + push
- `./.pi/scripts/remote_bootstrap_and_pr.sh --check`
- `./.pi/scripts/remote_bootstrap_and_pr.sh --apply --remote-url <GIT_REMOTE_URL>`

## 4) Create PR target by policy
- Default target: `develop`
- Hotfix branch (`hotfix/*`) target: `main`
- Ensure PR body includes Linear issue link (e.g. `PAI-16`).

## 5) Capture final completion artifacts
At least 2 required, recommend all 4:
- commit hash
- diff summary
- policy check log
- push evidence + PR URL

## 6) Report format (6 blocks)
1. Commit
2. Diff
3. Policy check
4. Remote / push / PR
5. Risks or blockers
6. Next action
