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

- `src/app/api/recipes/[id]/export/` — reads query parameters and writes
  both a response header and a CSV file. **It has no authentication**, and
  it returns a complete recipe — quantities included — for any id. That is
  the customer's trade secret behind an unguessable-but-not-secret id.
- `src/app/api/voice/interpret/` and `src/app/api/voice/speech-token/` —
  also unauthenticated. The first calls a paid API on every request; the
  second hands out valid Azure tokens to whoever asks. Both are harmless
  while the app is local and unconfigured, and neither may be exposed to
  the internet before a session is required. See SPEC.md §7.
- Server Actions are HTTP endpoints too, and none of them checks a
  session either. There is no authentication anywhere in `src/` yet.
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

No credentials are tracked; `.env` files are ignored by git. The
environment variables read in `src/` are `DATABASE_URL`, `NODE_ENV`, and
— since the voice assistant landed — `ANTHROPIC_FOUNDRY_RESOURCE`,
`ANTHROPIC_FOUNDRY_API_KEY`, `AZURE_SPEECH_KEY` and
`AZURE_SPEECH_REGION`. All four are optional: without them the voice
routes answer 503 and the rest of the app is unaffected.

The Azure Speech key never reaches the browser. `/api/voice/speech-token`
exchanges it server-side for a token that expires in ten minutes, because
the Speech SDK runs client-side and `fromSubscription` would put the key
in the bundle.

## Automated scanning

CI runs lint, types, tests and a `npm audit` report on every push and
pull request.

There is no CodeQL workflow here yet. It was removed while the repository
was private, because code scanning on a private repository requires GitHub
Advanced Security and the analysis would run and then fail at upload.

**That condition no longer holds: the repository is public, and code
scanning is free here.** The workflow should be added back. Secret
scanning is likewise available and currently disabled.

Note also that `npm audit` in CI runs with `|| true`, so it reports and
never blocks — acceptable for a local application, not for a service
holding other people's recipes. SPEC.md §12 tracks both.

## Supported versions

The `main` branch is the only supported version.
