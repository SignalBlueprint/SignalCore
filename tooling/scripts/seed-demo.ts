#!/usr/bin/env node

/**
 * Seed Demo Script
 * Creates a demo org with members and a sample goal that decomposes into questlines
 */

import { storage } from "@sb/storage";
import { runClarifyGoal, runDecomposeGoal } from "@sb/ai";
import {
  createGoal,
  updateGoal,
  createQuestline,
  createQuest,
  createTask,
  getMembersByOrgId,
  reassignTasks,
} from "../../apps/questboard/src/store";
import { runQuestmaster } from "../../apps/questboard/src/questmaster";
import type { Org, Member, WorkingGeniusProfile } from "@sb/schemas";

const ORG_KIND = "orgs";
const MEMBER_KIND = "members";

// Canned clarify output if AI key is missing
const CANNED_CLARIFY_OUTPUT = {
  goal: "Build a marketing website for our new product",
  clarified: {
    what: "Create a responsive marketing website showcasing our new product with key features, pricing, testimonials, and a contact form",
    why: "To establish online presence, generate leads, and provide potential customers with product information and a way to get in touch",
    success: "Website is live, receives 100+ visitors per day, generates 10+ leads per week, and has a conversion rate of 5% or higher",
    constraints: [
      "Must be mobile-responsive",
      "Must load in under 3 seconds",
      "Must be accessible (WCAG 2.1 AA)",
      "Must integrate with our CRM",
    ],
  },
};

// Canned decompose output if AI key is missing
const CANNED_DECOMPOSE_OUTPUT = {
  goalId: "demo-goal-1",
  questlines: [
    {
      id: "ql1",
      title: "Design & Content Strategy",
      description: "Define visual identity, content structure, and user experience flow",
      order: 1,
      locked: false,
      prerequisiteIds: [],
    },
    {
      id: "ql2",
      title: "Frontend Development",
      description: "Build responsive website with modern UI components and interactions",
      order: 2,
      locked: false,
      prerequisiteIds: ["ql1"],
    },
    {
      id: "ql3",
      title: "Backend & Integration",
      description: "Set up server, database, CRM integration, and form handling",
      order: 3,
      locked: false,
      prerequisiteIds: ["ql2"],
    },
    {
      id: "ql4",
      title: "Testing & Launch",
      description: "Perform QA, performance optimization, and deploy to production",
      order: 4,
      locked: false,
      prerequisiteIds: ["ql3"],
    },
  ],
  estimatedComplexity: "medium",
};

/**
 * Create or get demo org
 */
async function createDemoOrg(): Promise<Org> {
  const orgId = "demo-org";
  let org = await storage.get<Org>(ORG_KIND, orgId);

  if (!org) {
    org = {
      id: orgId,
      name: "Demo Organization",
      createdAt: new Date().toISOString(),
      notificationSettings: {
        slackEnabled: false,
        emailEnabled: false,
      },
    };
    await storage.upsert(ORG_KIND, org);
    console.log("✅ Created demo org");
  } else {
    console.log("ℹ️  Demo org already exists");
  }

  return org;
}

/**
 * Create demo members with different Working Genius profiles
 */
async function createDemoMembers(orgId: string): Promise<Member[]> {
  const members: Member[] = [
    {
      id: "member-alice",
      orgId,
      email: "alice@demo.com",
      role: "admin",
      workingGeniusProfile: {
        top2: ["Wonder", "Invention"],
        competency2: ["Discernment", "Galvanizing"],
        frustration2: ["Tenacity", "Enablement"],
      },
      dailyCapacityMinutes: 480, // 8 hours
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "member-bob",
      orgId,
      email: "bob@demo.com",
      role: "member",
      workingGeniusProfile: {
        top2: ["Tenacity", "Enablement"],
        competency2: ["Galvanizing", "Discernment"],
        frustration2: ["Wonder", "Invention"],
      },
      dailyCapacityMinutes: 360, // 6 hours
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "member-charlie",
      orgId,
      email: "charlie@demo.com",
      role: "member",
      workingGeniusProfile: {
        top2: ["Discernment", "Galvanizing"],
        competency2: ["Enablement", "Tenacity"],
        frustration2: ["Wonder", "Invention"],
      },
      dailyCapacityMinutes: 420, // 7 hours
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const created: Member[] = [];
  for (const member of members) {
    const existing = await storage.get<Member>(MEMBER_KIND, member.id);
    if (!existing) {
      await storage.upsert(MEMBER_KIND, member);
      created.push(member);
    } else {
      created.push(existing);
    }
  }

  if (created.length === members.length && created.length > 0) {
    console.log(`✅ Created ${created.length} demo members`);
  } else {
    console.log(`ℹ️  Members already exist`);
  }

  return created;
}

/**
 * Check if AI key is available
 */
function hasAiKey(): boolean {
  return !!(
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.AI_API_KEY
  );
}

/**
 * Create and process demo goal
 */
async function createDemoGoal(orgId: string): Promise<void> {
  const goalTitle = "Build a marketing website for our new product";

  // Check if goal already exists
  const existingGoals = await storage.list<any>("goals", (g) => g.orgId === orgId);
  const existing = existingGoals.find((g) => g.title === goalTitle);

  let goal;
  if (existing) {
    console.log("ℹ️  Demo goal already exists, skipping creation");
    goal = existing;
  } else {
    // Create goal
    goal = await createGoal(goalTitle, orgId);
    console.log("✅ Created demo goal");

    // Clarify goal
    console.log("📝 Clarifying goal...");
    let clarifyOutput;
    try {
      if (hasAiKey()) {
        clarifyOutput = await runClarifyGoal(goalTitle);
        console.log("✅ Goal clarified (using AI)");
      } else {
        clarifyOutput = CANNED_CLARIFY_OUTPUT;
        console.log("✅ Goal clarified (using canned output - no AI key)");
      }
    } catch (error) {
      console.warn("⚠️  AI clarify failed, using canned output:", error);
      clarifyOutput = CANNED_CLARIFY_OUTPUT;
    }

    // Update goal with clarify output and approve
    await updateGoal(goal.id, {
      clarifyOutput,
      status: "clarified_pending_approval",
    });

    // Approve goal
    await updateGoal(goal.id, {
      status: "approved",
      approvedAt: new Date().toISOString(),
    });
    console.log("✅ Goal approved");

    // Decompose goal
    console.log("🔨 Decomposing goal into questlines...");
    let decomposeOutput;
    try {
      if (hasAiKey()) {
        decomposeOutput = await runDecomposeGoal(goal.id, clarifyOutput);
        console.log("✅ Goal decomposed (using AI)");
      } else {
        decomposeOutput = { ...CANNED_DECOMPOSE_OUTPUT, goalId: goal.id };
        console.log("✅ Goal decomposed (using canned output - no AI key)");
      }
    } catch (error) {
      console.warn("⚠️  AI decompose failed, using canned output:", error);
      decomposeOutput = { ...CANNED_DECOMPOSE_OUTPUT, goalId: goal.id };
    }

    // Create questlines and quests from decompose output
    // First pass: create all questlines and quests (without prerequisites)
    const questlineMap = new Map<string, any>();
    const questMap = new Map<string, any>();
    
    for (const ql of decomposeOutput.questlines) {
      // Create questline (epic is optional, use description)
      const questline = await createQuestline(orgId, goal.id, ql.title, ql.description);
      questlineMap.set(ql.id, questline);

      // Create quest (prerequisites will be resolved in second pass)
      const quest = await createQuest(
        orgId,
        questline.id,
        ql.title,
        ql.description,
        [] // Start with no prerequisites
      );
      questMap.set(ql.id, quest);
    }
    
    // Second pass: update quests with correct unlock conditions and tasks
    for (const ql of decomposeOutput.questlines) {
      const quest = questMap.get(ql.id);
      const questline = questlineMap.get(ql.id);
      if (!quest || !questline) continue;
      
      // Build unlock conditions from prerequisites
      const unlockConditions = [];
      for (const prereqId of ql.prerequisiteIds || []) {
        const prereqQuest = questMap.get(prereqId);
        if (prereqQuest) {
          unlockConditions.push({
            type: "questCompleted" as const,
            questId: prereqQuest.id,
          });
        }
      }
      
      // Create some sample tasks for the quest
      const taskTitles = [
        `${ql.title}: Initial planning`,
        `${ql.title}: Core implementation`,
        `${ql.title}: Review and refinement`,
      ];

      const taskIds: string[] = [];
      for (const taskTitle of taskTitles) {
        const task = await createTask(orgId, quest.id, taskTitle);
        taskIds.push(task.id);
      }

      // Update quest with task IDs and unlock conditions
      const updatedQuest = {
        ...quest,
        taskIds,
        unlockConditions,
        state: unlockConditions.length > 0 ? ("locked" as const) : ("unlocked" as const),
        updatedAt: new Date().toISOString(),
      };
      await storage.upsert("quests", updatedQuest);

      // Update questline with quest ID
      const updatedQuestline = {
        ...questline,
        questIds: [quest.id],
        updatedAt: new Date().toISOString(),
      };
      await storage.upsert("questlines", updatedQuestline);
    }

    // Update goal with decompose output
    await updateGoal(goal.id, {
      decomposeOutput,
      status: "decomposed",
      decomposedAt: new Date().toISOString(),
    });

    console.log(`✅ Created ${questlineMap.size} questlines with quests and tasks`);
  }

  // Run questmaster to assign tasks and generate decks
  console.log("🎯 Running Questmaster...");
  try {
    await reassignTasks(orgId);
    await runQuestmaster(orgId);
    console.log("✅ Questmaster completed");
  } catch (error) {
    console.warn("⚠️  Questmaster had issues (this is OK):", error);
  }
}

/**
 * Main seed function
 */
async function seedDemo() {
  console.log("\n🌱 Seeding demo data...\n");

  try {
    // 1. Create org
    const org = await createDemoOrg();

    // 2. Create members
    await createDemoMembers(org.id);

    // 3. Create and process goal
    await createDemoGoal(org.id);

    console.log("\n✅ Demo data seeded successfully!");
    console.log("\n📋 Summary:");
    console.log(`   Org ID: ${org.id}`);
    console.log(`   Members: 3 (alice@demo.com, bob@demo.com, charlie@demo.com)`);
    console.log(`   Goal: "Build a marketing website for our new product"`);
    console.log("\n🚀 You can now start the questboard app and see the demo data!");
    console.log("   Run: cd apps/questboard && pnpm dev\n");
  } catch (error) {
    console.error("\n❌ Error seeding demo data:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedDemo();
}

export { seedDemo };

