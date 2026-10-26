# EventGenie AI — Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default-Deny Catch-All**: No unlisted collection or document path can ever be read or written (`allow read, write: if false;`).
2. **Verified Identity**: All writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **PII Isolation**: `/users/{userId}` and `/events/{eventId}/guests/{guestId}` contain PII (`email`, `contact`, `phone`) and can ONLY be read or written by the verified owner (`request.auth.uid == userId` or `resource.data.ownerId == request.auth.uid`).
4. **Master Gate Relational Sync**: Every subcollection document under `/events/{eventId}/{subcollection}/{docId}` must belong to an existing `/events/{eventId}` whose `ownerId == request.auth.uid`, and the subcollection document's `eventId` must equal `eventId` and `ownerId == request.auth.uid`.
5. **Immutable Ownership & Timestamps**: `ownerId`, `uid`, `eventId`, and `createdAt` can never change on `update`. `createdAt` and `updatedAt` must equal `request.time`.
6. **Strict Schema & Size Guards**: Every entity is validated by a dedicated `isValid[Entity](data)` helper enforcing `.keys().hasAll(...)`, `.keys().hasOnly(...)`, and strict `.size()` limits on every string field.
7. **Query Enforcer**: Every `allow list` rule evaluates `resource.data.ownerId == request.auth.uid` directly without `get()` calls.

## 2. The "Dirty Dozen" Payloads (Designed to Break Identity, Integrity, and State)
1. **Unverified Email Write**: `{ uid: "user1", email_verified: false }` attempting to create `/users/user1` -> `PERMISSION_DENIED`.
2. **Identity Spoofing on Event Create**: Authenticated as `user1`, creating `/events/ev1` with `{ ownerId: "user2", ... }` -> `PERMISSION_DENIED`.
3. **Shadow Field Injection on Event Update**: Updating `/events/ev1` with `{ title: "New", isSuperAdmin: true }` -> `PERMISSION_DENIED`.
4. **Ownership Hijack on Event Update**: Updating `/events/ev1` with `{ ownerId: "attacker" }` -> `PERMISSION_DENIED`.
5. **Timestamp Forgery**: Creating `/events/ev1` with client timestamp `createdAt: timestamp.date(2020, 1, 1)` != `request.time` -> `PERMISSION_DENIED`.
6. **Orphan Subcollection Write**: Creating `/events/nonexistent_event/tasks/t1` where parent `/events/nonexistent_event` does not exist -> `PERMISSION_DENIED`.
7. **Cross-Tenant Subcollection Write**: Authenticated as `user2`, creating `/events/ev_owned_by_user1/tasks/t1` -> `PERMISSION_DENIED`.
8. **ID Poisoning Attack**: Creating `/events/bad$id!with/slashes` or 200-char ID -> `PERMISSION_DENIED`.
9. **Denial-of-Wallet Oversized String**: Updating `/events/ev1` with `title` of 5,000 chars (> 160 max) -> `PERMISSION_DENIED`.
10. **PII Leak via Cross-User Get**: Authenticated as `user2`, reading `/users/user1` or `/events/ev1/guests/g1` -> `PERMISSION_DENIED`.
11. **Unauthorized List Scraping**: Listing `/events` without filtering `where('ownerId', '==', request.auth.uid)` -> `PERMISSION_DENIED`.
12. **Invalid Enum State Transition**: Updating `/events/ev1` with `status: "HackedStatus"` -> `PERMISSION_DENIED`.
