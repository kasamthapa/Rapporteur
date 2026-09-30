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
