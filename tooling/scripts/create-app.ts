#!/usr/bin/env node

/**
 * Create App Script
 * Generates a new app skeleton with consistent structure
 */

import * as fs from "fs";
import * as path from "path";

const APP_NAME = process.argv[2];

if (!APP_NAME) {
  console.error("❌ Error: App name is required");
  console.error("\nUsage: pnpm sb create-app <name>");
  process.exit(1);
}

// Validate app name (lowercase, alphanumeric + hyphens)
if (!/^[a-z0-9-]+$/.test(APP_NAME)) {
  console.error("❌ Error: App name must be lowercase alphanumeric with hyphens only");
  console.error("   Example: demoapp, my-app, test123");
  process.exit(1);
}

const APPS_DIR = path.join(process.cwd(), "apps");
const APP_DIR = path.join(APPS_DIR, APP_NAME);
const REGISTRY_PATH = path.join(process.cwd(), "packages", "suite", "src", "registry.ts");

// Check if app already exists
if (fs.existsSync(APP_DIR)) {
  console.error(`❌ Error: App "${APP_NAME}" already exists at ${APP_DIR}`);
  process.exit(1);
}

// Ensure apps directory exists
if (!fs.existsSync(APPS_DIR)) {
  fs.mkdirSync(APPS_DIR, { recursive: true });
}

// Helper to convert kebab-case to Title Case
function toTitleCase(str: string): string {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Create app directory structure
console.log(`\n📦 Creating app: ${APP_NAME}\n`);

// Create directories
fs.mkdirSync(APP_DIR, { recursive: true });
fs.mkdirSync(path.join(APP_DIR, "src"), { recursive: true });

// Create package.json
const packageJson = {
  name: APP_NAME,
  version: "0.1.0",
  private: true,
  scripts: {
    dev: "tsx src/index.ts",
    build: "tsc -p tsconfig.json",
    typecheck: "tsc -p tsconfig.json --noEmit",
    lint: "eslint .",
  },
  devDependencies: {
    typescript: "^5.0.0",
    tsx: "^4.0.0",
  },
};

fs.writeFileSync(
  path.join(APP_DIR, "package.json"),
  JSON.stringify(packageJson, null, 2) + "\n"
);
console.log("  ✅ Created package.json");

// Create tsconfig.json
const tsconfig = {
  extends: "../../tsconfig.json",
  compilerOptions: {
    outDir: "./dist",
    rootDir: "./src",
    noEmit: false,
  },
  include: ["src/**/*"],
  exclude: ["node_modules", "dist"],
};

fs.writeFileSync(
  path.join(APP_DIR, "tsconfig.json"),
  JSON.stringify(tsconfig, null, 2) + "\n"
);
console.log("  ✅ Created tsconfig.json");

// Create src/index.ts
const indexTs = `console.log("[${APP_NAME}] booted (skeleton). See docs/SUITE_MAP.md");

`;

fs.writeFileSync(path.join(APP_DIR, "src", "index.ts"), indexTs);
console.log("  ✅ Created src/index.ts");

// Create README.md
const appTitle = toTitleCase(APP_NAME);
const readme = `# ${appTitle}

[Add description of what this app does]

## Purpose

[Describe the purpose and goals of this app]

## Near-Term MVP

- [Add MVP features here]

`;

fs.writeFileSync(path.join(APP_DIR, "README.md"), readme);
console.log("  ✅ Created README.md");

// Update registry.ts
console.log("\n📝 Updating suite registry...");

if (!fs.existsSync(REGISTRY_PATH)) {
  console.error(`❌ Error: Registry file not found at ${REGISTRY_PATH}`);
  process.exit(1);
}

let registryContent = fs.readFileSync(REGISTRY_PATH, "utf-8");

// Check if app already exists in registry
if (registryContent.includes(`"${APP_NAME}"`)) {
  console.error(`❌ Error: App "${APP_NAME}" already exists in registry`);
  process.exit(1);
}

// Add to AppId union type - use a more flexible pattern that matches multiline
const appIdUnionPattern = /(export type AppId\s*=\s*[^;]+);/s;
const match = registryContent.match(appIdUnionPattern);

if (!match) {
  console.error("❌ Error: Could not find AppId union type in registry");
  process.exit(1);
}

// Add new app ID to union - find the last line and add after it, before semicolon
const existingUnion = match[1];
// Split by newlines to find where to insert
const lines = existingUnion.split("\n");
// Find the last line with a pipe (the last app ID)
let lastPipeIndex = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].trim().startsWith("|")) {
    lastPipeIndex = i;
    break;
  }
}

if (lastPipeIndex === -1) {
  console.error("❌ Error: Could not find last app ID in union type");
  process.exit(1);
}

// Insert the new app ID after the last pipe line
const newAppIdLine = `  | "${APP_NAME}"`;
lines.splice(lastPipeIndex + 1, 0, newAppIdLine);
const updatedUnion = lines.join("\n");

registryContent = registryContent.replace(appIdUnionPattern, updatedUnion + ";");

// Add to SUITE_APPS array - find the last entry and add before closing bracket
// Look for the pattern: }, followed by newline, whitespace and ];
const suiteAppsPattern = /(\s+}\s*,\s*\n\s+];\s*$)/m;
const newAppEntry = `  {
    id: "${APP_NAME}",
    title: "${appTitle}",
    purpose: "[Add purpose description]",
    status: "skeleton",
    owners: ["@signal-blueprint/platform"],
  },
`;

if (!suiteAppsPattern.test(registryContent)) {
  // Try alternative patterns - match the last entry's closing brace and the array closing
  const altPattern1 = /(\s+}\s*,\s*\n\s*];\s*$)/m;
  const altPattern2 = /(\s+}\s*\n\s+];\s*$)/m;
  
  if (altPattern1.test(registryContent)) {
    registryContent = registryContent.replace(altPattern1, newAppEntry + "$1");
  } else if (altPattern2.test(registryContent)) {
    registryContent = registryContent.replace(altPattern2, newAppEntry + "$1");
  } else {
    // Last resort: find the last }, and replace with new entry + },
    const lastEntryPattern = /(\s+}\s*,\s*)(\n\s+];\s*$)/m;
    if (lastEntryPattern.test(registryContent)) {
      registryContent = registryContent.replace(lastEntryPattern, "$1\n" + newAppEntry + "$2");
    } else {
      console.error("❌ Error: Could not find SUITE_APPS array end in registry");
      process.exit(1);
    }
  }
} else {
  // Insert before the closing bracket, ensuring proper formatting
  registryContent = registryContent.replace(suiteAppsPattern, newAppEntry + "$1");
}

fs.writeFileSync(REGISTRY_PATH, registryContent);
console.log("  ✅ Updated registry.ts");

console.log(`\n✅ App "${APP_NAME}" created successfully!\n`);
console.log(`Next steps:`);
console.log(`  1. Update apps/${APP_NAME}/README.md with app details`);
console.log(`  2. Update the purpose in packages/suite/src/registry.ts`);
console.log(`  3. Start developing: pnpm --filter ${APP_NAME} dev\n`);

