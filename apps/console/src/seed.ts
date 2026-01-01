/**
 * Seed data for Console
 * Initializes the database with sample team members
 */

import { storage } from "@sb/storage";
import type { Member } from "@sb/schemas";

const MEMBERS_KIND = "members";

/**
 * Seed initial team members if none exist
 */
export async function seedTeamMembers(): Promise<void> {
  try {
    // Check if team members already exist
    const existingMembers = await storage.list<Member>(MEMBERS_KIND);

    if (existingMembers.length > 0) {
      console.log(`[Console Seed] Found ${existingMembers.length} existing team members, skipping seed.`);
      return;
    }

    console.log("[Console Seed] No team members found, seeding initial data...");

    const now = new Date().toISOString();
    const sampleMembers: Member[] = [
      {
        id: "member-1",
        orgId: "org-1",
        name: "Alex Chen",
        email: "alex@signalblueprint.com",
        role: "admin",
        workingGeniusProfile: {
          top2: ["Wonder", "Invention"],
          competency2: ["Discernment", "Enablement"],
          frustration2: ["Galvanizing", "Tenacity"]
        },
        dailyCapacityMinutes: 480,
        currentWorkloadMinutes: 180,
        avatar: "🧑‍💻",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "member-2",
        orgId: "org-1",
        name: "Jordan Rivera",
        email: "jordan@signalblueprint.com",
        role: "member",
        workingGeniusProfile: {
          top2: ["Discernment", "Tenacity"],
          competency2: ["Enablement", "Wonder"],
          frustration2: ["Invention", "Galvanizing"]
        },
        dailyCapacityMinutes: 480,
        currentWorkloadMinutes: 320,
        avatar: "👩‍💼",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "member-3",
        orgId: "org-1",
        name: "Sam Taylor",
        email: "sam@signalblueprint.com",
        role: "member",
        workingGeniusProfile: {
          top2: ["Galvanizing", "Enablement"],
          competency2: ["Tenacity", "Invention"],
          frustration2: ["Wonder", "Discernment"]
        },
        dailyCapacityMinutes: 480,
        currentWorkloadMinutes: 240,
        avatar: "🧑‍🎨",
        createdAt: now,
        updatedAt: now
      }
    ];

    // Insert all sample members
    for (const member of sampleMembers) {
      await storage.upsert<Member>(MEMBERS_KIND, member);
    }

    console.log(`[Console Seed] Successfully seeded ${sampleMembers.length} team members.`);
  } catch (error) {
    console.error("[Console Seed] Error seeding team members:", error);
    // Don't throw - allow server to start even if seeding fails
  }
}
