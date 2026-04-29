import { defineConfig } from "tsup";

// Bundle the CLI entry. Workspace deps (@devness/useai-*) get inlined so the
// published tarball doesn't reference packages that aren't on npm. The library
// re-exports in src/index.ts are emitted by tsc via `pnpm build` and shipped
// alongside dist/cli.js for the workspace daemon's consumption.
export default defineConfig({
  entry: { cli: "src/cli/index.ts" },
  format: ["esm"],
  target: "node20",
  platform: "node",
  splitting: false,
  clean: false,
  dts: false,
  sourcemap: false,
  minify: false,
  shims: true,
  noExternal: [/^@devness\/useai-/],
  banner: { js: "#!/usr/bin/env node" },
});
