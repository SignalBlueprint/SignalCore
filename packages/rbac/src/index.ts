/**
 * @sb/rbac
 * Role-Based Access Control primitives for the Signal Blueprint suite
 */

export type Role = "owner" | "admin" | "member";

export type Permission = "read" | "write" | "admin";

/**
 * Permission matrix: maps roles to their allowed actions
 */
const PERMISSIONS: Record<Role, Permission[]> = {
  owner: ["read", "write", "admin"],
  admin: ["read", "write", "admin"],
  member: ["read", "write"],
};

/**
 * Check if a role has permission to perform an action
 */
export function can(role: Role, action: Permission): boolean {
  const rolePermissions = PERMISSIONS[role];
  return rolePermissions.includes(action);
}

/**
 * Assert that a role can perform an action, throwing an error if not
 */
export function assertCan(role: Role, action: Permission): void {
  if (!can(role, action)) {
    throw new Error(
      `Role "${role}" does not have permission to perform "${action}" action`
    );
  }
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: Role): Permission[] {
  return [...PERMISSIONS[role]];
}

