# Cloud overrides for product-shots-weekly

`SKILL.md` in this folder is the weekly pipeline, copied verbatim from the laptop
scheduled task (`C:\Users\DELL\.claude\scheduled-tasks\product-shots-daily-content\`).
It now runs as a claude.ai cloud scheduled task instead. Follow `SKILL.md` exactly; this
file only replaces the parts that assumed Rohan's Windows laptop. Where the two disagree,
this file wins on mechanics, `SKILL.md` wins on everything else (stages, gates, standing
rules, stop conditions).

## Paths

| SKILL.md says | Use instead |
|---|---|
| `C:\Users\DELL\OneDrive\Desktop\MySite` | the repo checkout (root of `rohankhullar24-oss/product-with-rohan`) |
| `C:\Users\DELL\.claude\scheduled-tasks\product-shots-daily-content\` | `ops/product-shots-weekly/` in that checkout |
| "session scratchpad" | a fresh `mktemp -d` directory, never inside the repo |

Run the gates from the repo root, e.g.
`node ops/product-shots-weekly/checks/check.mjs blog --file "$SCRATCH/post.md" --blogdir src/content/blog --date <today>`.
`history.mjs` resolves `run-history.jsonl` next to itself, so it needs no path change.

## Network

If `HTTPS_PROXY` is set, Node's `fetch` does not use it on its own. Before running any
`check.mjs` stage, export:

```bash
export NODE_USE_ENV_PROXY=1
export NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt   # only if that file exists
```

If a gate fails because a host is unreachable (`fetch failed`, `ENOTFOUND`, proxy 403)
rather than because the content is wrong, that is an environment problem: stop the stage,
say which host was blocked, and never publish past it.

## Double-fire guard (Stage 0)

Before Stage 1, run `git log origin/master --since="5 days ago" --format="%ad %s"`. If it
already shows an `Add blog post:` commit, the laptop task or a manual run already did this
week: skip Stages 1-5, still run 6, 6b, 7 and 8, and say so in the report.

## Supabase

- SQL (Stages 1, 2, 6): use the Supabase connector's `execute_sql` on project
  `uksoubgwjbgjwtaafdxo`.
- Teardown PNG upload (Stage 4 step 6): get the publishable key with the connector's
  `get_publishable_keys`, then upload over the Storage REST API, as the laptop runs did:

  ```bash
  curl -sS -X POST \
    "https://uksoubgwjbgjwtaafdxo.supabase.co/storage/v1/object/newsletter-images/teardowns/<slug>.png" \
    -H "Authorization: Bearer $KEY" -H "apikey: $KEY" \
    -H "Content-Type: image/png" --data-binary @"$SCRATCH/<slug>.png"
  ```

  If the connector or the upload is unavailable, Stage 4's own stop condition applies:
  add nothing to `teardowns.ts`.

## Infographic render

Chromium and Playwright are pre-installed (`require('playwright')`, `chromium.launch()`).
Do not run `playwright install`.

## GitHub (Stage 6b)

Try `gh` first. If it is not authenticated, use the GitHub MCP tools (`mcp__github__*`)
for the same three reads. Still report-only.

## LinkedIn (Stage 5)

Composio's LinkedIn toolkit via the Composio connector. If that connector is not loaded in
this session, follow `SKILL.md`'s own missing-connector rule: draft and gate, do not post,
report it.

## Committing

- Rohan has authorised direct commits to `master` for the blog post and teardown, exactly
  as `SKILL.md` describes. Never force-push.
- The run's state lives in this folder now, so it has to be committed or the next run
  forgets it. After Stage 7, commit any changes to `run-history.jsonl`,
  `next-run-hints.md`, `proposals.md` and `linkedin-cta-log.md` in one commit,
  `Routine state: <today>`, and push to `master`.
- Never edit `SKILL.md`, `CLOUD.md` or `checks/` from a run (`SKILL.md` already forbids
  editing itself; that covers this file too). Proposed changes go to `proposals.md`.

## Notify (Stage 8)

If `PushNotification` is not available, make the Stage 8 line the first line of the final
message. The scheduled task sends Rohan a push notification when the run finishes.
