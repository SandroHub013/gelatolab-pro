# GelatoLab Pro 🍨

Webapp professionale per creazione, calibrazione, archiviazione e ottimizzazione di ricette di gelato artigianale.

## Requisiti

- Node.js 20+
- Docker (per PostgreSQL)

## Avvio rapido

```bash
# 1. Avvia PostgreSQL
docker compose up -d

# 2. Installa dipendenze
npm install

# 3. Setup database (migrazioni + seed)
npm run db:setup

# 4. Avvia in sviluppo
npm run dev
```

In alternativa, tutto in un comando:
```bash
docker compose up
```

## Tecnologie

- **Frontend**: Next.js (App Router), TypeScript strict, Tailwind CSS, shadcn/ui
- **Stato**: Zustand + zundo (undo/redo)
- **Form**: React Hook Form + Zod (schemi condivisi client/server)
- **Tabelle/Grafici**: TanStack Table, Recharts
- **Backend**: Server Actions, Prisma + PostgreSQL
- **Solver**: HiGHS via WASM (programmazione lineare)
- **Test**: Vitest (unit/integration), Playwright (E2E)

## Struttura

```
src/
├── app/                    # Next.js App Router pages
├── components/             # UI components condivisi
├── features/               # Feature modules
│   ├── recipes/
│   ├── ingredients/
│   ├── presets/
│   ├── calibration/
│   ├── optimizer/
│   ├── production/
│   └── costs/
├── domain/                 # Pure domain logic (zero React/DB deps)
│   ├── entities/
│   ├── calculations/
│   ├── constraints/
│   └── validation/
├── infrastructure/         # Database, repositories, export
├── lib/                    # Utility functions
├── hooks/                  # React hooks
├── stores/                 # Zustand stores
└── types/                  # TypeScript types
```

## Comandi

| Comando | Descrizione |
|---|---|
| `npm run dev` | Avvia sviluppo |
| `npm run build` | Build produzione |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run test:e2e` | Playwright E2E |
| `npm run db:setup` | Migrazioni + seed |
| `npm run db:studio` | Prisma Studio |

## Documentazione

Vedi [SPEC.md](./SPEC.md) per la specifica completa e [DECISIONS.md](./DECISIONS.md) per le decisioni di sviluppo.
