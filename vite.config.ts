import { defineConfig } from "vitest/config";

import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";

import pkg from "./package.json";

export default defineConfig({
  plugins: [react(), legacy()],
  define: {
    ...Object.fromEntries(
      Object.entries(pkg)
        .filter(([, s]) => typeof s === "string")
        .map(([k, v]) => [
          `import.meta.env.${k.toUpperCase()}`,
          JSON.stringify(v),
        ]),
    ),
  },
  test: {
    globals: true,
    passWithNoTests: true,
  },
});
