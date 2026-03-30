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