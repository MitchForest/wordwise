# Sprint 006: WordPress Publishing MVP

**Status:** Planning
**Epic:** 002 - Publishing Integrations
**Date Started:** 2024-07-26
**Date Completed:**

## Feature Requirements
Implement the foundational architecture and UI to allow a user to:
1. Securely connect their self-hosted WordPress site using an Application Password.
2. Publish a document from the WordWise editor to their WordPress site as a 'draft'.
3. The architecture must be designed to be easily extensible for future publishing platforms (e.g., Ghost, Medium).

---

## Analysis & Decisions

After reviewing the proposal in `.pm/docs/old/publishng.md`, I've made the following recommendations for this initial sprint:

*   **Simplify the Core:** We will implement the `Publisher` interface and the specific `WordPressPublisher` directly. The `PublishingManager` factory is excellent but adds a layer of abstraction that isn't necessary for a single platform. We will introduce it in a future sprint when we add the second integration, which will be the true test of the "plug-and-play" architecture.
*   **Focus on Publishing, Not Syncing:** We will create the `publishing_integrations` table to store credentials. However, we will **defer** implementing the `published_posts` table. The goal of this MVP is to *publish* a new post. Two-way synchronization and updating existing posts is a separate, complex feature that belongs in a future sprint.
*   **Prioritize Security:** We will **only** support WordPress Application Passwords. The proposal mentioned Basic Auth (username/password), which is insecure and often disabled on modern hosts. Sticking to Application Passwords simplifies the UI and improves security. We must also encrypt the credentials in the database.

---

## Technical Plan

### Phase 1: Backend - Database & Core Types
- [ ] **1. Define Publishing Types:**
    - **File:** `types/publishing.ts` (new)
    - **Action:** Create all necessary interfaces (`Publisher`, `PublishingCredentials`, `PublishOptions`, `PublishResult`, `BlogContent`) as outlined in `publishng.md`. This provides a strong, typed foundation for the entire feature.
- [ ] **2. Create Database Schema:**
    - **File:** `lib/db/schema.ts` (or a new `lib/db/schema/publishing.ts`)
    - **Action:** Add the `publishingIntegrations` table. It should include `userId`, `platformId`, `name`, and an encrypted `credentials` field (`jsonb`).
- [ ] **3. Implement Database Migration:**
    - **Tool:** `drizzle-kit`
    - **Action:** Run `bun drizzle:generate` to create the SQL migration file for the new table and review it for correctness.
- [ ] **4. Add Credential Encryption:**
    - **File:** `lib/security/credentials.ts` (new)
    - **Action:** Create simple `encrypt` and `decrypt` functions using the built-in `crypto` module and a secret key from environment variables. This is critical for safely storing API keys.

### Phase 2: Backend - API & Publishing Service
- [ ] **5. Implement WordPress Publisher Service:**
    - **File:** `services/publishers/wordpress.ts` (new)
    - **Action:** Create the `WordPressPublisher` class that implements the `Publisher` interface. It will contain the logic to communicate with the WordPress REST API.
    - **Details:**
        - Implement `testConnection` to validate credentials.
        - Implement `publish` to create a new post. It will send the document's title and HTML content.
        - The service will exclusively use Application Passwords (`Authorization: Bearer <password>`).
- [ ] **6. Create Integration Management API:**
    - **File:** `app/api/integrations/wordpress/route.ts` (new)
    - **Action:** Create `POST` and `GET` endpoints for managing WordPress integrations.
    - **Details:**
        - `POST` will accept a site URL and application password, test the connection using the `WordPressPublisher`, and save the encrypted credentials to the `publishingIntegrations` table.
        - `GET` will return a list of saved integrations for the current user (without credentials).
- [ ] **7. Create Publishing API:**
    - **File:** `app/api/publish/[integrationId]/route.ts` (new)
    - **Action:** Create a `POST` endpoint that takes a `documentId` and publish options.
    - **Details:**
        - It will fetch the integration credentials, decrypt them, and get the document content.
        - It will then use the `WordPressPublisher` to send the content to the user's WordPress site.
        - For the MVP, the post status will be hardcoded to `draft`.

### Phase 3: Frontend - UI & State Management
- [ ] **8. Create Publishing Hook:**
    - **File:** `hooks/usePublishing.ts` (new)
    - **Action:** Develop a hook to manage the state of the publishing flow.
    - **Details:**
        - Expose `isPublishing`, `publish`, `integrations`, `addIntegration`.
        - It will handle all fetch requests to the new API endpoints.
- [ ] **9. Add "Publish" Button to UI:**
    - **File:** `components/editor/DocumentHeader.tsx` (modified)
    - **Action:** Add a new "Publish" button next to the "Save" indicator. This button will open the `PublishingDialog`.
- [ ] **10. Build the Publishing Dialog:**
    - **File:** `components/publishing/PublishingDialog.tsx` (new)
    - **Action:** Create the main dialog component.
    - **Details:**
        - If the user has no integrations, it will show the `WordPressIntegrationSetup` component.
        - If integrations exist, it will show a dropdown to select one and a "Publish to Draft" button.
        - It will use the `usePublishing` hook to manage its state and actions.
- [ ] **11. Build the Integration Setup Form:**
    - **File:** `components/publishing/WordPressIntegrationSetup.tsx` (new)
    - **Action:** Create the form for adding a new WordPress integration.
    - **Details:**
        - Inputs for "Site Name" (e.g., "My Personal Blog"), "Site URL", and "Application Password".
        - A "Test Connection" button to give the user immediate feedback.
        - A "Save" button that calls the `addIntegration` function from the `usePublishing` hook.

### Phase 4: Finalization
- [ ] **12. Testing and Validation:**
    - **Action:** Manually test the full end-to-end flow: adding an integration, seeing it appear in the publish dialog, and successfully publishing a post. Verify the post appears as a draft in WordPress.
- [ ] **13. Code Quality Checks:**
    - **Action:** Run `bun lint`, `bun typecheck`, and `bun run build` to ensure no new issues have been introduced.
- [ ] **14. Final Sprint Documentation:**
    - **File:** `sprint-006-wordpress-publishing-mvp.md` (this file)
    - **Action:** Update with a session summary and file change log. Update `PROJECT_STATUS.md`.

---
## Files to be Modified/Created

- **Created:**
  - `types/publishing.ts`
  - `lib/db/schema/publishing.ts` (or modified `lib/db/schema.ts`)
  - `lib/security/credentials.ts`
  - `services/publishers/wordpress.ts`
  - `app/api/integrations/wordpress/route.ts`
  - `app/api/publish/[integrationId]/route.ts`
  - `hooks/usePublishing.ts`
  - `components/publishing/PublishingDialog.tsx`
  - `components/publishing/WordPressIntegrationSetup.tsx`
- **Modified:**
  - `lib/db/schema.ts` (if not creating a new file)
  - `drizzle.config.ts` (to include new migration)
  - `components/editor/DocumentHeader.tsx`
  - `.pm/PROJECT_STATUS.md`
  - `epic-002-publishing-integrations/epic-summary.md`
  - `.pm/epics/epic-002-publishing-integrations/sprint-006-wordpress-publishing-mvp.md`

---

Please let me know your thoughts on this plan. We can adjust the scope or technical details before I begin implementation. 