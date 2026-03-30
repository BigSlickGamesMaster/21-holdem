# Change Request: Guest-First Entry and Login Redesign

Date: 2026-03-27

## Summary

Redesign the player entry flow so first-time visitors landing on `21-holdem.com` are directed to the guest experience instead of being forced immediately into the login screen.

At the same time, redesign the login page so it is more informational and explains:

- what 21 Hold'em is
- what the player can do in guest mode
- what the player gets by creating an account
- what they are agreeing to when signing up

This change request also establishes a standing UI requirement for this project:

- all new entry, auth, and marketing-facing UI must be designed mobile-first

## Business Reason

The current entry flow pushes new visitors directly to login, which creates friction before the product has explained itself.

The guest flow already exists and is a better top-of-funnel experience for unfamiliar users. It allows the site to demonstrate gameplay first, then convert interested players into registered users.

The login page should no longer function as the first impression of the product. It should function as a conversion page for returning players and for guests who now understand the game well enough to register.

## Current Behavior

- Unauthenticated users hitting `/` are redirected to `/login`.
- The login screen includes a small guest-mode panel, but guest access is not the default entry point.
- Successful login redirects players to `/lobby`.
- Guest mode exists under `/guest` and can auto-open a guest table.
- Auth and guest screens have responsive styling work in place, but mobile-first behavior is not yet treated as a hard product requirement.
- Core gameplay pages are not currently mobile-friendly.

## Requested Change

### 1. Make guest the default public entry

- Visitors who hit `/` should be redirected to `/guest`, not `/login`.
- Guest mode should become the primary first-touch experience for unauthenticated users.

### 2. Redesign the login screen to be informational

The login page should clearly explain:

- what 21 Hold'em is as a game
- why a visitor may want to try guest mode first
- why creating an account matters
- what the player gains after logging in
- what key sign-up expectations or commitments exist

The login page should be positioned as:

- a sign-in destination for returning players
- a conversion surface for guests ready to register

### 3. Keep direct game access for authenticated players

- Once a player is authenticated, they should not be sent back through guest or login entry screens.
- Authenticated users should go straight into the signed-in experience.
- For this request, the signed-in destination is confirmed as `/lobby`.

### 4. Mobile-first is mandatory

For this request and future UI changes:

- mobile is the primary layout target, not a later breakpoint fix
- content hierarchy, CTA placement, and copy density must be readable on small screens first
- desktop layouts may expand from the mobile baseline, but must not define it

## Implementation Notes

### Entry flow strategy

Recommended implementation:

- change root route `/` to redirect to `/guest`
- keep `/login` as a separate route for explicit sign-in
- ensure authenticated users landing on public entry routes are redirected into the authenticated experience

### Guest landing strategy

The current guest route auto-starts guest table access. That behavior should be reviewed during implementation.

Recommendation:

- convert `/guest` into a real landing screen first, with clear explanation and CTAs
- from that page, allow users to either enter the guest table, view game information, or move to sign in/register

This is more consistent with the product goal of informing players before asking them to authenticate.

### Authenticated redirect strategy

Current logic sends successful login to `/lobby`.

For this change request, the intended behavior is:

- returning authenticated players should bypass login and guest entry
- successful login should continue sending players to `/lobby`
- authenticated users landing on public entry routes should be redirected to `/lobby`

## Files Expected To Change

### Routing and redirect behavior

- `src/routes/index.jsx`
  - Change root redirect from `/login` to `/guest`.
  - Why: this is the current default public entry point definition.

- `src/routes/PublicRoutes.jsx`
  - Review authenticated-user redirect behavior for public routes.
  - Why: authenticated users should bypass guest/login entry flows and land in the signed-in experience.

- `src/views/auth/login/index.jsx`
  - Preserve `/lobby` as the successful login redirect target.
  - Redesign login page structure and copy.
  - Why: this is the current login form and guest CTA implementation.

### Guest entry experience

- `src/views/guest/index.jsx`
  - Likely redesign from auto-connect screen into a richer guest landing experience.
  - Why: this route becomes the new top-of-funnel homepage experience.

- `src/routes/GuestRoutes.jsx`
  - Review whether layout or route handling needs to change if `/guest` becomes a richer landing screen.
  - Why: this wrapper currently handles guest layout behavior.

### Layout and styling

- `src/layouts/auth-layout/index.jsx`
  - Review shell constraints, spacing, and layout support for richer informational content.
  - Why: the login redesign may need a wider or more structured auth shell.

- `src/assets/scss/views/auth/_login.scss`
  - Update login page styling for new content structure and mobile-first layout.
  - Why: this file currently contains the auth page presentation, CTA styles, and responsive auth rules.

- `src/assets/scss/layouts/auth-layout/_auth-layout.scss`
  - Update shared auth-layout shell behavior if needed for mobile-first spacing and background treatment.
  - Why: changes to the auth container often require layout-level support.

## Files Reviewed For This Change Request

- `src/routes/index.jsx`
- `src/routes/Router.jsx`
- `src/routes/PublicRoutes.jsx`
- `src/routes/PrivateRoutes.jsx`
- `src/routes/GuestRoutes.jsx`
- `src/views/auth/login/index.jsx`
- `src/views/guest/index.jsx`
- `src/layouts/auth-layout/index.jsx`
- `src/assets/scss/views/auth/_login.scss`

## Why These Files Matter

- Route files define where first-time visitors land and where authenticated users are redirected.
- The login view owns both the sign-in experience and the current guest CTA messaging.
- The guest view owns the current guest-entry flow and will become the main public landing path.
- Auth layout and auth SCSS files control whether the redesign can support a clean mobile-first presentation.

## Mobile-First Requirements

These requirements are mandatory for implementation:

- The smallest viewport is the primary design target.
- Primary CTAs must remain visible and readable without relying on large-screen spacing.
- Informational content must stack cleanly on mobile before expanding into multi-column desktop layouts.
- Any new hero, explainer, or sign-up messaging must avoid oversized copy blocks on narrow screens.
- Form fields, buttons, and explanatory panels must remain tappable and legible on mobile devices.

## Known Constraint

Gameplay screens are not currently mobile-friendly.

This change request does not attempt to fully solve gameplay responsiveness across:

- `/game`
- `/guest/game`
- `/guest/tutorial/game`

However, this request establishes that all new non-gameplay UI work from this point forward must be mobile-first.

If gameplay responsiveness is to be fixed, that should be tracked as a separate change request with its own UI, interaction, and Phaser-layout scope.

## Acceptance Criteria

- Unauthenticated users visiting `/` land on the guest experience instead of the login page.
- The login page clearly explains what 21 Hold'em is and what account creation provides.
- The login page supports guest discovery without being the only first-touch screen.
- Authenticated users are routed straight into the signed-in experience.
- Updated auth and guest entry UI is designed mobile-first.
- File-level implementation notes are captured so the changed files can be audited after development.

## Requirements Checklist

### Entry Flow Requirements

- [ ] Change the root route `/` so unauthenticated users are redirected to `/guest` instead of `/login`.
- [ ] Preserve direct access to `/login` for returning users who explicitly choose to sign in.
- [ ] Ensure authenticated users who hit public entry routes are redirected into the signed-in experience.
- [ ] Use `/lobby` as the authenticated default destination.
- [ ] Update routing behavior without breaking guest-only routes such as `/guest/game` and `/guest/tutorial/game`.

### Guest Landing Requirements

- [ ] Review the current `/guest` behavior and decide whether auto-joining the guest table should be removed.
- [ ] Redesign `/guest` as a proper first-touch landing page if product confirms that guests should be informed before being auto-seated.
- [ ] Include clear guest CTAs such as entering the guest table, learning how the game works, or signing in/registering.
- [ ] Make the guest page clearly communicate that guest mode is a trial experience and full play requires an account.
- [ ] Ensure the guest landing experience works cleanly on mobile before desktop enhancements are added.

### Login Page Requirements

- [ ] Redesign the login page to explain what 21 Hold'em is.
- [ ] Add clear product messaging explaining what a player is signing up for.
- [ ] Explain the value of creating an account versus remaining in guest mode.
- [ ] Preserve sign-in usability for returning players without burying the form behind excessive copy.
- [ ] Keep register and forgot-password actions discoverable in the redesigned layout.
- [ ] Keep guest-mode entry discoverable from the login page.
- [ ] Review whether legal or expectation-setting copy should reference privacy policy and terms.

### Authenticated User Flow Requirements

- [ ] Successful login should redirect users into the intended signed-in destination.
- [ ] Public route guards should not send authenticated users back to login.
- [ ] Returning authenticated users who land on `/` should bypass guest and login screens.
- [ ] Any handoff or verification query-parameter flows on the login screen must continue to work after the redesign.

### Mobile-First UI Requirements

- [ ] Treat mobile as the primary layout target for guest and login pages.
- [ ] Ensure primary CTAs are visible and usable on small screens without horizontal scrolling.
- [ ] Keep all text blocks readable on narrow screens with sensible spacing and line length.
- [ ] Ensure buttons, links, and form controls are touch-friendly.
- [ ] Avoid desktop-first two-column assumptions unless they collapse cleanly to a single-column mobile layout.
- [ ] Validate header, footer, and auth shell spacing on mobile devices.

### Styling and Layout Requirements

- [ ] Review `AuthLayout` constraints to support richer informational content.
- [ ] Update auth styling only where necessary and avoid regressions to register/forgot/reset flows.
- [ ] Reuse existing design tokens and component styles where possible.
- [ ] Keep visual hierarchy clear between explanation content, form actions, and guest-entry actions.

### Content Requirements

- [ ] Define concise explainer copy for what 21 Hold'em is.
- [ ] Define concise copy for what guest mode includes.
- [ ] Define concise copy for what account registration unlocks.
- [ ] Define concise expectation-setting copy describing what users are agreeing to when signing up.
- [ ] Keep content short enough to work on mobile without turning the page into a long wall of text.

### QA and Verification Requirements

- [ ] Verify unauthenticated `/` navigation goes to `/guest`.
- [ ] Verify `/login` remains available and functional.
- [ ] Verify successful login redirects to the agreed signed-in destination.
- [ ] Verify authenticated users are not shown the public entry flow again.
- [ ] Verify guest entry still reaches the guest table successfully.
- [ ] Verify handoff, verification, forgot-password, and reset-password flows still work.
- [ ] Verify guest and login pages on mobile viewport widths before approving the change.

### Documentation Requirements

- [ ] Record the final list of edited files after implementation.
- [ ] Document what changed in each edited file.
- [ ] Document why each file needed to change.
- [ ] Document any route or content decisions that changed during implementation.
- [ ] Create a follow-up request for gameplay-page mobile responsiveness if that work is not included in this scope.

## Proposed Delivery Notes

Implementation should be split into two passes:

1. Routing and redirect behavior
2. Guest landing and login redesign

This keeps entry-flow logic changes isolated from visual redesign changes and makes testing easier.

## Post-Implementation Documentation Requirement

When implementation begins, this change request should be updated with a completion section containing:

- final list of edited files
- exact behavior changed in each file
- reason for each edit
- any deviations from this request
- any follow-up work deferred to a separate request

## Implementation Progress

Status: In progress

### Completed So Far

#### 1. Routing pass completed

- Root route `/` now redirects unauthenticated users to `/guest`.
- Root route `/` now redirects authenticated users to `/lobby`.
- Authenticated users attempting to access guest routes are redirected to `/lobby`.

#### 2. Guest landing redesign pass completed

- The old guest auto-entry screen was replaced with a real guest landing page.
- The guest landing page now uses mobile-first layout and shorter, more visual messaging.
- The guest landing page now leads with game imagery and the 21 Hold'em splash logo.
- The guest landing page now includes comic-style table callouts highlighting gameplay hooks.
- The guest landing page now includes clear CTAs for:
  - entering the guest table
  - starting the tutorial
  - signing in
  - creating an account
- The guest landing page now includes reward/value messaging for:
  - 10K free chips on sign-up
  - daily bonuses
  - missions

#### 3. Mobile gameplay recommendation added

- A lightweight in-game recommendation now appears on narrow portrait screens telling players to rotate their device to landscape for the best table experience.

#### 4. Guest landing polish pass completed

- The guest landing hero was tightened to reduce text load for first-time players.
- Mobile image callouts were reduced so the table art remains readable on small screens.
- The guest landing page was shifted closer to the original auth-screen look with a crisper blue-green palette and cleaner borders.
- The shared footer was removed from guest landing routes to preserve mobile screen space.

#### 5. In-place tutorial hero pass completed

- The guest tutorial entry no longer requires navigating away from the landing page.
- The top hero image now acts as the tutorial stage, so the character and table art stay visible during onboarding.
- The tutorial CTA now advances short step-by-step lessons directly on the landing page.
- Lightweight deal-card animation was added inside the hero window to preview table flow without loading the gameplay route.
- The screenshot-style hero was replaced with a custom stage built around the new single-character artwork.

### Edited Files So Far

- `docs/CHANGE_REQUEST_GUEST_FIRST_LOGIN_REDESIGN.md`
  - Added the original change request, requirements checklist, and this implementation progress section.
  - Why: keep planning and implementation tracking in one place.

- `src/routes/index.jsx`
  - Added auth-aware root redirect logic.
  - Why: new players must land on guest mode instead of login.

- `src/routes/GuestRoutes.jsx`
  - Redirects authenticated users away from guest routes to `/lobby`.
  - Why: signed-in players should bypass public guest entry flow.

- `src/views/guest/index.jsx`
  - Replaced the auto-loading guest join screen with a marketing-oriented guest landing page.
  - Added short-form educational copy, comic-style callouts, sign-up value messaging, and clearer CTA structure.
  - Reworked the tutorial CTA so it now runs in-place inside the hero window with step-based copy and animated demo cards.
  - Swapped the screenshot hero composition for a custom staged layout that uses the new single-character art.
  - Why: guest mode is now the public homepage and must explain the game quickly.

- `src/assets/scss/views/guest/_guest.scss`
  - Added dedicated mobile-first styles for the new guest landing page.
  - Added hero-stage overlay, tutorial callout, and card-deal animation styles for the embedded front-page tutorial.
  - Added staged felt-table and host-character placement styles for the new asset-driven hero.
  - Why: the new guest homepage needed its own layout and visual system.

- `src/assets/scss/main.scss`
  - Imported the new guest landing stylesheet.
  - Why: activate the new guest page styles in the global Sass build.

- `src/views/game/index.jsx`
  - Added a portrait-screen landscape recommendation.
  - Why: gameplay is not mobile-friendly yet, so players need guidance for the best experience.

- `src/assets/scss/views/game/_game.scss`
  - Added styling for the in-game landscape recommendation banner.
  - Why: support the mobile guidance added to the game shell.

- `src/shared/components/Footer/index.jsx`
  - Hides the shared footer on `/guest` and `/guest/tutorial`.
  - Why: the footer consumed too much mobile viewport space on the guest landing experience.

### Still Pending

- Login page redesign
- Final review of guest landing imagery and copy
- Follow-up documentation for any additional implementation passes
- Separate change request for gameplay-page mobile responsiveness, if approved