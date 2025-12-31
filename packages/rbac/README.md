# @sb/rbac

Role-Based Access Control (RBAC) definitions and utilities for the Signal Blueprint suite.

## Purpose

`@sb/rbac` defines roles, permissions, and access control utilities used throughout the suite for authorization and security.

## Features

- **Role Definitions** - Owner, Admin, Member roles
- **Permission System** - Fine-grained permissions for resources
- **Role Hierarchy** - Owners have all admin permissions, admins have all member permissions
- **Permission Checking** - Utility functions for access control

## Installation

```bash
# Already available as a workspace package
pnpm install
```

## Usage

### Check Permissions

```typescript
import { hasPermission, Role } from "@sb/rbac";

const userRole: Role = "admin";

if (hasPermission(userRole, "products.delete")) {
  // User can delete products
}
```

### Role Hierarchy

```typescript
import { isOwner, isAdmin } from "@sb/rbac";

if (isOwner(role)) {
  // Full access
} else if (isAdmin(role)) {
  // Admin access
} else {
  // Member access
}
```

### Roles

- **Owner** - Full access to organization, can manage everything
- **Admin** - Administrative access, can manage most resources
- **Member** - Basic access, can view and edit own items

### Common Permissions

- `products.read` - View products
- `products.write` - Create/update products
- `products.delete` - Delete products
- `leads.read` - View leads
- `campaigns.execute` - Execute campaigns
- `settings.manage` - Manage organization settings

## Testing

```bash
pnpm --filter @sb/rbac test
```

## Dependencies

None - standalone package

## Used By

- **@sb/auth** - Authorization middleware
- All apps - Permission checking

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines.
