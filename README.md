# Gomoku platform
> [!WARNING]
This project is not finished.

## Prerequisites
- PostgreSQL with table and user matching backend/.env. Tables must be generated using `npx prisma db push`.
- npm

## Running (development)
### Frontend (SvelteKit)
In folder `frontend`, run:
```bash
npm run dev --
```
Add `--open` to open in default browser

### Backend (pure TypeScript)
In folder `backend`, run:
```bash
npx tsx watch src/main.ts
```

## Playing
If you are interested in Gomoku, also called Piškvorky (in Czechia) or Five-in-a-Row, go play it on [Playfive](http://playfive.net), [PlayOK](https://playok.net) or join [Gomoku club discord](https://discord.gg/FHTqjG42Bh).
