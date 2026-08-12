# Contributing

## Setup

```bash
npm install
cp .env.example .env       # imposta DATABASE_URL
npx prisma generate
npm run db:setup           # migrate + seed
npm run dev
```

`npx prisma generate` va eseguito prima di qualsiasi `typecheck` o `build`
su un checkout pulito: senza il client generato TypeScript non trova i
tipi del database.

## I quattro controlli

La CI li esegue su ogni push e pull request. Eseguili prima di pushare:

```bash
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm test              # vitest run
npm run build         # next build
```

`npm run format` applica prettier.

## Convenzioni

- **Il dominio resta puro.** `src/domain/` non importa Prisma, Next o
  React. È dove vivono i calcoli (POD, PAC, solidi, solver) e per questo
  è la parte più densa di test: si testa chiamando funzioni, senza
  database né rendering.
- **Gli helper puri stanno in un modulo a parte.** `format.ts` accanto a
  `route.ts` esiste perché importare la route tira dentro il client
  Prisma, e un test di escaping CSV non deve richiedere un database.
- **Escaping e sanitizzazione hanno sempre un test.** Vedi
  `export.test.ts`: ogni carattere neutralizzato è lì perché rompeva
  qualcosa (formule Excel, header HTTP). Se tocchi quelle funzioni, i
  test devono restare verdi o cambiare per un motivo dichiarato.
- **Le validazioni usano allow-list, non deny-list.** `isExportFormat`
  elenca ciò che è ammesso invece di scartare ciò che non lo è.

## Test

```
src/domain/calculations/     calcoli e solver
src/infrastructure/          seed e mapper
src/components/ui/           componenti, via renderToStaticMarkup
src/app/api/.../export/      escaping CSV e nomi file
```

Ogni comportamento nuovo vuole un test. Ogni bug fix vuole un test che
fallisce prima del fix.

## Commit

Conventional commits — `feat:`, `fix:`, `docs:`, `refactor:`, `test:`,
`chore:`. Il corpo spiega il *perché*; il diff mostra già il cosa.
