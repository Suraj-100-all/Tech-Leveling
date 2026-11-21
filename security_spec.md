# Tech-Leveling Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Identity Ownership**: `/profiles/{userId}` can only be read, created, or updated when `request.auth.uid == userId` and `incoming().uid == request.auth.uid`.
2. **Verified Writes Only**: Every `create` and `update` requires `request.auth.token.email_verified == true`.
3. **Referential Integrity**: Creating a `/matches/{matchId}` record requires that the author's `/profiles/{uid}` document already exists (`exists(...)`) and `incoming().uid == request.auth.uid`.
4. **Immutable Terminal Records**: Once written to `/matches/{matchId}`, match outcomes are terminal and cannot be updated or deleted.
5. **Action-Based Profile Updates**: Updates to `/profiles/{userId}` are partitioned into two explicit allowlisted actions:
   - `edit_identity`: only `username`, `avatarUrl`, `preferredLanguage`, `updatedAt`.
   - `record_match`: only `winCount`, `lossCount`, `totalGamesPlayed`, `highestRankAchieved`, `coins`, `eloRating`, `updatedAt` with strict monotonic increments (`totalGamesPlayed == existing().totalGamesPlayed + 1`, `coins <= existing().coins + 600`).
6. **Temporal Integrity**: `createdAt` must equal `request.time` on create and remain immutable forever; `updatedAt` must equal `request.time` on create and update.
7. **Zero Blanket List Queries**: `/profiles` forbids `list`; `/matches` requires `resource.data.uid == request.auth.uid` on `list`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Profile Read**: `GET /profiles/userA` with `auth == null`.
2. **Cross-User Profile Read**: `GET /profiles/userB` authenticated as `userA`.
3. **Unverified Email Write**: `CREATE /profiles/userA` with `email_verified: false`.
4. **Shadow Ghost Field Injection**: `CREATE /profiles/userA` including `{ isAdmin: true }`.
5. **Identity Spoofing on Create**: `CREATE /profiles/userA` with `{ uid: "userB" }`.
6. **Path Variable Poisoning**: `CREATE /matches/../../evil!id` (fails `isValidId`).
7. **Denial-of-Wallet Oversized String**: `UPDATE /profiles/userA` with 2KB `avatarUrl` (fails `size() <= 500`).
8. **Client-Forged Timestamp**: `CREATE /profiles/userA` with `createdAt: Timestamp(2020-01-01)` (fails `== request.time`).
9. **Immutable Field Tampering**: `UPDATE /profiles/userA` modifying `createdAt` or `uid`.
10. **Arbitrary Coin Inflation**: `UPDATE /profiles/userA` setting `coins: existing.coins + 999999` (fails `record_match` delta guard).
11. **Terminal Match Mutation**: `UPDATE /matches/m1` changing `outcome: "victory"` after creation.
12. **Blanket Match Scraping**: `LIST /matches` without `where("uid", "==", request.auth.uid)` against another user's doc.
