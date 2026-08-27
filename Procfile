web: (cd apps/api 2>/dev/null || true) && npx prisma generate && tsc && npx prisma db push --accept-data-loss && node dist/server.js
