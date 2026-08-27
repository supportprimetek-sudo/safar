web: sh -c "if [ -d apps/api ]; then cd apps/api; fi && npx prisma generate && tsc && npx prisma db push --accept-data-loss && node dist/server.js"
