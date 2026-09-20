---
name: jev-ai
description: >-
  Call Jev, TypeSafe AI's "System One" decision API, for fast typed
  micro-decisions inside application code — a choice among labeled
  options, a 2-10 score, or a calibrated yes/no probability — instead of
  parsing free-text output from a full LLM call. Use this skill whenever
  the user asks to integrate Jev AI, TypeSafe AI, jevtypesafeai.com, or
  "System One" into this codebase, wants a fast/cheap classifier,
  router, risk-scorer, or yes/no gate backed by an external typed-output
  model, or references POST /v1/systemone. Do NOT use this for
  conversational AI features, free-text generation, or anywhere the
  existing Anthropic/Claude integration in this repo already fits —
  Jev is for narrow structured decisions, not chat or content
  generation. Do NOT fabricate the exact request/response JSON shape or
  auth header from memory; this skill's job is to make the agent fetch
  and confirm the live docs before writing integration code.
---

# Jev AI (TypeSafe AI "System One") integration

Jev is a decision API, not a chatbot: you send it a `state` (context) and
`questions`, and it returns one of three typed, calibrated answers instead
of prose. It exists to replace places in the code where an LLM is asked a
narrow question ("which category?", "how risky, 2-10?", "should this be
blocked, yes/no?") and the response is then parsed out of free text. Using
a typed decision endpoint there is faster (~70-500ms), far cheaper
($0.042 / M input tokens, output free), and can't return a malformed
answer, because the answer type is fixed by the request.

Everything below the "Confirmed from the public README" section is
**unverified** — this skill was authored in a sandbox where
`jevtypesafeai.com` was blocked by network egress policy, so the exact
API contract (base URL, auth header, JSON field names beyond `state` and
`questions`) could not be fetched or checked. Treat those details as
unknown, not as "probably right."

## Core rule

Never write or ship Jev integration code from guessed request/response
shapes. Before writing a single line of HTTP-calling code, fetch
`https://jevtypesafeai.com/how-to-use` (and `/what-is-jev`, `/pricing` if
needed) yourself and read the actual curl/Python/TypeScript examples
there. If that fetch is blocked or fails in your environment too, say so
explicitly to the user rather than inventing a schema — do not guess at
header names like `Authorization` or `X-API-Key`, do not guess the base
domain for the API host, and do not guess field names beyond `state` and
`questions`, which are the only two confirmed by the README.

## Confirmed from the public README (github.com/codaaiteam/jev-ai)

- Endpoint shape: one `POST` to `/v1/systemone`, body includes a `state`
  and `questions`.
- Three answer types, selected by what the request asks for:
  - **choice** — pick one of up to 255 labeled options, each returned
    with a probability.
  - **score** — a position on a 2-10 ordered scale (risk, urgency,
    quality, etc.).
  - **noul** — a calibrated yes/no as a probability from 0.0 to 1.0
    (gates, filters, guardrails).
- Latency: roughly 70-500ms per call.
- Pricing: $0.042 per million input tokens, output is free (roughly
  $0.0004 per decision).
- Free playground with no waitlist: https://jevtypesafeai.com
- API guide (curl / Python / TypeScript): https://jevtypesafeai.com/how-to-use
- MIT-licensed quickstart repo; community-maintained, not officially
  affiliated with TypeSafe AI.

Everything else — auth mechanism, exact JSON keys inside `state` and
`questions`, the response envelope, error format, rate limits, the API's
base hostname — is not in the README and must come from the live docs.

## Workflow

1. **Confirm the use case fits.** Jev is for a single narrow structured
   decision per call, not open-ended generation. If the task is really
   "summarize this" or "write this," it's not a Jev use case — say so
   instead of forcing it.
2. **Fetch the real docs before coding.** Read
   `https://jevtypesafeai.com/how-to-use` directly. Pull the exact
   request JSON (what goes inside `state` and `questions`, how the
   desired answer type — choice/score/noul — is specified), the exact
   response JSON, the auth header name, and the base URL/host actually
   used by the examples shown there.
3. **Get the API key from the user, never hardcode it.** Read it from an
   environment variable (e.g. `JEV_API_KEY` — confirm the exact name
   TypeSafe AI's dashboard gives you) and fail loudly if it's unset.
   Never commit a key to the repo or embed one in code.
4. **Write the integration** as a small, narrowly-scoped function: build
   the request from the confirmed schema, call the endpoint, parse the
   typed response, and return the native type the caller needs (an enum
   value for `choice`, a number for `score`, a boolean/float for
   `noul`). Don't build a general-purpose Jev client with speculative
   features (retries, batching, streaming) unless the task needs them.
5. **Handle the "type can't be wrong" property, not around it.** Don't
   add prose-parsing, regex, or fallback heuristics on top of the
   response — the whole point of a typed decision API is that the
   shape is guaranteed, so treat a malformed response as a real error
   (network/auth/quota issue), not as a case to paper over.
6. **Note latency and cost in the calling code's context**, if it's on a
   hot path — 70-500ms per call is fine for a background job or a
   single request-time decision, not for something invoked in a tight
   loop over a large batch without checking whether batching is
   supported.

## Output format

When this skill produces integration code, it's a small typed wrapper,
roughly:

```ts
// Fill in exact field names/response shape from https://jevtypesafeai.com/how-to-use
async function askJev(state: JevState, questions: JevQuestion[]): Promise<JevAnswer[]> {
  const apiKey = process.env.JEV_API_KEY;
  if (!apiKey) throw new Error("JEV_API_KEY is not set");

  const res = await fetch("<base-url-from-docs>/v1/systemone", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // TODO: confirm the real auth header from the docs
    },
    body: JSON.stringify({ state, questions }),
  });

  if (!res.ok) {
    throw new Error(`Jev API error: ${res.status} ${await res.text()}`);
  }

  return res.json();
}
```

Leave the `TODO`/`<base-url-from-docs>` markers in place until the docs
have actually been read in that session — don't fill them from
assumption.

## When NOT to apply

- The task doesn't need a typed decision — it needs free text, a
  conversation, or multi-step reasoning. Use the repo's existing
  Anthropic integration instead.
- The docs fetch is unavailable and the user needs code *right now* —
  don't ship guessed auth/schema code; tell the user the docs couldn't
  be reached and ask them to paste the relevant example from
  `jevtypesafeai.com/how-to-use`, or wait until the fetch works.
- Someone asks to store or hardcode a real Jev API key in the repo —
  refuse and point them at environment variables / the platform's
  secret manager instead.

## Example

**User:** "Add a Jev call to classify incoming support tickets as
billing/technical/account, and also flag ones that look urgent."

**What this skill does:**
1. Recognizes this as two Jev calls: a `choice` among
   `["billing", "technical", "account"]`, and either a `noul` ("is this
   urgent?") or a `score` (urgency 2-10) depending on what the caller
   downstream needs.
2. Fetches `jevtypesafeai.com/how-to-use` to get the real request/response
   shape and auth header before writing any code.
3. Writes one small function per decision point (or one function
   parameterized by answer type), reading `JEV_API_KEY` from the
   environment, with the docs' confirmed schema — not the TODO
   placeholders above.
4. Wires the ticket's text/metadata into `state`, and the two questions
   into `questions`, per whatever the confirmed schema actually calls
   those fields.
5. Does not add a fallback text-parser "in case the response looks
   different" — an unexpected shape is treated as an error to surface,
   not silently worked around.
