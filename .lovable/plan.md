# Public Random Player Spin Broadcast

## Goal
Make the existing admin random-player spin visible as a large, polished live moment on the public tournament page, without changing auction rules or records.

## Work
- Publish a temporary `spinning` state through the existing `live_auction` row when an admin starts the existing random reel; leave manual selection and sale/unsold/undo flows untouched.
- Add a public full-screen broadcast overlay that listens to that same realtime row, animates eligible players during the spin, and resolves to the exact player selected by the admin once the existing flow publishes that player.
- Keep the public dashboard’s existing live-auction panel and all tournament data/layout intact. Respect reduced-motion preferences and dismiss the broadcast when the live state leaves `spinning`.
- Handle stale/unavailable picks by clearing the temporary spin state so spectators are not left on a frozen screen.

## Technical details
- No database schema or migration changes: use `live_auction.status = "spinning"`, with `player_id` unset until the existing random pick commits.
- Add the spectator overlay to the public tournament route independently of the dashboard widget, so it remains visible on the full public page.
- Verify preview rendering and realtime state transitions; run the project type check and production build.
