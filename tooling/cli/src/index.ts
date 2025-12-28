#!/usr/bin/env node

/**
 * Signal Blueprint CLI
 */

import * as fs from "fs";
import * as path from "path";

const command = process.argv[2];
const subcommand = process.argv[3];

async function main() {
  try {
    switch (command) {
      case "apps":
        await runAppsCommand();
        break;
      case "create-app":
        await runCreateAppCommand();
        break;
      case "ai:demo":
        await runAiDemoCommand();
        break;
      case "cache:stats":
        await runCacheStatsCommand();
        break;
      case "cost:stats":
        await runCostStatsCommand();
        break;
      case "seed:demo":
        await runSeedDemoCommand();
        break;
      case "qb:status":
        await runQbStatusCommand();
        break;
      case "orgs:list":
        await runOrgsListCommand();
        break;
      default:
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
Signal Blueprint CLI

Usage: pnpm sb <command>

Commands:
  apps          List all suite apps
  create-app    Create a new app skeleton
  ai:demo       Run clarify/decompose demo for a sample goal
  cache:stats   Show cache statistics
  cost:stats    Show cost and telemetry statistics
  seed:demo     Seed demo org with members and sample goal
  qb:status     Show Questboard status (counts and job summaries)
  orgs:list     List all organizations with their IDs
  `);
}

async function runAppsCommand() {
  const { SUITE_APPS } = await import("@sb/suite");
  
  console.log("\n📦 Suite Apps:\n");
  SUITE_APPS.forEach((app) => {
    console.log(`  ${app.id.padEnd(15)} ${app.title}`);
    console.log(`  ${"".padEnd(15)} Status: ${app.status}`);
    console.log(`  ${"".padEnd(15)} Purpose: ${app.purpose}`);
    console.log("");
  });
}

async function runCreateAppCommand() {
  // Import and run the create-app script logic directly
  const createAppScript = path.join(process.cwd(), "tooling", "scripts", "create-app.ts");
  if (!fs.existsSync(createAppScript)) {
    console.error("❌ Error: create-app script not found");
    process.exit(1);
  }
  
  // Use dynamic import to run the script
  // The script will handle its own execution via the shebang
  const { execSync } = await import("child_process");
  const tsxPath = path.join(process.cwd(), "node_modules", ".bin", "tsx");
  
  const args = process.argv.slice(3);
  
  try {
    execSync(`${tsxPath} ${createAppScript} ${args.join(" ")}`, {
      stdio: "inherit",
      shell: true,
    });
  } catch (error) {
    // Error already printed by the script
    process.exit(1);
  }
}

async function runAiDemoCommand() {
  const { runClarifyGoal, runDecomposeGoal } = await import("@sb/ai");
  
  const sampleGoal = "Build a marketing website for our new product";
  
  console.log(`\n🤖 AI Demo: Processing goal "${sampleGoal}"\n`);
  
  // Run clarify
  console.log("1. Clarifying goal...");
  const clarifyStart = Date.now();
  const clarifyResult = await runClarifyGoal(sampleGoal);
  const clarifyDuration = Date.now() - clarifyStart;
  
  console.log(`   ✅ Clarified in ${clarifyDuration}ms`);
  console.log(`   What: ${clarifyResult.clarified.what.substring(0, 60)}...`);
  console.log(`   Why: ${clarifyResult.clarified.why.substring(0, 60)}...`);
  console.log("");
  
  // Run decompose
  console.log("2. Decomposing into questlines...");
  const decomposeStart = Date.now();
  const decomposeResult = await runDecomposeGoal("demo-goal-1", clarifyResult);
  const decomposeDuration = Date.now() - decomposeStart;
  
  console.log(`   ✅ Decomposed in ${decomposeDuration}ms`);
  console.log(`   Questlines: ${decomposeResult.questlines.length}`);
  console.log(`   Complexity: ${decomposeResult.estimatedComplexity}`);
  console.log("");
  
  // Check cache stats (via telemetry) before second run
  const { getTelemetryState } = await import("@sb/telemetry");
  const state = getTelemetryState();
  
  console.log("📊 Telemetry (after first run):");
  console.log(`   Total calls: ${state.totalCalls}`);
  console.log(`   Cached calls: ${state.cachedCalls}`);
  console.log(`   Cache hit rate: ${state.totalCalls > 0 ? ((state.cachedCalls / state.totalCalls) * 100).toFixed(1) : 0}%`);
  console.log("");
  
  // Run again to demonstrate caching
  console.log("3. Running again (should hit cache)...");
  const clarifyStart2 = Date.now();
  await runClarifyGoal(sampleGoal);
  const clarifyDuration2 = Date.now() - clarifyStart2;
  
  const state2 = getTelemetryState();
  const wasCached = state2.cachedCalls > state.cachedCalls;
  
  console.log(`   ✅ Clarified in ${clarifyDuration2}ms`);
  console.log(`   Cached: ${wasCached ? "✅ true" : "❌ false"}`);
  console.log("");
}

async function runCacheStatsCommand() {
  const { getCacheDir } = await import("@sb/cache");
  
  const cacheDir = getCacheDir();
  
  console.log("\n💾 Cache Statistics:\n");
  console.log(`Cache directory: ${cacheDir}\n`);
  
  if (!fs.existsSync(cacheDir)) {
    console.log("  No cache directory found (cache not yet used)");
    return;
  }
  
  // Count files in cache
  let fileCount = 0;
  let totalSize = 0;
  
  function countFiles(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        countFiles(fullPath);
      } else {
        fileCount++;
        totalSize += fs.statSync(fullPath).size;
      }
    }
  }
  
  countFiles(cacheDir);
  
  console.log(`  Files cached: ${fileCount}`);
  console.log(`  Total size: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log("");
}

async function runCostStatsCommand() {
  const { getTelemetryState } = await import("@sb/telemetry");
  
  const state = getTelemetryState();
  const runlogsDir = path.join(process.cwd(), ".sb", "runlogs");
  
  console.log("\n💰 Cost & Telemetry Statistics:\n");
  
  console.log("In-Memory Counters:");
  console.log(`  Total calls: ${state.totalCalls}`);
  console.log(`  Cached calls: ${state.cachedCalls}`);
  console.log(`  Fresh calls: ${state.totalCalls - state.cachedCalls}`);
  console.log(`  Total tokens: ${state.totalTokens}`);
  console.log(`  Total cost: $${state.totalCost.toFixed(4)}`);
  console.log("");
  
  if (fs.existsSync(runlogsDir)) {
    const logFiles = fs.readdirSync(runlogsDir).filter((f) => f.endsWith(".jsonl"));
    console.log(`Runlogs directory: ${runlogsDir}`);
    console.log(`  Log files: ${logFiles.length}`);
    if (logFiles.length > 0) {
      console.log(`  Latest: ${logFiles[logFiles.length - 1]}`);
    }
  } else {
    console.log("Runlogs directory: Not found (no telemetry events yet)");
  }
  
  console.log("");
}

async function runSeedDemoCommand() {
  const seedScript = path.join(process.cwd(), "tooling", "scripts", "seed-demo.ts");
  if (!fs.existsSync(seedScript)) {
    console.error("❌ Error: seed-demo script not found");
    process.exit(1);
  }
  
  // Use dynamic import to run the script
  const { execSync } = await import("child_process");
  const tsxPath = path.join(process.cwd(), "node_modules", ".bin", "tsx");
  
  try {
    execSync(`${tsxPath} ${seedScript}`, {
      stdio: "inherit",
      shell: true,
    });
  } catch (error) {
    // Error already printed by the script
    process.exit(1);
  }
}

async function runQbStatusCommand() {
  const { getStorageInfo } = await import("@sb/storage");
  const { getEntityCounts, getJobRunSummaries } = await import("../../apps/questboard/src/store.ts");
  
  const orgId = process.argv[3] || "default-org";
  
  console.log(`\n🔍 Questboard Status (org: ${orgId})\n`);
  
  // Storage info
  const storageInfo = getStorageInfo();
  console.log("💾 Storage:");
  console.log(`   Mode: ${storageInfo.mode}`);
  if (storageInfo.mode === "LocalJson") {
    console.log(`   Data Directory: ${storageInfo.config.dataDir}`);
  } else {
    console.log(`   Supabase URL: ${storageInfo.config.supabaseUrl?.substring(0, 50)}...`);
  }
  console.log("");
  
  // Entity counts
  console.log("📊 Entity Counts:");
  try {
    const counts = await getEntityCounts(orgId);
    console.log(`   Goals: ${counts.goals}`);
    console.log(`   Questlines: ${counts.questlines}`);
    console.log(`   Quests: ${counts.quests}`);
    console.log(`   Tasks: ${counts.tasks}`);
    console.log(`   Decks: ${counts.decks}`);
    console.log(`   Sprint Plans: ${counts.sprintPlans}`);
  } catch (error) {
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
  }
  console.log("");
  
  // Job summaries
  console.log("⚙️  Recent Job Runs:");
  try {
    const summaries = await getJobRunSummaries(orgId, 10);
    if (summaries.length === 0) {
      console.log("   No job runs yet.");
    } else {
      summaries.forEach((summary) => {
        const statusIcon = summary.status === "success" ? "✅" : summary.status === "failed" ? "❌" : "⚠️";
        const duration = Math.round(
          (new Date(summary.finishedAt).getTime() - new Date(summary.startedAt).getTime()) / 1000
        );
        console.log(`   ${statusIcon} ${summary.jobId} (${summary.status}) - ${duration}s`);
        if (summary.stats) {
          const statsStr = Object.entries(summary.stats)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => `${k}=${v}`)
            .join(", ");
          if (statsStr) {
            console.log(`      ${statsStr}`);
          }
        }
        if (summary.error) {
          console.log(`      Error: ${summary.error}`);
        }
        console.log(`      Finished: ${new Date(summary.finishedAt).toLocaleString()}`);
        console.log("");
      });
    }
  } catch (error) {
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
  }
  console.log("");
}

async function runOrgsListCommand() {
  const { listOrgs, getEntityCounts } = await import("../../apps/questboard/src/store.ts");
  
  console.log("\n🏢 Organizations:\n");
  
  try {
    const orgs = await listOrgs();
    
    if (orgs.length === 0) {
      console.log("  No orgs found.");
      console.log("  Run 'pnpm sb seed:demo' to create one.\n");
      return;
    }
    
    for (const org of orgs) {
      const counts = await getEntityCounts(org.id);
      console.log(`  ${org.id}`);
      if (org.name && org.name !== org.id) {
        console.log(`    Name: ${org.name}`);
      }
      console.log(`    Counts: goals=${counts.goals}, questlines=${counts.questlines}, quests=${counts.quests}, tasks=${counts.tasks}`);
      console.log("");
    }
  } catch (error) {
    console.error(`Error listing orgs: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
