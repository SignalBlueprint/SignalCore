/**
 * Task assignment engine with Working Genius phase matching
 */

import type { Task, WorkingGeniusProfile, WorkingGenius } from "@sb/schemas";

/**
 * Assignment score breakdown for explainability
 */
export interface AssignmentScore {
  userId: string;
  totalScore: number;
  breakdown: {
    geniusMatch: number; // +3 per top2 match
    competencyMatch: number; // +1 per competency match
    frustrationPenalty: number; // -3 per frustration match
    workloadPenalty: number; // Negative based on current workload
  };
}

/**
 * Assignment explanation
 */
export interface AssignmentExplanation {
  assignedUserId: string;
  scores: AssignmentScore[];
  topAlternatives: Array<{ userId: string; score: number }>; // Top 2 alternatives
}

/**
 * Infer Working Genius phase from task characteristics
 */
export function inferTaskGenius(task: Task): WorkingGenius {
  const text = `${task.title} ${task.description || ""} ${task.dod || ""}`.toLowerCase();
  
  // Wonder: questioning, exploring, researching
  if (text.match(/\b(why|what if|explore|question|research|investigate|analyze|understand)\b/)) {
    return "Wonder";
  }
  
  // Invention: creating, designing, inventing
  if (text.match(/\b(create|design|invent|build|develop|innovate|prototype|draft|sketch)\b/)) {
    return "Invention";
  }
  
  // Discernment: evaluating, judging, deciding
  if (text.match(/\b(evaluate|judge|assess|analyze|compare|decide|review|critique|choose)\b/)) {
    return "Discernment";
  }
  
  // Galvanizing: launching, starting, mobilizing
  if (text.match(/\b(launch|start|initiate|mobilize|motivate|begin|kickoff|announce)\b/)) {
    return "Galvanizing";
  }
  
  // Enablement: implementing, executing, supporting
  if (text.match(/\b(implement|execute|support|enable|facilitate|organize|setup|configure)\b/)) {
    return "Enablement";
  }
  
  // Tenacity: finishing, completing, persisting
  if (text.match(/\b(finish|complete|follow through|persist|maintain|endure|polish|refine)\b/)) {
    return "Tenacity";
  }
  
  // Default fallback
  return "Enablement";
}

/**
 * Score a task for a user based on Working Genius profile
 */
export function scoreTaskForUser(
  task: Task,
  userId: string,
  profile: WorkingGeniusProfile,
  currentWorkload: number = 0, // Current number of assigned tasks
  dailyCapacity: number = 480 // Default 8 hours
): AssignmentScore {
  const taskGenius = inferTaskGenius(task);
  
  let geniusMatch = 0;
  let competencyMatch = 0;
  let frustrationPenalty = 0;
  
  // Top 2 genius match: +3 points
  if (profile.top2[0] === taskGenius || profile.top2[1] === taskGenius) {
    geniusMatch = 3;
  }
  
  // Competency match: +1 point
  if (profile.competency2[0] === taskGenius || profile.competency2[1] === taskGenius) {
    competencyMatch = 1;
  }
  
  // Frustration penalty: -3 points
  if (profile.frustration2[0] === taskGenius || profile.frustration2[1] === taskGenius) {
    frustrationPenalty = -3;
  }
  
  // Workload penalty: -1 per task over capacity (rough estimate: 1 task = 60 min)
  const estimatedTaskMinutes = 60;
  const currentMinutes = currentWorkload * estimatedTaskMinutes;
  const workloadPenalty = currentMinutes > dailyCapacity ? -Math.floor((currentMinutes - dailyCapacity) / estimatedTaskMinutes) : 0;
  
  const totalScore = geniusMatch + competencyMatch + frustrationPenalty + workloadPenalty;
  
  return {
    userId,
    totalScore,
    breakdown: {
      geniusMatch,
      competencyMatch,
      frustrationPenalty,
      workloadPenalty,
    },
  };
}

/**
 * Assign a task to the best user and return explanation
 */
export function assignTaskWithExplanation(
  task: Task,
  candidates: Array<{
    userId: string;
    profile: WorkingGeniusProfile;
    currentWorkload: number;
    dailyCapacity: number;
  }>
): AssignmentExplanation {
  if (candidates.length === 0) {
    throw new Error("No candidates provided for assignment");
  }
  
  // Score task for each candidate
  const scores = candidates.map(({ userId, profile, currentWorkload, dailyCapacity }) =>
    scoreTaskForUser(task, userId, profile, currentWorkload, dailyCapacity)
  );
  
  // Sort by total score descending
  scores.sort((a, b) => b.totalScore - a.totalScore);
  
  // Get assigned user (highest score)
  const assignedUserId = scores[0].userId;
  
  // Get top 2 alternatives (excluding assigned user)
  const topAlternatives = scores
    .slice(1, 3)
    .map((s) => ({ userId: s.userId, score: s.totalScore }));
  
  return {
    assignedUserId,
    scores,
    topAlternatives,
  };
}

/**
 * Assign multiple tasks, balancing workload
 */
export function assignTasks(
  tasks: Task[],
  candidates: Array<{
    userId: string;
    profile: WorkingGeniusProfile;
    currentWorkload: number;
    dailyCapacity: number;
  }>
): Map<string, AssignmentExplanation> {
  const assignments = new Map<string, AssignmentExplanation>();
  const workload: Record<string, number> = {};
  
  // Initialize workload tracking
  candidates.forEach(({ userId, currentWorkload }) => {
    workload[userId] = currentWorkload;
  });
  
  // Assign each task
  for (const task of tasks) {
    // Update candidate workloads
    const updatedCandidates = candidates.map((c) => ({
      ...c,
      currentWorkload: workload[c.userId] || 0,
    }));
    
    // Get assignment with explanation
    const explanation = assignTaskWithExplanation(task, updatedCandidates);
    
    // Record assignment
    assignments.set(task.id, explanation);
    
    // Update workload
    workload[explanation.assignedUserId] = (workload[explanation.assignedUserId] || 0) + 1;
  }
  
  return assignments;
}

