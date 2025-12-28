/**
 * Auto-assign questlines based on Working Genius profiles
 */

import type { Questline, WorkingGeniusProfile, WorkingGenius } from "@sb/schemas";

/**
 * Simple scoring function based on Working Genius
 * Top 2 = highest score, Competency = medium, Frustration = lowest
 */
function scoreQuestlineForProfile(
  questline: Questline,
  profile: WorkingGeniusProfile
): number {
  // Map questline characteristics to Working Genius types
  // This is simplified - in reality, we'd analyze the questline description/title
  const questlineGenius = inferWorkingGenius(questline);
  
  let score = 0;
  
  // Top 2 get highest weight
  if (profile.top2[0] === questlineGenius || profile.top2[1] === questlineGenius) {
    score += 10;
  }
  
  // Competency gets medium weight
  if (profile.competency2[0] === questlineGenius || profile.competency2[1] === questlineGenius) {
    score += 5;
  }
  
  // Frustration gets negative weight (avoid assignment)
  if (profile.frustration2[0] === questlineGenius || profile.frustration2[1] === questlineGenius) {
    score -= 5;
  }
  
  return score;
}

/**
 * Infer Working Genius type from questline (simplified heuristic)
 */
function inferWorkingGenius(questline: Questline): WorkingGenius {
  const text = `${questline.title} ${questline.description}`.toLowerCase();
  
  // Simple keyword matching (this would be improved with AI)
  if (text.match(/\b(why|what if|explore|question|research)\b/)) {
    return "Wonder";
  }
  if (text.match(/\b(create|design|invent|build|develop|innovate)\b/)) {
    return "Invention";
  }
  if (text.match(/\b(evaluate|judge|assess|analyze|compare|decide)\b/)) {
    return "Discernment";
  }
  if (text.match(/\b(launch|start|initiate|mobilize|motivate|begin)\b/)) {
    return "Galvanizing";
  }
  if (text.match(/\b(implement|execute|support|enable|facilitate|organize)\b/)) {
    return "Enablement";
  }
  if (text.match(/\b(finish|complete|follow through|persist|maintain|endure)\b/)) {
    return "Tenacity";
  }
  
  // Default fallback
  return "Enablement";
}

/**
 * Assign questlines to users based on Working Genius profiles
 */
export function assignQuestlines(
  questlines: Questline[],
  profiles: Array<{ userId: string; profile: WorkingGeniusProfile }>
): Record<string, string[]> {
  const assignments: Record<string, string[]> = {};
  
  // Initialize assignments
  profiles.forEach(({ userId }) => {
    assignments[userId] = [];
  });
  
  // Score each questline for each user
  const scored: Array<{
    questlineId: string;
    userId: string;
    score: number;
  }> = [];
  
  questlines.forEach((questline) => {
    profiles.forEach(({ userId, profile }) => {
      const score = scoreQuestlineForProfile(questline, profile);
      scored.push({ questlineId: questline.id, userId, score });
    });
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  // Assign questlines greedily (highest score first)
  const assignedQuestlines = new Set<string>();
  const userWorkload: Record<string, number> = {};
  profiles.forEach(({ userId }) => {
    userWorkload[userId] = 0;
  });
  
  // Balance workload while maximizing fit
  scored.forEach(({ questlineId, userId, score }) => {
    if (assignedQuestlines.has(questlineId)) return;
    
    // Simple balancing: prefer users with fewer assignments
    const currentWorkload = userWorkload[userId] || 0;
    const minWorkload = Math.min(...Object.values(userWorkload));
    
    // Assign if score is positive and workload is reasonable
    if (score > 0 && currentWorkload <= minWorkload + 1) {
      assignments[userId].push(questlineId);
      assignedQuestlines.add(questlineId);
      userWorkload[userId] = (userWorkload[userId] || 0) + 1;
    }
  });
  
  // Assign any remaining unassigned questlines to user with lowest workload
  questlines.forEach((questline) => {
    if (!assignedQuestlines.has(questline.id)) {
      const minUserId = Object.entries(userWorkload).reduce((a, b) =>
        a[1] < b[1] ? a : b
      )[0];
      assignments[minUserId].push(questline.id);
      userWorkload[minUserId] = (userWorkload[minUserId] || 0) + 1;
    }
  });
  
  return assignments;
}

