/**
 * Questmaster service - shared logic for daily questmaster operations
 */

import { storage } from "@sb/storage";
import { getUserQuestDeck } from "@sb/assignment";
import { sendSlackMessage, sendEmail } from "@sb/notify";
import type {
  Goal,
  Questline,
  Quest,
  Task,
  Member,
  MemberQuestDeck,
  Org,
} from "@sb/schemas";
import {
  getQuestsForUser,
  getTasksByQuestId,
  evaluateUnlocks,
  reassignTasks,
  getMembersByOrgId,
  updateTask,
  getOrgById,
} from "./store";
import { publish } from "@sb/events";

const GOAL_KIND = "goals";
const QUESTLINE_KIND = "questlines";
const QUEST_KIND = "quests";
const TASK_KIND = "tasks";
const MEMBER_KIND = "members";
const DECK_KIND = "member_quest_decks";

/**
 * Run Questmaster for an organization
 * Returns stats about what was processed
 */
export async function runQuestmaster(
  orgId: string, 
  now: Date = new Date()
): Promise<{
  goals: number;
  questlines: number;
  quests: number;
  tasks: number;
  decksGenerated: number;
  unlockedQuests: number;
  staleTasks: number;
}> {
  // 1. Get all active entities
  const goals = await storage.list<Goal>(GOAL_KIND, (g) => g.orgId === orgId);
  const questlines = await storage.list<Questline>(
    QUESTLINE_KIND,
    (q) => q.orgId === orgId
  );
  const quests = await storage.list<Quest>(QUEST_KIND, (q) => q.orgId === orgId);
  const tasks = await storage.list<Task>(TASK_KIND, (t) => t.orgId === orgId);
  const members = await getMembersByOrgId(orgId);

  // 2. Recompute unlocks for all quests
  // Track unlocked quests before and after
  const unlockedBefore = quests.filter(q => q.state === "unlocked").length;
  await evaluateUnlocks();
  // Re-fetch quests to get updated state
  const updatedQuests = await storage.list<Quest>(QUEST_KIND, (q) => q.orgId === orgId);
  const unlockedAfter = updatedQuests.filter(q => q.state === "unlocked").length;
  const unlockedQuests = Math.max(0, unlockedAfter - unlockedBefore);

  // 3. Recompute task assignments if needed (only unassigned tasks)
  await reassignTasks(orgId);

  // Get org settings for notifications
  const org = await getOrgById(orgId);
  const notificationSettings = org?.notificationSettings;
  const slackEnabled = notificationSettings?.slackEnabled ?? false;
  const slackChannel = notificationSettings?.slackChannelId;
  const emailEnabled = notificationSettings?.emailEnabled ?? false;

  // 4. Compute each member's deck for today
  const today = now.toISOString().split("T")[0]; // YYYY-MM-DD
  let decksGenerated = 0;

  for (const member of members) {
    if (!member.workingGeniusProfile) {
      continue;
    }

    try {
      // Get member's quest deck
      const deckEntries = await getUserQuestDeck(
        member.id,
        async (userId) => getQuestsForUser(userId, orgId),
        async (questId) => getTasksByQuestId(questId)
      );

      // Persist deck
      const deckId = `deck-${member.id}-${today}`;
      const deck: MemberQuestDeck = {
        id: deckId,
        memberId: member.id,
        orgId: orgId,
        date: today,
        deckEntries: deckEntries.map((entry) => ({
          questId: entry.quest.id,
          questTitle: entry.quest.title,
          taskIds: entry.tasks.map((t) => t.id),
          totalEstimatedMinutes: entry.totalEstimatedMinutes,
        })),
        generatedAt: now.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      await storage.upsert(DECK_KIND, deck);
      decksGenerated++;

      // Emit deck generated event
      await publish(
        "quest.deck.generated",
        {
          memberId: member.id,
          orgId: orgId,
          date: today,
          questCount: deckEntries.length,
          taskCount: deckEntries.reduce(
            (sum, entry) => sum + entry.tasks.length,
            0
          ),
        },
        {
          orgId: orgId,
          sourceApp: "questboard",
        }
      );

      // Send notification digest if enabled
      if (slackEnabled && slackChannel) {
        await sendMemberDigest(member, deckEntries, tasks, slackChannel);
      } else if (emailEnabled && member.email) {
        await sendMemberDigestEmail(member, deckEntries, tasks);
      }
    } catch (error) {
      console.error(`Failed to generate deck for member ${member.id}:`, error);
    }
  }

  // 5. Mark tasks as stale if no update in N hours (default: 48 hours)
  const staleHours = 48;
  const staleThreshold = new Date(now.getTime() - staleHours * 60 * 60 * 1000);

  const activeTasks = tasks.filter(
    (t) => t.status !== "done" && t.status !== "blocked"
  );

  for (const task of activeTasks) {
    const updatedAt = new Date(task.updatedAt);
    if (updatedAt < staleThreshold) {
      await publish(
        "task.stale",
        {
          taskId: task.id,
          taskTitle: task.title,
          lastUpdated: task.updatedAt,
          staleHours: staleHours,
        },
        {
          orgId: orgId,
          sourceApp: "questboard",
        }
      );
    }
  }

  // 6. Flag blocked tasks (if blocker text exists)
  for (const task of tasks) {
    if (task.blockers && task.blockers.length > 0) {
      // Task is already marked as blocked, but emit event if not done
      if (task.status !== "done") {
        await publish(
          "task.blocked",
          {
            taskId: task.id,
            taskTitle: task.title,
            blockers: task.blockers,
          },
          {
            orgId: orgId,
            sourceApp: "questboard",
          }
      );
    }
  }

  // Count stale tasks
  const staleTasks = activeTasks.filter((t) => {
    const updatedAt = new Date(t.updatedAt);
    return updatedAt < staleThreshold;
  }).length;

  return {
    goals: goals.length,
    questlines: questlines.length,
    quests: quests.length,
    tasks: tasks.length,
    decksGenerated,
    unlockedQuests,
    staleTasks,
  };
}

/**
 * Generate and send a concise digest message for a member
 */
async function sendMemberDigest(
  member: Member,
  deckEntries: Array<{
    quest: Quest;
    tasks: Task[];
    microSteps: Array<{ description: string; estimatedMinutes: number }>;
    totalEstimatedMinutes: number;
  }>,
  allTasks: Task[],
  slackChannel: string
): Promise<void> {
  const lines: string[] = [];
  
  lines.push(`🎯 *Daily Quest Deck for ${member.email}*`);
  lines.push("");

  // Today's quests
  if (deckEntries.length > 0) {
    lines.push("*Today's Quests:*");
    for (const entry of deckEntries) {
      lines.push(`• ${entry.quest.title}`);
      if (entry.tasks.length > 0) {
        lines.push(`  Tasks: ${entry.tasks.map(t => t.title).join(", ")}`);
      }
    }
    lines.push("");
  } else {
    lines.push("*No active quests today.*");
    lines.push("");
  }

  // Today's tasks summary
  const allDeckTasks = deckEntries.flatMap(e => e.tasks);
  if (allDeckTasks.length > 0) {
    lines.push(`*Today's Tasks (${allDeckTasks.length}):*`);
    for (const task of allDeckTasks.slice(0, 7)) {
      const status = task.status === "done" ? "✅" : task.status === "in-progress" ? "⚙️" : "⬜";
      lines.push(`${status} ${task.title}`);
    }
    if (allDeckTasks.length > 7) {
      lines.push(`... and ${allDeckTasks.length - 7} more`);
    }
    lines.push("");
  }

  // Blocker bust (one blocked task if any)
  const blockedTasks = allTasks.filter(
    (t) => t.blockers && t.blockers.length > 0 && t.status !== "done" && allDeckTasks.some(dt => dt.id === t.id)
  );
  if (blockedTasks.length > 0) {
    const blocker = blockedTasks[0];
    lines.push(`🚫 *Blocker Bust:*`);
    lines.push(`${blocker.title}`);
    if (blocker.blockers && blocker.blockers.length > 0) {
      lines.push(`Blockers: ${blocker.blockers.join(", ")}`);
    }
    lines.push("");
  }

  const message = lines.join("\n");
  await sendSlackMessage(slackChannel, message, {
    username: "Questmaster",
    iconEmoji: ":robot_face:",
  });
}

/**
 * Send digest email (stub)
 */
async function sendMemberDigestEmail(
  member: Member,
  deckEntries: Array<{
    quest: Quest;
    tasks: Task[];
    microSteps: Array<{ description: string; estimatedMinutes: number }>;
    totalEstimatedMinutes: number;
  }>,
  allTasks: Task[]
): Promise<void> {
  const lines: string[] = [];
  
  lines.push(`Daily Quest Deck for ${member.email}`);
  lines.push("");

  // Today's quests
  if (deckEntries.length > 0) {
    lines.push("Today's Quests:");
    for (const entry of deckEntries) {
      lines.push(`• ${entry.quest.title}`);
      if (entry.tasks.length > 0) {
        lines.push(`  Tasks: ${entry.tasks.map(t => t.title).join(", ")}`);
      }
    }
    lines.push("");
  }

  // Today's tasks summary
  const allDeckTasks = deckEntries.flatMap(e => e.tasks);
  if (allDeckTasks.length > 0) {
    lines.push(`Today's Tasks (${allDeckTasks.length}):`);
    for (const task of allDeckTasks.slice(0, 7)) {
      lines.push(`- ${task.title}`);
    }
    lines.push("");
  }

  // Blocker bust
  const blockedTasks = allTasks.filter(
    (t) => t.blockers && t.blockers.length > 0 && t.status !== "done" && allDeckTasks.some(dt => dt.id === t.id)
  );
  if (blockedTasks.length > 0) {
    const blocker = blockedTasks[0];
    lines.push(`Blocker Bust:`);
    lines.push(`${blocker.title}`);
    if (blocker.blockers && blocker.blockers.length > 0) {
      lines.push(`Blockers: ${blocker.blockers.join(", ")}`);
    }
  }

  const subject = `Daily Quest Deck - ${new Date().toLocaleDateString()}`;
  const text = lines.join("\n");
  await sendEmail(member.email, subject, text);
}
}

