/**
 * Boundary guardrail script
 * Checks that apps do not import from other apps
 */

import * as fs from "fs";
import * as path from "path";

const APPS_DIR = path.join(process.cwd(), "apps");
const PACKAGES_DIR = path.join(process.cwd(), "packages");

interface Violation {
  file: string;
  line: number;
  importPath: string;
}

function findAppDirectories(): string[] {
  if (!fs.existsSync(APPS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(APPS_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

function findFilesInDirectory(dir: string, extensions: string[] = [".ts", ".tsx"]): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== "dist") {
      files.push(...findFilesInDirectory(fullPath, extensions));
    } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

function checkFileForViolations(filePath: string, appName: string): Violation[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const violations: Violation[] = [];

  const appImportPatterns = [
    /from\s+['"]\.\.\/\.\.\/apps\//g,
    /from\s+['"]\.\.\/apps\//g,
    /from\s+['"]apps\//g,
    /from\s+['"]\.\.\/\.\.\/\.\.\/apps\//g,
    /import\s+.*\s+from\s+['"]\.\.\/\.\.\/apps\//g,
    /import\s+.*\s+from\s+['"]\.\.\/apps\//g,
    /import\s+.*\s+from\s+['"]apps\//g,
  ];

  lines.forEach((line, index) => {
    for (const pattern of appImportPatterns) {
      if (pattern.test(line)) {
        // Skip if it's importing from the same app (relative import)
        if (!line.includes(`apps/${appName}/`)) {
          violations.push({
            file: filePath,
            line: index + 1,
            importPath: line.trim(),
          });
        }
      }
    }
  });

  return violations;
}

function main() {
  console.log("🔍 Checking for app-to-app imports...\n");

  const apps = findAppDirectories();
  if (apps.length === 0) {
    console.log("No apps found, skipping check.");
    return;
  }

  const allViolations: Violation[] = [];

  for (const app of apps) {
    const appDir = path.join(APPS_DIR, app);
    const files = findFilesInDirectory(appDir);
    console.log(`Checking ${app} (${files.length} files)...`);

    for (const file of files) {
      const violations = checkFileForViolations(file, app);
      allViolations.push(...violations);
    }
  }

  if (allViolations.length > 0) {
    console.error("\n❌ Found violations: Apps cannot import from other apps!\n");
    allViolations.forEach((violation) => {
      const relativePath = path.relative(process.cwd(), violation.file);
      console.error(`  ${relativePath}:${violation.line}`);
      console.error(`    ${violation.importPath}`);
      console.error("");
    });
    console.error(
      "💡 Use packages (@sb/*) for shared code or communicate via events instead.\n"
    );
    process.exit(1);
  } else {
    console.log("\n✅ No app-to-app import violations found!\n");
  }
}

main();


