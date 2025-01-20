# Gomoku platform
> [!WARNING]
This project is work in progress. You should probably not even try to run it.

## Prerequisites
- Postgres; table and user name must match those in backend/.env; tables must be generated using `npx prisma db push`
- npm

## Running
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
If you are interested in Gomoku, also called Piškvorky (in Czechia) or Five-in-a-Row, go play it on [playfive](http://playfive.net), [PlayOK](https://playok.net) or join [Gomoku club discord](https://discord.gg/FHTqjG42Bh).
