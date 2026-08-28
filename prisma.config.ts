import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // `migrate deploy` takes a session-level advisory lock, which Neon's
    // pooled "-pooler" endpoint (used by DATABASE_URL at app runtime, see
    // src/lib/prisma.ts) doesn't support — it hangs until Prisma's lock
    // acquisition times out (P1002). CLI/migration commands need the direct,
    // non-pooled connection instead.
    url: process.env["DIRECT_DATABASE_URL"] ?? process.env["DATABASE_URL"],
  },
});
