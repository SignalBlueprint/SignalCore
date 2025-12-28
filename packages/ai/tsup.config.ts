import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    "@sb/config",
    "@sb/cache",
    "@sb/events",
    "@sb/telemetry",
    "@sb/schemas",
  ],
});


