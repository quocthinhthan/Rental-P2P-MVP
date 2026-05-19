---
name: rental-flow
description: Rental lifecycle timeline guidance for the Rental P2P MVP frontend. Use when updating rental status mapping, lifecycle UI, dispute-aware timeline behavior, or rental detail/list progress indicators.
---

# Rental Flow Timeline

Use this skill when changing frontend rental lifecycle UI. The current rental detail timeline has exactly 6 steps:

1. Thanh toán
2. Chờ xác nhận
3. Ký hợp đồng
4. Giao/Nhận đồ
5. Đang thuê
6. Hoàn tất

Do not add a separate dispute step. Dispute state is shown by badge, alert text, and step state on the existing timeline.

## Standard Rental Status Mapping

- `pending_payment`
  - active: Thanh toán
  - pending: all later steps

- `pending_confirmation`
  - completed: Thanh toán
  - active: Chờ xác nhận
  - pending: all later steps

- `rejected`
  - completed: Thanh toán
  - failed/stop: Chờ xác nhận
  - pending: Ký hợp đồng, Giao/Nhận đồ, Đang thuê, Hoàn tất

- `confirmed`
  - completed: Thanh toán, Chờ xác nhận
  - active: Ký hợp đồng
  - if `contract.isFullySigned`, `rental.isFullySigned`, or both party signatures are present:
    - completed: Ký hợp đồng
    - active: Giao/Nhận đồ

- `in_progress`
  - completed: Thanh toán, Chờ xác nhận, Ký hợp đồng, Giao/Nhận đồ
  - active: Đang thuê
  - pending: Hoàn tất

- `completed`
  - completed: all 6 steps

- `cancelled`
  - do not mark the full timeline completed
  - if there is reliable previous status context, stop at that lifecycle point
  - without context, stop at Chờ xác nhận

- `refunded`
  - do not mark the full timeline completed
  - if there is reliable previous status context, stop at that lifecycle point
  - without context, stop at Đang thuê

## Active Dispute Rule

If any of these are true:

- `rental.status === 'disputed'`
- `dispute.status === 'pending'`
- `dispute.status === 'escalated'`

The lifecycle timeline must stop at step 5, Đang thuê:

- completed: Thanh toán, Chờ xác nhận, Ký hợp đồng, Giao/Nhận đồ
- warning: Đang thuê
- pending: Hoàn tất

Do not active Thanh toán, Chờ xác nhận, Ký hợp đồng, or Giao/Nhận đồ for an active dispute. Active disputes usually happen after handover, during rental, during return, or shortly after rental completion.

Recommended badge text:

- `pending`: Đang hòa giải
- `escalated`: Đang tranh chấp or Đã yêu cầu Admin xử lý depending on available UI space
- rental disputed without a dispute object: Đang tranh chấp

## Resolved Dispute Rule

When `dispute.status === 'resolved'`, do not map timeline only from the final `rental.status`. Interpret the dispute result:

- `winner === 'owner'` and `rental.status === 'completed'`
  - completed: all 6 steps

- `winner === 'renter'`
  - do not complete the full timeline, even when the final rental status is `cancelled` or `refunded`
  - completed: Thanh toán, Chờ xác nhận, Ký hợp đồng, Giao/Nhận đồ
  - active/resolved: Đang thuê
  - pending: Hoàn tất
  - badge: Tranh chấp đã giải quyết

- `winner === 'none'`
  - prefer `dispute.previousRentalStatus`
  - if `previousRentalStatus === 'completed'`, the timeline can be fully completed
  - if `previousRentalStatus === 'in_progress'`, stop at Đang thuê
  - if there is no `previousRentalStatus`, fallback to Đang thuê
  - do not automatically complete the full timeline just because the dispute is resolved

## Withdrawn Dispute / Restored Rental Rule

When `dispute.status === 'withdrawn'`, or when `dispute.status === 'resolved'` with `winner === 'none'`, the frontend must infer the restored timeline from actual rental evidence, not only from `dispute.previousRentalStatus`.

Priority order:

1. If `rental.status === 'completed'`, `dispute.previousRentalStatus === 'completed'`, or `returnImages` has any image:
   - completed: all 6 steps
2. If `rental.status === 'in_progress'`, `dispute.previousRentalStatus === 'in_progress'`, or `pickupImages` has any image:
   - completed: Thanh toán, Chờ xác nhận, Ký hợp đồng, Giao/Nhận đồ
   - active: Đang thuê
   - pending: Hoàn tất
3. If `rental.status === 'confirmed'` or `dispute.previousRentalStatus === 'confirmed'`:
   - if the contract is fully signed, active: Giao/Nhận đồ
   - otherwise active: Ký hợp đồng
4. If `endDate` has passed and `pickupImages` exists, do not auto-complete the timeline unless backend status is already `completed`.
   - keep timeline at Đang thuê
   - UI may show helper text: `Đơn đã qua ngày thuê, vui lòng hoàn tất/trả đồ.`

Important: never use `previousRentalStatus === 'confirmed'` alone to force the timeline back to Ký hợp đồng. Check pickup proof, return proof, current rental status, contract signature state, and rental dates first.

## Implementation Notes

- Keep rental status separate from dispute status.
- Active dispute maps to a frontend timeline state such as `disputed_in_progress`.
- Resolved renter-win maps to a frontend timeline state such as `dispute_resolved_at_in_progress`.
- Avoid simple `rental.status -> step index` mapping when a dispute object is present.
- The frontend `Bao cao su co` action should only appear after handover evidence exists, while the rental is `in_progress`, or during the allowed post-completion dispute window. Do not show it immediately after owner confirmation while the rental is only waiting for contract signing or pickup.
- Keep the 6 existing step labels unchanged unless the product owner explicitly asks to rename the timeline.
- Preserve icon visibility. This app loads FontAwesome 5, so timeline icons should use FA5 class names such as `fas fa-clock`, not old FA4 names such as `fa-clock-o`.
