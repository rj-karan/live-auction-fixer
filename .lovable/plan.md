# Team sponsors and sold-player broadcast upgrade

## What will change
- Add optional sponsor name and sponsor logo fields to each existing team without changing current sponsor records or auction tables.
- Add those fields to both Add Team and Edit Team, using the existing device upload control and media storage flow.
- Include the winning team’s current sponsor details in the existing public sold-announcement queue.
- Apply this priority in one place: valid team sponsor logo first; otherwise the active tournament sponsor list; otherwise no sponsor block.
- Replace random fallback selection with a controlled rotation based on successive sale announcements, while always bypassing fallback sponsors when a team sponsor logo exists.
- Refine the existing sold animation only: clearer player/team/price hierarchy and a larger responsive broadcast-partner panel with subtle theme-aware motion.

## Data safety
- Use one additive database migration adding nullable `sponsor_name` and `sponsor_logo_url` columns to `teams`.
- Preserve all existing rows, sponsors, events, purse totals, Round 1/2 behavior, realtime data, URLs, and access policies.
- Do not change sale, unsold, undo, team-assignment, or bidding functions.

## Technical details
- Update the team form state and create/edit payloads in the existing admin Teams page.
- Extend the sold-announcement item with an optional team sponsor and resolve the displayed sponsor deterministically.
- Keep the existing tournament sponsor loader and realtime subscriptions as the fallback source.
- Refresh generated database typings through the normal backend migration flow; do not hand-edit generated integration files.

## Verification
- Run focused type and production checks.
- Verify desktop and mobile rendering with screenshots.
- Use an isolated test tournament and restore it afterward to test: assigned team sponsor, fallback sponsor, and no-sponsor behavior.
- Confirm the public page receives the sale state through the existing realtime path and that Confirm Sale, Mark Unsold, Undo, and Round 1/2 behavior remain unchanged.
