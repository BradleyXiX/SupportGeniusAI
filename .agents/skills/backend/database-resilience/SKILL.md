---
name: database-resilience
description: Database persistence safety, parameterized queries, ORM hygiene, automated N+1 query elimination, and non-destructive expand-and-contract migrations.
---

# Database Resilience, ORM Safety & Migration Protocols

The `database-resilience` skill enforces query safety, high-throughput indexing, automated N+1 query elimination, and zero-downtime database migrations across SupportGeniusAI.

---

## 1. Parameterized Queries & ORM Protection

SQL injection remains one of the most critical threats to enterprise systems. Any form of string concatenation, template literals, or uncontrolled variable interpolation in database queries is strictly forbidden.

### Vulnerable vs. Secure Query Patterns

```javascript
// ❌ CRITICAL VULNERABILITY: Raw string interpolation
const badQuery = `SELECT * FROM tickets WHERE organization_id = '${orgId}' AND status = '${status}'`;

// ✔ SECURE: Parameterized query using prepared statements
const secureQuery = {
  text: 'SELECT * FROM tickets WHERE organization_id = $1 AND status = $2',
  values: [orgId, status],
};

// ✔ SECURE: Type-safe ORM abstraction (e.g., Drizzle / Prisma)
const tickets = await db.query.tickets.findMany({
  where: (tickets, { eq, and }) => and(
    eq(tickets.organizationId, orgId),
    eq(tickets.status, status)
  ),
});
```

---

## 2. Automated N+1 Query Elimination & Eager Loading

Fetching relational entities inside an iterative loop (the N+1 anti-pattern) causes database connection pool starvation, latency spikes, and severe performance degradation.

### The N+1 Anti-Pattern vs. Batch Eager Loading

```javascript
// ❌ THE N+1 QUERY ANTI-PATTERN: Fires 1 query for tickets + N queries for users
const tickets = await db.query.tickets.findMany();
for (const ticket of tickets) {
  // Executes on every iteration: DO NOT DO THIS
  ticket.author = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, ticket.authorId),
  });
}

// ✔ SECURE: Eager Join / Batch Loading in a Single Query
const ticketsWithAuthors = await db.query.tickets.findMany({
  with: {
    author: true,
    tags: true,
  },
  where: (tickets, { eq }) => eq(tickets.status, 'open'),
});
```

### DataLoader Pattern for GraphQL and Micro-Batching

```javascript
import DataLoader from 'dataloader';

// Micro-batches independent lookups within an execution tick into a single SQL 'IN' query
export const userBatchLoader = new DataLoader(async (userIds) => {
  const users = await db.query.users.findMany({
    where: (users, { inArray }) => inArray(users.id, userIds),
  });

  const userMap = new Map(users.map((u) => [u.id, u]));
  return userIds.map((id) => userMap.get(id) || null);
});
```

---

## 3. Non-Destructive Migrations (Expand & Contract)

SupportGeniusAI employs the **Expand and Contract (Parallel Run)** pattern for zero-downtime database schema changes.

```
Phase 1: Expand          Phase 2: Dual-Write / Backfill   Phase 3: Contract
┌─────────────────────┐   ┌─────────────────────────────┐   ┌─────────────────────┐
│ Add new nullable    │   │ Write to old + new columns; │   │ Drop old column /   │
│ column or table.    ├──►│ backfill historical records. ├──►│ apply NOT NULL.     │
│ Old column active.  │   │ Read from new column.       │   │ Zero downtime.      │
└─────────────────────┘   └─────────────────────────────┘   └─────────────────────┘
```

### 3-Phase Migration Rules
1. **Phase 1 (Expand)**:
   - Add new columns as **nullable** (`NULL`).
   - Never add `NOT NULL` without an immediate default value on existing large tables.
   - Deploy backend code that reads from the old column and dual-writes to both old and new columns.
2. **Phase 2 (Backfill)**:
   - Run asynchronous backfill scripts in batches (e.g., 1,000 records per transaction with sleep periods) to avoid locking table pages.
3. **Phase 3 (Contract)**:
   - Transition all application reads and writes exclusively to the new column.
   - Deploy backend code removing references to the deprecated column.
   - Run a subsequent migration to drop the old column and add any necessary constraints.

---

## 4. High-Performance Indexing Audits

Every query executed in production must have an associated index to prevent full table scans.

### Indexing Rules
1. **Foreign Key Indexing**: Every foreign key column (`organization_id`, `user_id`, `ticket_id`) must have an explicit B-tree index.
2. **Composite Filtering Indexes**: If queries filter by multiple columns (e.g., `WHERE status = 'open' ORDER BY created_at DESC`), create a composite index matching the exact query predicate:
   ```sql
   CREATE INDEX CONCURRENTLY idx_tickets_org_status_created 
   ON tickets (organization_id, status, created_at DESC);
   ```
3. **Execution Plan Verification**:
   - Always verify query performance locally using `EXPLAIN (ANALYZE, BUFFERS)`:
   - Ensure the plan utilizes an **Index Scan** or **Index Only Scan**, never a **Seq Scan** (Sequential Scan) on tables exceeding 1,000 rows.

---

## 5. Database Resilience Checklist

- [ ] All dynamic query parameters use prepared statement variables (`$1, $2`) or ORM builders.
- [ ] No nested database queries exist inside loops or `Array.map` callbacks.
- [ ] Schema changes follow the 3-phase Expand-and-Contract lifecycle.
- [ ] Migrations use `CREATE INDEX CONCURRENTLY` in PostgreSQL to prevent table locking.
- [ ] Foreign keys and frequent filter predicates have audited B-tree indexes.
- [ ] Database connection pools configure explicit timeouts (`connectionTimeoutMillis: 3000`, `idleTimeoutMillis: 10000`).
