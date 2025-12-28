/**
 * @sb/assignment
 * Quest Deck and assignment utilities
 */

import type { Quest, Task } from "@sb/schemas";

// Re-export task assignment functions
export {
  assignTaskWithExplanation,
  assignTasks,
  scoreTaskForUser,
  inferTaskGenius,
  type AssignmentScore,
  type AssignmentExplanation,
} from "./task-assignment";

/**
 * Micro-step generated from task DoD or description
 */
export interface MicroStep {
  id: string;
  taskId: string;
  description: string;
  estimatedMinutes: number; // Typically 5-15 minutes
}

/**
 * Generate micro-steps from task DoD or description
 * Deterministic generation for consistent daily view
 */
export function generateMicroSteps(task: Task): MicroStep[] {
  const steps: MicroStep[] = [];
  
  // If DoD exists, parse it into steps
  if (task.dod) {
    const dodSteps = task.dod
      .split(/[,\n•\-\*]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 5); // Max 5 steps
    
    dodSteps.forEach((step, index) => {
      steps.push({
        id: `micro-${task.id}-${index}`,
        taskId: task.id,
        description: step,
        estimatedMinutes: 10, // Default 10 minutes per step
      });
    });
  }
  
  // If no DoD or few steps, generate from description/title
  if (steps.length < 2 && task.description) {
    // Simple heuristic: break description into actionable steps
    const sentences = task.description
      .split(/[.!?]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10)
      .slice(0, 3);
    
    sentences.forEach((sentence, index) => {
      if (!steps.some((step) => step.description.includes(sentence.substring(0, 20)))) {
        steps.push({
          id: `micro-${task.id}-desc-${index}`,
          taskId: task.id,
          description: sentence,
          estimatedMinutes: 15,
        });
      }
    });
  }
  
  // Fallback: create a single micro-step from title
  if (steps.length === 0) {
    steps.push({
      id: `micro-${task.id}-title`,
      taskId: task.id,
      description: `Start: ${task.title}`,
      estimatedMinutes: 15,
    });
  }
  
  return steps.slice(0, 7); // Max 7 micro-steps per task
}

/**
 * Quest Deck entry - a quest with its tasks and micro-steps
 */
export interface QuestDeckEntry {
  quest: Quest;
  tasks: Task[];
  microSteps: MicroStep[];
  totalEstimatedMinutes: number;
}

/**
 * Get user's Quest Deck - top 1-2 active quests with 3-7 tasks max
 */
export async function getUserQuestDeck(
  userId: string,
  getQuestsForUser: (userId: string) => Promise<Quest[]>,
  getTasksForQuest: (questId: string) => Promise<Task[]>
): Promise<QuestDeckEntry[]> {
  // Get all active quests for user (unlocked or in-progress)
  const allQuests = await getQuestsForUser(userId);
  
  const activeQuests = allQuests.filter(
    (q) => q.state === "unlocked" || q.state === "in-progress"
  );
  
  // Sort by priority (in-progress first, then by unlock time)
  activeQuests.sort((a, b) => {
    if (a.state === "in-progress" && b.state !== "in-progress") return -1;
    if (b.state === "in-progress" && a.state !== "in-progress") return 1;
    const aTime = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
    const bTime = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
    return bTime - aTime; // Most recently unlocked first
  });
  
  // Take top 1-2 quests
  const selectedQuests = activeQuests.slice(0, 2);
  
  const deckEntries: QuestDeckEntry[] = [];
  
  for (const quest of selectedQuests) {
    // Get tasks for this quest
    const allTasks = await getTasksForQuest(quest.id);
    
    // Filter to user's tasks or unassigned tasks
    const userTasks = allTasks.filter(
      (t) => !t.owner || t.owner === userId
    );
    
    // Prioritize: in-progress > todo > blocked
    const prioritizedTasks = userTasks.sort((a, b) => {
      if (a.status === "in-progress" && b.status !== "in-progress") return -1;
      if (b.status === "in-progress" && a.status !== "in-progress") return 1;
      if (a.status === "todo" && b.status === "blocked") return -1;
      if (b.status === "blocked" && a.status === "todo") return 1;
      return 0;
    });
    
    // Take 3-7 tasks max
    const selectedTasks = prioritizedTasks.slice(0, 7);
    
    // Generate micro-steps for each task
    const allMicroSteps: MicroStep[] = [];
    for (const task of selectedTasks) {
      const microSteps = generateMicroSteps(task);
      allMicroSteps.push(...microSteps);
    }
    
    // Limit to first 15 minutes worth (roughly 1-2 micro-steps)
    const first15Minutes = allMicroSteps
      .slice(0, 2)
      .filter((step) => step.estimatedMinutes <= 15);
    
    const totalMinutes = selectedTasks.reduce((sum, task) => {
      const taskSteps = generateMicroSteps(task);
      return sum + taskSteps.reduce((s, step) => s + step.estimatedMinutes, 0);
    }, 0);
    
    deckEntries.push({
      quest,
      tasks: selectedTasks,
      microSteps: first15Minutes,
      totalEstimatedMinutes: totalMinutes,
    });
  }
  
  return deckEntries;
}

