import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// 단위 테스트(tests/unit)와 DB 규칙 테스트(tests/db)는 프로젝트를 나눠 따로 돌린다.
// DB 테스트는 로컬 Supabase(`supabase start` → `pnpm env:local`)가 켜져 있어야 한다.
export default defineConfig(({ mode }) => ({
  resolve: { tsconfigPaths: true },
  test: {
    env: loadEnv(mode, process.cwd(), ""),
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        extends: true,
        test: {
          name: "db",
          include: ["tests/db/**/*.test.ts"],
          environment: "node",
          fileParallelism: false,
          testTimeout: 20_000,
        },
      },
    ],
  },
}));
