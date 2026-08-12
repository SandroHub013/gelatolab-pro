# Security policy

## Reporting a vulnerability

Report privately — do not open a public issue.

- GitHub private advisories: **Security → Report a vulnerability** on this
  repository.
- Email: boni.alessandro997@gmail.com

Include what you did, what happened, and what you expected. Expect an
acknowledgement within 3 working days and an assessment within 10.

## Scope

GelatoLab Pro computes and stores recipe formulations. The parts that
handle untrusted input, or turn stored data into something another
program will interpret, are the ones worth attacking:

- `src/app/api/recipes/[id]/export/` — the only HTTP API route. It reads
  query parameters and writes both a response header and a CSV file.
- `src/app/api/recipes/[id]/export/format.ts` — CSV escaping and
  filename sanitisation, kept dependency-free so they stay testable.
- `src/infrastructure/database/` — Prisma access. All queries go through
  the Prisma client; there is no raw SQL in this codebase.

## Threats this codebase handles explicitly

**CSV formula injection.** A recipe or ingredient name beginning with
`=`, `+`, `-` or `@` is executed as a formula when the exported file is
opened in Excel or Sheets. `csvField` prefixes those values with an
apostrophe so they stay text, while leaving genuine negative numbers
alone. Covered by tests.

**Response-header injection.** The export filename comes from the
recipe slug, which is stored data. Unescaped, a quote would close the
`Content-Disposition` header early and a CR/LF would let an attacker
append headers of their own. `safeFilename` reduces the slug to word
characters, dots and dashes, caps its length and falls back to a
constant when nothing survives. Covered by tests.

**Unbounded format parameter.** `?format=` is checked against an
allow-list rather than compared against `"csv"` with everything else
falling through to JSON.

## Not in scope

The app has no authentication layer. It is designed as a single-operator
tool run on a trusted network or behind a reverse proxy that
authenticates. Anyone who can reach the port can read and export every
recipe. Deploy it accordingly — do not expose it to the internet without
putting access control in front of it.

## Secrets

No credentials are tracked. The only environment variables read anywhere
in `src/` are `DATABASE_URL` and `NODE_ENV`. `.env` files are ignored by
git.

## Supported versions

The `main` branch is the only supported version.
