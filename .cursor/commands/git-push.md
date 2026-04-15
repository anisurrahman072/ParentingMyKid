# Git commit and push to origin

IMPORTANT: Work on **one Git repository at a time**. If the workspace root is not a single repo, or you detect **multiple nested `.git` directories** (multiple repos in one workspace), **ask the user which repository** the commit and push should run in. Do not mix changes from different repos in one commit.

If the user’s intent is obvious from open files or terminal cwd, use that repo’s root as the Git working directory.

---

## Part 1 — Commit

1. `cd` to the chosen repository root (or use `git -C <path>` for all Git commands).
2. Run `git status` and `git diff` (and `git diff --staged` if anything is staged) so you know what changed.
3. Stage the intended files only: `git add …` (do not stage unrelated repos or secrets).
4. Create a **single** commit with a message that follows **all** rules below.

### Commit message rules (subject line)

- **Length:** at most **72 characters** for the subject line
- **Mood:** **Imperative** — e.g. `Fix`, `Add`, `Update` (not `Fixed`, `Added`, `Updated`)
- **Capitalization:** capitalize the **first letter** of the subject
- **No trailing period** on the subject line
- **Meaningful:** describe **why** the change matters, not only what moved (avoid vague messages like `Fix stuff` or `Update files`)

If the user already provided an exact commit message, use it only if it still fits these rules; otherwise suggest a compliant revision and confirm if needed.

Example subject lines:

- `Fix mobile API base URL and align register payload with server`
- `Add Prisma db:push instructions for Neon setup`

---

## Part 2 — Push to `origin`

Run Git **from the same repository root** as Part 1.

1. **Fetch** remote updates for the current branch (safe, does not merge):
   - `git fetch origin`
2. **Push** the current branch to `origin`:
   - `git push origin HEAD`
   - or `git push -u origin $(git branch --show-current)` if upstream is not set yet
3. **If the push is rejected** because the remote has new commits (non-fast-forward):
   - Prefer a **linear history:** `git pull --rebase origin $(git branch --show-current)` then `git push origin HEAD`
   - If conflicts appear, help resolve them, then continue the rebase and push
4. **Force push:** Do **not** run `git push --force` or `git push --force-with-lease` unless the **user explicitly asks** for a force push. If a force push might be needed after rebase on a shared branch, **stop and ask** before using `--force-with-lease`.

### Notes

- Prefer **rebase** over merge when integrating remote commits before push, unless the user’s workflow forbids it.
- Never commit or push **`.env`**, secrets, or large generated artifacts unless the user clearly intends that (and it is safe).

---

## Summary checklist

- [ ] One repo only — or user confirmed which repo
- [ ] Commit message ≤72 chars subject, imperative, capitalized, no period, explains why
- [ ] `git fetch` then `git push`; on rejection, `git pull --rebase` then push again
- [ ] No force push without explicit user consent
