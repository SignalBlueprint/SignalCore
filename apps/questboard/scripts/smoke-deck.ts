#!/usr/bin/env tsx
/**
 * Smoke test for Daily Deck generation
 *
 * This script:
 * 1. Seeds demo data if needed
 * 2. Runs questmaster once
 * 3. Asserts that a deck exists with >=1 item OR warnings explaining 0 items
 */

import { storage } from "@sb/storage";
import { runQuestmaster } from "../src/questmaster";
import { getEntityCounts } from "../src/store";
import type { DailyDeck } from "@sb/schemas";

const DAILY_DECK_KIND = "daily_decks";
const TEST_ORG_ID = "demo-org";

async function seedDemoDataIfNeeded() {
  const counts = await getEntityCounts(TEST_ORG_ID);

  if (counts.tasks === 0 && counts.quests === 0) {
    console.log("   No data found. Seeding demo data via API...");

    // Call seed-demo endpoint
    const response = await fetch("http://localhost:3000/api/seed-demo", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Failed to seed demo data: HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log(`   ✓ Demo data seeded: ${result.data.tasks} tasks, ${result.data.quests} quests\n`);
    return true;
  }

  console.log(`   ✓ Found existing data: ${counts.tasks} tasks, ${counts.quests} quests\n`);
  return false;
}

async function main() {
  console.log("🧪 Daily Deck Smoke Test");
  console.log("========================\n");

  try {
    // Step 1: Check if data exists, seed if needed
    console.log("1. Checking for existing data...");
    await seedDemoDataIfNeeded();

    // Step 2: Run questmaster
    console.log("2. Running Questmaster...");
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const jobRunId = `smoke-test-${Date.now()}`;

    const stats = await runQuestmaster(TEST_ORG_ID, now, jobRunId);
    console.log("   ✓ Questmaster completed");
    console.log(`   - Goals: ${stats.goals}`);
    console.log(`   - Questlines: ${stats.questlines}`);
    console.log(`   - Quests: ${stats.quests}`);
    console.log(`   - Tasks: ${stats.tasks}`);
    console.log(`   - Decks generated: ${stats.decksGenerated}`);
    console.log(`   - Daily deck tasks: ${stats.dailyDeckTasks}`);
    console.log(`   - Daily deck warnings: ${stats.dailyDeckWarnings}\n`);

    // Step 3: Verify deck exists
    console.log("3. Verifying Daily Deck...");
    const deckId = `daily-deck-${TEST_ORG_ID}-${today}`;
    const deck = await storage.get<DailyDeck>(DAILY_DECK_KIND, deckId);

    if (!deck) {
      console.error("   ✗ FAILED: Daily Deck not found!");
      process.exit(1);
    }

    console.log(`   ✓ Daily Deck found (ID: ${deck.id})`);
    console.log(`   - Date: ${deck.date}`);
    console.log(`   - Generated at: ${deck.generatedAt}`);
    console.log(`   - Job run ID: ${deck.jobRunId || "N/A"}`);
    console.log(`   - Tasks in deck: ${deck.items.length}`);
    console.log(`   - Tasks considered: ${deck.summary.tasksConsidered}`);
    console.log(`   - Total estimated minutes: ${deck.summary.totalEstimatedMinutes}`);
    console.log(`   - Team capacity entries: ${deck.teamCapacity.length}`);
    console.log(`   - Warnings: ${deck.summary.warnings?.length || 0}\n`);

    // Step 4: Assert deck has items OR warnings explaining why not
    console.log("4. Validating deck content...");

    if (deck.items.length === 0) {
      // No tasks in deck - must have warnings explaining why
      if (!deck.summary.warnings || deck.summary.warnings.length === 0) {
        console.error("   ✗ FAILED: Deck has 0 items but no warnings!");
        console.error("   Expected warnings to explain why no tasks were selected.");
        process.exit(1);
      }

      console.log("   ⚠️  Deck has 0 items (expected with warnings)");
      console.log("   Warnings:");
      deck.summary.warnings.forEach((warning, idx) => {
        console.log(`      ${idx + 1}. ${warning}`);
      });
      console.log("");
    } else {
      console.log(`   ✓ Deck has ${deck.items.length} item(s)`);

      // Show deck items
      console.log("\n   Deck items:");
      deck.items.forEach((item, idx) => {
        console.log(`      ${idx + 1}. [${item.priority.toUpperCase()}] ${item.taskTitle}`);
        console.log(`         Quest: ${item.questTitle}`);
        console.log(`         Questline: ${item.questlineTitle}`);
        console.log(`         Assigned: ${item.assignedToMemberEmail || "unassigned"}`);
        console.log(`         Estimate: ${item.estimatedMinutes} min`);
        console.log(`         Reason: ${item.reason}`);
        console.log(`         Phase: ${item.phase || "N/A"}`);
        console.log("");
      });

      // Show capacity
      if (deck.teamCapacity.length > 0) {
        console.log("   Team capacity:");
        deck.teamCapacity.forEach((member) => {
          const utilizationColor = member.utilizationPercent > 100 ? "🔴" :
                                   member.utilizationPercent > 80 ? "🟡" : "🟢";
          console.log(`      ${utilizationColor} ${member.memberEmail}: ${member.plannedMinutes}/${member.capacityMinutes} min (${member.utilizationPercent}%)`);
        });
        console.log("");
      }

      // Show warnings if any
      if (deck.summary.warnings && deck.summary.warnings.length > 0) {
        console.log("   Warnings:");
        deck.summary.warnings.forEach((warning, idx) => {
          console.log(`      ${idx + 1}. ${warning}`);
        });
        console.log("");
      }
    }

    // Step 5: Verify job run linkage
    console.log("5. Verifying job run linkage...");
    if (deck.jobRunId) {
      console.log(`   ✓ Daily Deck is linked to job run: ${deck.jobRunId}\n`);
    } else {
      console.log(`   ⚠️  Daily Deck has no job run ID (optional)\n`);
    }

    console.log("========================");
    console.log("✅ ALL TESTS PASSED!");
    console.log("========================\n");

    process.exit(0);

  } catch (error) {
    console.error("\n❌ SMOKE TEST FAILED");
    console.error("========================");
    console.error(error);
    console.error("========================\n");
    process.exit(1);
  }
}

main();
