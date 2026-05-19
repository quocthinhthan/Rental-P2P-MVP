# Rental P2P — TrustScore Definition & Backend Rules

> Purpose: This document defines what `trustScore` means in Rental P2P, how it must be calculated, where it is used, and what backend rules must be preserved.  
> Scope: Backend domain rules only. Frontend may display the returned fields later, but this document does not prescribe UI implementation.

---

## 1. Core definition

### 1.1. `trustScore` is not a star rating

`trustScore` is a **platform risk / reliability score** for a user.

It answers:

> “How safe is it to transact with this user on the Rental P2P platform?”

It does **not** answer:

> “How satisfied were previous counterparties with this user?”

That second question is answered by **review rating**:

- `averageRating`: average of public user-to-user review stars, range `1.0–5.0`
- `totalReviews`: number of public reviews contributing to `averageRating`

### 1.2. Required separation

The backend must keep these concepts separate:

| Concept | Meaning | Range | Source |
|---|---|---:|---|
| `averageRating` | Satisfaction rating from public reviews | 1.0–5.0 | `Review.rating` |
| `totalReviews` | Number of public reviews | 0+ | `Review` |
| `trustScore` | Reliability / transaction safety score | 0–100 | eKYC, completed rentals, reviews, disputes, item reports, account status |
| `trustLevel` | Human-readable trust bucket | enum/string | Derived from `trustScore` |

Never store `averageRating` inside `trustScore`.  
Never interpret `trustScore` as “stars”.

---

## 2. Business role of TrustScore

### 2.1. Primary use cases

`trustScore` should support:

1. **Owner reviewing a rental request**
   - Owner should be able to assess renter risk before confirming.
   - Rental request responses should include a safe renter summary with trust/rating fields.

2. **Public profile / counterparty summary**
   - User profile can expose reliability signals without exposing sensitive identity data.
   - TrustScore is only one signal; it appears alongside eKYC status, rating, and review count.

3. **Admin risk monitoring**
   - Admin can sort/filter users with low trust, repeated disputes, or repeated confirmed reports.
   - Admin “risky users” logic must assume a `0–100` trust scale.

4. **Internal moderation and future automation**
   - TrustScore can later feed warnings, manual review queues, fraud detection, ranking, or recommendation rules.
   - MVP should not automatically block normal transactions solely because a score is low unless an explicit business rule is added.

### 2.2. Non-goals for MVP

Do **not** use TrustScore to:

- Replace review stars.
- Automatically reject rental requests.
- Automatically hide users from search.
- Act as a financial credit score.
- Use opaque ML/AI scoring.
- Penalize users merely because they created a dispute or a report.

---

## 3. Score scale and labels

### 3.1. Score range

`trustScore` must be clamped to:

```txt
0 <= trustScore <= 100
```

### 3.2. Neutral starting point

A new normal user should start at:

```txt
trustScore = 50
```

Reasoning:

- New users are not “bad”.
- They simply lack positive history.
- Starting at 0 wrongly suggests extreme risk.

### 3.3. Trust level buckets

Recommended derived buckets:

| Score | trustLevel | Meaning |
|---:|---|---|
| 90–100 | `very_high` | Rất uy tín |
| 75–89 | `high` | Uy tín cao |
| 60–74 | `medium` | Khá uy tín |
| 40–59 | `new_or_limited` | Người dùng mới / ít dữ liệu |
| 20–39 | `low` | Cần cân nhắc |
| 0–19 | `very_low` | Rủi ro cao |

Backend may return:

```json
{
  "trustScore": 82,
  "trustLevel": "high",
  "trustLabel": "Uy tín cao"
}
```

`trustLabel` is optional; `trustLevel` is preferable for frontend internationalization.

---

## 4. Recommended MVP scoring formula

### 4.1. Formula

```txt
trustScore =
  baseScore
  + ekycScore
  + completedRentalScore
  + reviewScore
  - disputePenalty
  - itemReportPenalty
  + accountStatusAdjustment

Then clamp to [0, 100].
```

### 4.2. Components

#### A. Base score

```txt
baseScore = 50
```

#### B. eKYC score

| eKYC status | Score |
|---|---:|
| `verified` | +20 |
| `pending` | 0 |
| `unverified` | 0 |
| `rejected` | -10 |

#### C. Completed rental score

Count completed rentals where the user participated as either renter or owner.

```txt
+2 per completed rental
maximum +20
```

The same completed rental should count once per user.

#### D. Public review score

Use **public reviews only**.

Recommended rule:

| averageRating | Score |
|---:|---:|
| No public reviews | 0 |
| `>= 4.8` | +10 |
| `>= 4.5 and < 4.8` | +7 |
| `>= 4.0 and < 4.5` | +4 |
| `>= 3.5 and < 4.0` | 0 |
| `>= 3.0 and < 3.5` | -5 |
| `< 3.0` | -10 |

This keeps star rating influential but not dominant.

#### E. Dispute penalties

Only penalize when an admin resolves a dispute and the user is explicitly penalized.

| Penalty type | Score impact |
|---|---:|
| `none` | 0 |
| `warning` | -15 |
| `suspension` | -30 |
| `ban` | Final score becomes 0 |

Important:

- Merely filing a dispute does not reduce trust.
- Being involved in a dispute does not reduce trust.
- Penalty applies based on resolved admin decision and `penalizeUserId`.

#### F. Item report penalties

Only apply to the owner of the reported item after admin resolves the item report with a harmful action.

| Item report action | Score impact |
|---|---:|
| `no_action` | 0 |
| `warn_owner` | -10 |
| `hide_item` | -15 |
| `delist_item` | -15 |
| `ban_item` | -25 |

Important:

- Creating an item report does not penalize anyone.
- Pending reports do not affect score.
- Only resolved reports with meaningful admin action affect score.

#### G. Account status adjustment

| Account status | Rule |
|---|---|
| `isBanned = true` | `trustScore = 0` |
| `suspendedUntil > now` | Final score must not exceed `40` |
| Normal active account | No cap |

---

## 5. Calculation architecture

### 5.1. Prefer derived recalculation over direct mutation

TrustScore should be calculated by a dedicated backend service, for example:

```txt
backend/services/trustScore.service.js
```

Recommended exported functions:

```js
calculateUserTrustScore(userId)
recalculateUserTrustScore(userId)
getTrustLevelFromScore(score)
getUserRatingSummary(userId)
```

### 5.2. Why recalculation is preferred

Avoid ad hoc code such as:

```js
user.trustScore -= 20;
await user.save();
```

This is fragile because:

- Scores drift over time.
- Duplicate event handling can double-penalize.
- Formula changes require manual data repair.
- Different controllers may apply inconsistent logic.

Instead:

1. Persist the source-of-truth event/data:
   - Review
   - Rental completed
   - Dispute resolved with penalty
   - Item report resolved with action
   - eKYC changed
   - Account status changed

2. Recalculate trust from stored source data.

3. Save the new aggregate score to `User.trustScore`.

### 5.3. Stored aggregate fields

Recommended user summary fields:

```js
trustScore: Number,         // 0-100, default 50
averageRating: Number,      // optional cached aggregate, nullable or default 0
totalReviews: Number        // count of public reviews
```

If the project prefers not to cache `averageRating`, it may be calculated on demand.  
However, for repeated profile/rental/admin responses, a cached aggregate field is maintainable and efficient if updated centrally.

---

## 6. Recalculation triggers

`recalculateUserTrustScore(userId)` should be called after confirmed score-affecting changes.

### 6.1. Required triggers

1. **Review becomes public**
   - When double-blind reviews are unlocked.
   - When hidden review is auto-published after the waiting window.
   - Recalculate for the reviewee(s).
   - Also update `averageRating` and `totalReviews`.

2. **Rental becomes completed**
   - Recalculate trust for both renter and owner.

3. **Dispute resolved**
   - If `penaltyType !== none`, recalculate the penalized user.
   - If account state changes (`suspendedUntil`, `isBanned`), recalculate immediately.

4. **Item report resolved**
   - If admin action affects the item owner’s trust, recalculate that owner.

5. **eKYC status changes**
   - Recalculate user trust after verification/rejection.

6. **Admin user status changes**
   - If banned/unbanned/suspended status changes, recalculate.

### 6.2. Optional maintenance trigger

Provide a safe internal utility/script to recalculate all users when:

- Deploying the new scoring model.
- Migrating existing data from the old incorrect score.
- Adjusting the scoring formula later.

---

## 7. API response rules

### 7.1. Safe public user summary

When exposing user trust/rating information publicly or to a counterparty, prefer a safe summary:

```json
{
  "_id": "...",
  "fullName": "...",
  "avatarUrl": "...",
  "ekycStatus": "verified",
  "trustScore": 82,
  "trustLevel": "high",
  "averageRating": 4.8,
  "totalReviews": 12
}
```

Do not expose:

- `password`
- `resetPasswordToken`
- `resetPasswordExpire`
- `idCardNumber`
- `idCardImages`
- sensitive email/phone unless the endpoint/business flow explicitly requires them

### 7.2. Rental request response for owner

Owner-facing rental request data should include renter reliability summary:

```json
{
  "renter": {
    "_id": "...",
    "fullName": "...",
    "avatarUrl": "...",
    "ekycStatus": "verified",
    "trustScore": 82,
    "trustLevel": "high",
    "averageRating": 4.8,
    "totalReviews": 12
  }
}
```

This helps the owner decide whether to confirm the request.

### 7.3. Public item detail

Item detail should not pretend that a new item already has “item reviews” if the actual reviews are about the owner.

Recommended shape:

```json
{
  "item": { "...": "..." },
  "owner": {
    "_id": "...",
    "fullName": "...",
    "avatarUrl": "...",
    "trustScore": 82,
    "trustLevel": "high",
    "averageRating": 4.8,
    "totalReviews": 12,
    "ekycStatus": "verified"
  }
}
```

If existing response already has `owner`, enrich it safely rather than inventing `itemRating`.

---

## 8. Current source code problems that must be corrected

Based on the current backend source:

### 8.1. TrustScore is incorrectly used as average star rating

The current review controller calculates:

```txt
trustScore = average public review rating
```

This is incorrect.  
It must become:

```txt
averageRating = average public review rating
trustScore = reliability score from the scoring rules in this document
```

### 8.2. TrustScore scale is inconsistent

The current code mixes incompatible meanings:

- Review logic treats `trustScore` as roughly `1.0–5.0`.
- Dispute logic subtracts `20`, `50`, or sets `-100`.
- Item report logic subtracts `10` or `30`.
- Admin risky-user logic checks `trustScore < 3`.

These behaviors must be normalized to the new `0–100` score.

### 8.3. Direct mutations should be removed

Controllers should not directly apply arithmetic mutations to `trustScore`.  
They should persist the underlying event and call the centralized trust score recalculation service.

### 8.4. New user default should be reconsidered

Current `User.trustScore` default is `0`.  
Under the defined model, it should become `50`.

Existing users may need a one-time recalculation utility/script or a safe migration approach.

---

## 9. Compatibility rules

### 9.1. Avoid breaking existing frontend flows

When backend responses are expanded:

- Prefer adding new fields.
- Avoid removing fields currently used by frontend unless verified.
- If a field has historically carried the wrong meaning, consider a transition period:
  - Keep old field only where unavoidable.
  - Add the correct explicit fields (`averageRating`, `trustScore`, `trustLevel`).
  - Update misleading comments/names in backend code.

### 9.2. Do not invent unrelated architecture

The trust score implementation should:

- Reuse existing models, enums, and project patterns.
- Keep controllers thin.
- Put scoring logic in a small reusable service.
- Add helpers only where they reduce duplication.

---

## 10. Acceptance criteria

The TrustScore backend implementation is considered correct when:

1. `trustScore` is no longer equal to average review stars.
2. `averageRating` and `totalReviews` represent public review aggregates.
3. `trustScore` uses the 0–100 scoring model and is clamped.
4. New users have a neutral score model, not a misleading zero-risk/zero-trust interpretation.
5. Dispute/report/eKYC/completed-rental events trigger recalculation where appropriate.
6. Owner-facing rental request data can include renter trust/rating summary.
7. Admin risky-user logic is updated to the 0–100 scale.
8. Public profile / item owner summaries can expose trust/rating safely.
9. No sensitive KYC/password/reset-token data is leaked in public/counterparty responses.
10. The implementation remains maintainable, centralized, and easy to extend.

---

## 11. Future extensions, not required now

Possible later improvements:

- Separate trust dimensions for owner vs renter.
- Time decay for old penalties.
- Fraud signals such as repeated cancellations or suspicious account patterns.
- Transparent score breakdown returned to the authenticated user.
- Manual admin override with audit trail.
- Background job for periodic recalculation.

These are not required for the current MVP unless explicitly requested.
