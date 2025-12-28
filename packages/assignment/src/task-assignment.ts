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
 * Phase to Working Genius mapping
 */
const PHASE_TO_GENIUS: Record<string, WorkingGenius> = {
  W: "Wonder",
  I: "Invention",
  D: "Discernment",
  G: "Galvanizing",
  E: "Enablement",
  T: "Tenacity",
};

/**
 * Infer Working Genius phase from task characteristics
 */
export function inferTaskGenius(task: Task): WorkingGenius {
  // If task has explicit phase, use it
  if (task.phase) {
    return PHASE_TO_GENIUS[task.phase] || "Enablement";
  }
  
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
  currentWorkloadMinutes: number = 0, // Current workload in minutes
  dailyCapacity: number = 480, // Default 8 hours
  aiSuggestedOwnerEmail?: string, // AI hint for assignment
  userEmail?: string // User's email for AI hint matching
): AssignmentScore {
  const taskGenius = inferTaskGenius(task);
  
  let geniusMatch = 0;
  let competencyMatch = 0;
  let frustrationPenalty = 0;
  let aiHintBonus = 0;
  
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
  
  // AI hint bonus: +2 points if AI suggested this user (best-effort hint)
  if (aiSuggestedOwnerEmail && userEmail && 
      aiSuggestedOwnerEmail.toLowerCase() === userEmail.toLowerCase()) {
    aiHintBonus = 2;
  }
  
  // Workload penalty: based on estimated minutes
  const estimatedTaskMinutes = task.estimatedMinutes || 60;
  const totalMinutes = currentWorkloadMinutes + estimatedTaskMinutes;
  const workloadPenalty = totalMinutes > dailyCapacity 
    ? -Math.floor((totalMinutes - dailyCapacity) / 60) 
    : 0;
  
  const totalScore = geniusMatch + competencyMatch + frustrationPenalty + workloadPenalty + aiHintBonus;
  
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
    currentWorkloadMinutes: number; // Changed from currentWorkload (count) to minutes
    dailyCapacity: number;
    email?: string; // User email for AI hint matching
  }>,
  aiSuggestedOwnerEmail?: string // AI hint from decomposition
): AssignmentExplanation {
  if (candidates.length === 0) {
    throw new Error("No candidates provided for assignment");
  }
  
  // Score task for each candidate
  const scores = candidates.map(({ userId, profile, currentWorkloadMinutes, dailyCapacity, email }) =>
    scoreTaskForUser(
      task, 
      userId, 
      profile, 
      currentWorkloadMinutes, 
      dailyCapacity,
      aiSuggestedOwnerEmail,
      email
    )
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
    currentWorkloadMinutes: number; // Changed to minutes
    dailyCapacity: number;
    email?: string; // User email for AI hint matching
  }>
): Map<string, AssignmentExplanation> {
  const assignments = new Map<string, AssignmentExplanation>();
  const workload: Record<string, number> = {}; // Track minutes per user
  
  // Initialize workload tracking
  candidates.forEach(({ userId, currentWorkloadMinutes }) => {
    workload[userId] = currentWorkloadMinutes;
  });
  
  // Assign each task
  for (const task of tasks) {
    // Update candidate workloads
    const updatedCandidates = candidates.map((c) => ({
      ...c,
      currentWorkloadMinutes: workload[c.userId] || 0,
    }));
    
    // Get AI suggested owner from task assignmentReason if available
    const aiSuggestedOwnerEmail = task.assignmentReason?.aiSuggestedOwner;
    
    // Get assignment with explanation
    const explanation = assignTaskWithExplanation(task, updatedCandidates, aiSuggestedOwnerEmail);
    
    // Record assignment
    assignments.set(task.id, explanation);
    
    // Update workload (add task's estimated minutes)
    const taskMinutes = task.estimatedMinutes || 60;
    workload[explanation.assignedUserId] = (workload[explanation.assignedUserId] || 0) + taskMinutes;
  }
  
  return assignments;
}

