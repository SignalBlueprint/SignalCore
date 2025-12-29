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
  DailyDeck,
  Org,
  MemberProfile,
  WorkingGeniusProfile,
  WorkingGenius,
  WGPhase,
} from "@sb/schemas";
import {
  getQuestsForUser,
  getTasksByQuestId,
  evaluateUnlocks,
  reassignTasks,
  getMembersByOrgId,
  updateTask,
  getOrgById,
  getMemberProfilesByOrgId,
} from "./store";
import { publish } from "@sb/events";

const GOAL_KIND = "goals";
const QUESTLINE_KIND = "questlines";
const QUEST_KIND = "quests";
const TASK_KIND = "tasks";
const MEMBER_KIND = "members";
const DECK_KIND = "member_quest_decks";
const DAILY_DECK_KIND = "daily_decks";

/**
 * Run Questmaster for an organization
 * Returns stats about what was processed
 */
export async function runQuestmaster(
  orgId: string,
  now: Date = new Date(),
  jobRunId?: string
): Promise<{
  goals: number;
  questlines: number;
  quests: number;
  tasks: number;
  decksGenerated: number;
  unlockedQuests: number;
  staleTasks: number;
  dailyDeckTasks: number;
  dailyDeckWarnings: number;
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
  
  // Get member profiles and merge them with members
  const memberProfiles = await getMemberProfilesByOrgId(orgId);
  const profileMap = new Map<string, MemberProfile>();
  for (const profile of memberProfiles) {
    profileMap.set(profile.memberId, profile);
  }
  
  // Convert MemberProfile (WGPhase) to WorkingGeniusProfile (WorkingGenius) and attach to members
  const phaseToGenius: Record<WGPhase, WorkingGenius> = {
    'W': 'Wonder',
    'I': 'Invention',
    'D': 'Discernment',
    'G': 'Galvanizing',
    'E': 'Enablement',
    'T': 'Tenacity',
  };
  
  const membersWithProfiles = members.map(member => {
    const profile = profileMap.get(member.id);
    if (!profile) {
      return member; // Return member as-is if no profile
    }
    // Convert WGPhase to WorkingGenius and attach to member
    return {
      ...member,
      workingGeniusProfile: {
        top2: [phaseToGenius[profile.top2[0]], phaseToGenius[profile.top2[1]]],
        competency2: [phaseToGenius[profile.competency2[0]], phaseToGenius[profile.competency2[1]]],
        frustration2: [phaseToGenius[profile.frustration2[0]], phaseToGenius[profile.frustration2[1]]],
      },
      dailyCapacityMinutes: profile.dailyCapacityMinutes,
    };
  });

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
  }

  // Count stale tasks
  const staleTasks = activeTasks.filter((t) => {
    const updatedAt = new Date(t.updatedAt);
    return updatedAt < staleThreshold;
  }).length;

  // 7. Generate organization-wide Daily Deck (3-7 priority tasks)
  const { dailyDeckTasks, dailyDeckWarnings } = await generateDailyDeck(
    orgId,
    today,
    now,
    tasks,
    members,
    quests,
    questlines,
    jobRunId
  );

  return {
    goals: goals.length,
    questlines: questlines.length,
    quests: quests.length,
    tasks: tasks.length,
    decksGenerated,
    unlockedQuests,
    staleTasks,
    dailyDeckTasks,
    dailyDeckWarnings,
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

/**
 * Generate organization-wide Daily Deck
 * Selects 3-7 unblocked, high-priority tasks across the team
 */
async function generateDailyDeck(
  orgId: string,
  date: string,
  now: Date,
  allTasks: Task[],
  members: Member[],
  quests: Quest[],
  questlines: Questline[],
  jobRunId?: string
): Promise<{ dailyDeckTasks: number; dailyDeckWarnings: number }> {
  const warnings: string[] = [];

  // Build lookup maps
  const questMap = new Map(quests.map((q) => [q.id, q]));
  const questlineMap = new Map(questlines.map((ql) => [ql.id, ql]));

  // Build task -> quest mapping
  const taskToQuestMap = new Map<string, Quest>();
  for (const quest of quests) {
    for (const taskId of quest.taskIds) {
      taskToQuestMap.set(taskId, quest);
    }
  }

  // Filter tasks: unblocked, not done, assigned or assignable
  const candidateTasks = allTasks.filter((t) => {
    if (t.status === "done") return false;
    if (t.status === "blocked") return false;
    if (t.blockers && t.blockers.length > 0) return false;

    // Task must be part of an unlocked or in-progress quest
    const quest = taskToQuestMap.get(t.id);
    if (!quest) return false;
    if (quest.state !== "unlocked" && quest.state !== "in-progress") return false;

    return true;
  });

  // Deterministic priority scoring (higher is better)
  // Criteria: priority + age (oldest created) + shortest tasks (tie-break)
  const priorityScore = (task: Task): number => {
    let score = 0;

    // Priority weight (most important)
    if (task.priority === "urgent") score += 1000;
    else if (task.priority === "high") score += 500;
    else if (task.priority === "medium") score += 200;
    else score += 100;

    // In-progress tasks get a boost
    if (task.status === "in-progress") score += 300;

    // Age: older tasks get priority (created earlier)
    // Calculate days old, add to score (up to 100 points for 100+ day old tasks)
    const createdAt = new Date(task.createdAt || now);
    const ageInDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    score += Math.min(ageInDays, 100); // Cap at 100 points

    // Smaller tasks get a slight boost (easier to complete - tie-break)
    const estimatedMinutes = task.estimatedMinutes || 60;
    if (estimatedMinutes <= 30) score += 15;
    else if (estimatedMinutes <= 60) score += 10;
    else if (estimatedMinutes <= 120) score += 5;

    return score;
  };

  // Sort by priority score (deterministic)
  const sortedTasks = candidateTasks
    .map((task) => ({
      task,
      score: priorityScore(task),
    }))
    .sort((a, b) => {
      // Primary: score
      if (a.score !== b.score) return b.score - a.score;
      // Tie-break: task ID (for determinism)
      return a.task.id.localeCompare(b.task.id);
    });

  // Select top 3-7 tasks
  const minTasks = 3;
  const maxTasks = 7;
  const selectedCount = Math.min(maxTasks, Math.max(minTasks, sortedTasks.length));
  const selectedTasks = sortedTasks.slice(0, selectedCount).map((s) => s.task);

  // Generate warnings for edge cases
  if (candidateTasks.length === 0) {
    // No tasks available at all
    const totalTasks = allTasks.length;
    const doneTasks = allTasks.filter((t) => t.status === "done").length;
    const blockedTasks = allTasks.filter((t) => t.status === "blocked" || (t.blockers && t.blockers.length > 0)).length;
    const lockedTasks = allTasks.filter((t) => {
      const quest = taskToQuestMap.get(t.id);
      return quest && quest.state === "locked";
    }).length;

    if (totalTasks === 0) {
      warnings.push("No tasks exist. Create goals and decompose them to generate tasks.");
    } else if (doneTasks === totalTasks) {
      warnings.push("All tasks are completed! 🎉 Create new goals to continue.");
    } else if (blockedTasks > 0) {
      warnings.push(`${blockedTasks} task(s) are blocked. Resolve blockers to unlock work.`);
    } else if (lockedTasks > 0) {
      warnings.push(`${lockedTasks} task(s) are locked. Complete prerequisite quests to unlock.`);
    } else {
      warnings.push("No unblocked tasks found. All tasks are either completed, blocked, or locked.");
    }
  } else if (selectedTasks.length < minTasks) {
    // Fewer than desired minimum
    warnings.push(
      `Only ${selectedTasks.length} task(s) in deck (target: ${minTasks}-${maxTasks}). Consider creating more tasks or unblocking existing ones.`
    );
  }

  // Check if team has profiles (using the enriched members list)
  const membersWithProfilesCount = membersWithProfiles.filter((m) => m.workingGeniusProfile).length;
  if (membersWithProfilesCount === 0 && members.length > 0) {
    warnings.push(
      `No team members have Working Genius profiles. Visit /team to set up profiles for better task assignment.`
    );
  }

  // Calculate team capacity
  const teamCapacity = membersWithProfiles
    .filter((m) => m.workingGeniusProfile)
    .map((member) => {
      const capacityMinutes = member.dailyCapacityMinutes || 480;

      // Calculate planned minutes (tasks assigned to this member in the deck)
      const plannedMinutes = selectedTasks
        .filter((t) => t.owner === member.id)
        .reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);

      const utilizationPercent = capacityMinutes > 0
        ? Math.round((plannedMinutes / capacityMinutes) * 100)
        : 0;

      // Warn if over capacity
      if (utilizationPercent > 100) {
        warnings.push(
          `${member.email} is over capacity (${utilizationPercent}% utilization)`
        );
      }

      return {
        memberId: member.id,
        memberEmail: member.email,
        capacityMinutes,
        plannedMinutes,
        utilizationPercent,
      };
    });

  // Build deck items
  const deckItems = selectedTasks.map((task) => {
    const quest = taskToQuestMap.get(task.id);
    const questline = quest ? questlineMap.get(quest.questlineId) : undefined;

    // Determine why this task is in the deck
    let reason = "High priority and unblocked";
    if (task.status === "in-progress") {
      reason = "Already in progress";
    } else if (task.priority === "urgent") {
      reason = "Urgent priority";
    } else if (task.priority === "high") {
      reason = "High priority";
    } else if ((task.estimatedMinutes || 60) <= 30) {
      reason = "Quick win (≤30 min)";
    }

    const assignedMember = members.find((m) => m.id === task.owner);

    return {
      taskId: task.id,
      taskTitle: task.title,
      questId: quest?.id || "",
      questTitle: quest?.title || "",
      questlineId: questline?.id || "",
      questlineTitle: questline?.title || "",
      assignedToMemberId: task.owner,
      assignedToMemberEmail: assignedMember?.email,
      estimatedMinutes: task.estimatedMinutes || 60,
      priority: task.priority || "medium",
      phase: task.phase,
      reason,
      status: task.status,
    };
  });

  // Create DailyDeck entity
  const deckId = `daily-deck-${orgId}-${date}`;
  const dailyDeck: DailyDeck = {
    id: deckId,
    orgId,
    date,
    generatedAt: now.toISOString(),
    jobRunId,
    items: deckItems,
    teamCapacity,
    summary: {
      totalTasks: selectedTasks.length,
      totalEstimatedMinutes: selectedTasks.reduce(
        (sum, t) => sum + (t.estimatedMinutes || 0),
        0
      ),
      tasksConsidered: candidateTasks.length,
      warnings: warnings.length > 0 ? warnings : undefined,
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  // Persist to storage
  await storage.upsert(DAILY_DECK_KIND, dailyDeck);

  // Emit event
  await publish(
    "quest.deck.generated",
    {
      orgId,
      date,
      taskCount: selectedTasks.length,
      warningCount: warnings.length,
      jobRunId,
    },
    {
      orgId,
      sourceApp: "questboard",
    }
  );

  return {
    dailyDeckTasks: selectedTasks.length,
    dailyDeckWarnings: warnings.length,
  };
}

