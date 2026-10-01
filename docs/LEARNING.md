Express middleware runs in the order you register it with `app.use()` — that's why
CORS and JSON body parsing are added before any routes, and the error handler is
added last so it catches anything thrown above it.

A 4-argument function (`err, req, res, next`) is how Express recognizes an
error-handling middleware specifically, as opposed to a normal 3-argument one.

Tailwind doesn't ship any styles by itself — PostCSS scans your source files for
class names it finds (per `content` in `tailwind.config.js`) and generates only the
CSS for classes actually used, which is why unused utility classes add zero bytes
to the final stylesheet.

TypeScript `interface extends` lets `Decision`, `ActionItem`, and `OffAgendaEntry`
all share the same `evidenceQuote`/`sourceLine`/`agendaItem` fields from one
`EvidenceRef` base, so the "every claim needs a traceable source line" rule is
enforced by the type system rather than repeated by hand in three places.

A prompt is the real "contract" between your code and an LLM: since the model has
no compiler, every rule you'd normally enforce with types (exact field names, enum
values, no extra prose) has to be spelled out in plain English instead — the zod
schema on the way back in is what actually catches it if the model ignores you.

`responseMimeType: "application/json"` tells Gemini to constrain its own output
to valid JSON syntax — but "valid JSON" isn't the same as "matches our schema", so
the app still has to `JSON.parse()` it and separately validate the shape.

Custom `Error` subclasses (e.g. `GeminiRateLimitError` vs `GeminiApiError`) let a
caller use `instanceof` to react differently to each failure (retry-with-delay vs.
fail-fast) instead of parsing a generic error message string to guess what went wrong.

In an async Express route, a thrown error inside the handler does NOT automatically
reach the `(err, req, res, next)` middleware on Express 4 — you have to `try/catch`
it yourself and call `next(err)`, otherwise it becomes an unhandled promise rejection
that never produces an HTTP response at all.

Returning `{ success: false, error }` from a validator (instead of throwing) lets the
route decide the HTTP status itself — a 502 here means "our server got a bad answer
from an upstream service (Gemini)," which is a more accurate status than a generic 500.

Feeding a validation error back into the same prompt as `previousError` and asking
once more fixes flaky LLM output without an infinite loop; errors that a re-ask can't
fix (rate limits, bad config) skip that path and map straight to their own HTTP status.

Input validation that returns a plain `string | ValidatedInput` instead of throwing
keeps the route's control flow simple (`if (typeof result === "string")`) and makes
the function trivially testable without a mocked request/response.

Validating request shape before any expensive or billed call (Gemini, in this case)
means a malformed request fails in milliseconds with a precise field-level reason,
instead of wasting a rate-limited API call on input that could never have succeeded.

Deriving a type from its zod schema with `z.infer<typeof schema>` (instead of hand-writing
it as an `Omit<>` of a bigger type) keeps the "what the model actually outputs" type locked
to the runtime check — if the schema and the type ever drifted apart, `z.infer` makes that
impossible by construction.

Trusting a string match is not the same as trusting the data: `evidenceQuote` only becomes
"verified" after the server independently re-reads the transcript line the model claimed
and confirms the exact text is really there — the model asserting a line number proves nothing
on its own.

A seed script calling `analyzeMeeting()` directly (instead of hitting `POST /meetings` over
HTTP) reuses the exact same code path the live server runs, so the cached seed JSON can never
drift out of shape from what a real request would produce.

Checking "does the output file already exist" before spending a billed API call is a cheap,
file-system-only guard that makes a multi-step script safely re-runnable — a crash on entry 3
of 5 means re-running only redoes entry 3 onward, instead of re-paying for 1 and 2 again.

Loading the seed JSON files once at server startup (into an array and a `Map` by id) instead
of reading the filesystem inside each route handler means every `GET /meetings` request is
just an in-memory lookup — no disk I/O, and nothing to race if two requests arrive at once.

Rejecting a URL param against a strict `a-z0-9-` regex before using it as a lookup key blocks
path-traversal-shaped ids (like `../../etc/passwd`) with a clean 400 — the check happens before
the value is ever used to touch storage, not after something has already gone wrong.

TypeScript's `Omit<Type, "a" | "b">` can subtract more than one key at a time —
useful when a helper function (`verifyEvidence`) builds most of a bigger type but
one more field (`transcriptLines`) gets attached later by its caller, so the
helper's return type only promises what it actually produces.

With no shared package between `client/` and `server/`, "the types match" is only
true because a human kept them in sync by hand — the compiler can't catch a client
type drifting from the server's actual shape, which is why the client file is
literally copy-pasted and commented as a mirror rather than reinvented from memory.

A custom `ApiError` class carrying the HTTP `status` (and `status: 0` for a network
failure that never got a response) lets calling UI code branch on `err.status`
instead of fragile string-matching on `err.message` to decide what to show the user.
