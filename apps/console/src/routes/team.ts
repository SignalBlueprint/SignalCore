/**
 * Team member management routes
 */

import { Router } from "express";
import { storage } from "@sb/storage";
import type { Member } from "@sb/schemas";

const router = Router();
const MEMBERS_KIND = "members";

// Get all team members for an organization
router.get("/", async (req, res) => {
  try {
    const orgId = (req.query.orgId as string) || "org-1"; // Default org for now

    const members = await storage.list<Member>(
      MEMBERS_KIND,
      (member) => member.orgId === orgId
    );

    res.json(members);
  } catch (error) {
    console.error("Error getting team members:", error);
    res.status(500).json({ error: "Failed to get team members" });
  }
});

// Get a specific team member
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const member = await storage.get<Member>(MEMBERS_KIND, id);

    if (!member) {
      return res.status(404).json({ error: "Team member not found" });
    }

    res.json(member);
  } catch (error) {
    console.error("Error getting team member:", error);
    res.status(500).json({ error: "Failed to get team member" });
  }
});

// Create a new team member
router.post("/", async (req, res) => {
  try {
    const {
      id,
      orgId,
      name,
      email,
      role,
      avatar,
      workingGeniusProfile,
      dailyCapacityMinutes,
      currentWorkloadMinutes,
    } = req.body;

    if (!id || !orgId || !email || !role) {
      return res.status(400).json({ error: "Missing required fields: id, orgId, email, role" });
    }

    const now = new Date().toISOString();
    const member: Member = {
      id,
      orgId,
      name,
      email,
      role,
      avatar,
      workingGeniusProfile,
      dailyCapacityMinutes,
      currentWorkloadMinutes,
      createdAt: now,
      updatedAt: now,
    };

    const created = await storage.upsert<Member>(MEMBERS_KIND, member);
    res.status(201).json(created);
  } catch (error) {
    console.error("Error creating team member:", error);
    res.status(500).json({ error: "Failed to create team member" });
  }
});

// Update a team member
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await storage.get<Member>(MEMBERS_KIND, id);

    if (!existing) {
      return res.status(404).json({ error: "Team member not found" });
    }

    const {
      name,
      email,
      role,
      avatar,
      workingGeniusProfile,
      dailyCapacityMinutes,
      currentWorkloadMinutes,
    } = req.body;

    const updated: Member = {
      ...existing,
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(role !== undefined && { role }),
      ...(avatar !== undefined && { avatar }),
      ...(workingGeniusProfile !== undefined && { workingGeniusProfile }),
      ...(dailyCapacityMinutes !== undefined && { dailyCapacityMinutes }),
      ...(currentWorkloadMinutes !== undefined && { currentWorkloadMinutes }),
      updatedAt: new Date().toISOString(),
    };

    const saved = await storage.upsert<Member>(MEMBERS_KIND, updated);
    res.json(saved);
  } catch (error) {
    console.error("Error updating team member:", error);
    res.status(500).json({ error: "Failed to update team member" });
  }
});

// Delete a team member
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await storage.remove(MEMBERS_KIND, id);

    if (!removed) {
      return res.status(404).json({ error: "Team member not found" });
    }

    res.json({ success: true, message: "Team member deleted" });
  } catch (error) {
    console.error("Error deleting team member:", error);
    res.status(500).json({ error: "Failed to delete team member" });
  }
});

export default router;
