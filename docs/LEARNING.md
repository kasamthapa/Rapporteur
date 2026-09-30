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
