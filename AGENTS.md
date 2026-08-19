# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Add durable project-specific notes here as they are discovered through real work.

## Setup

The app needs PostgreSQL: `docker compose up -d`, then `npm run db:setup` (migrate + seed).
Gates, in the order the pipeline runs them: `npm run typecheck && npm run lint && npm run test && npm run build`.
`next build` must stay independent of `DATABASE_URL`; every page that queries the DB is server-rendered on demand.

## Direction

The product is heading from a single-user local app to a subscription service.
[SPEC.md](./SPEC.md) holds the roadmap, the plans and the Jarvis architecture;
[DECISIONS.md](./DECISIONS.md) holds why each choice was made.

Two consequences that bind work happening **before** that migration lands:

**Every new database query will need a tenant filter.** The schema has no
organisation yet, so nothing enforces it today — which is exactly why a query
written now is easy to write wrong. When adding a server action or a Prisma
call, keep the data access in one place per entity rather than scattering
`prisma.recipe.findMany` across pages: a filter added later has to be added
once, not fifteen times. A leak between two customers is the failure mode that
closes a business, and it is the top risk in SPEC.md §7.

**The language model never computes.** It picks which action and with which
parameters; POD, PAC, solids and costs come from `src/domain/` and nowhere else.
Metrics reach the voice layer already calculated and already formatted as
strings, deliberately, so there is nothing to do with them but read them aloud.

## Sharp edges

**Base UI primitives are not always `<button>`.** `Checkbox.Root` renders `<span role="checkbox">`, which is
`display: inline` — and CSS width/height do not apply to non-replaced inline boxes. A Tailwind `size-*` utility
on such a root silently does nothing and the control collapses to a few pixels, unclickable, with no console
error. Always pair a size utility with an explicit display (`inline-flex`). `src/components/ui/checkbox.test.tsx`
locks this invariant.

**Do not pass `render={<span/>}` or `render={<Link/>}` to `Button`.** Base UI's button expects a native
`<button>` and logs an error per render otherwise, and the element loses its `button` role in the accessibility
tree. For links that look like buttons use `<Link className={buttonVariants({...})}>`, the pattern already used
across `src/app`.

**`useTransition` does not track Server Action completion.** These actions call `revalidatePath`, and the RSC
refresh it triggers stays inside the transition, so `isPending` never returns to false. Use explicit state for
"saving/saved" indicators — see `RecipeEditor` in `src/features/recipes/recipe-editor.tsx`.

**Functions cannot cross the Server → Client boundary as props.** Nav items carry Lucide icon components, so
they are defined inside the client module `src/components/nav-links.tsx`, not in the server `layout.tsx`.

## Domain conventions

POD/PAC coefficients are stored on a percent scale (sucrose = 100), so a row's raw `qty × coefficient` is
~1000× the mixture-level figure. Tables must show `contribution.podShare` / `pacShare`, which are normalised by
batch weight and therefore sum to the aggregate `metrics.pod` / `metrics.pac` shown in the footer.

`calculateRecipe` never throws on bad input: an unresolvable ingredient or a missing `costPerKg` is skipped and
reported through `metrics.warnings`. Surface those warnings in the UI — silently absorbing them is how a
confidently wrong cost or a non-contributing ingredient reaches the user.

All user-facing numbers are Italian-formatted: `formatNumberIt` for standalone values, `formatFixedIt` where
values are read side by side (ranges, before/after deltas), `formatEuro` for money. Never `toFixed`. Derive
displayed deltas from the displayed (rounded) operands, or the row contradicts itself.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
