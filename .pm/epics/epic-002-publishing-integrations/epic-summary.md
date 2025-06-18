# Epic 002: Publishing Integrations

## Description
This epic will build the functionality to publish documents directly from WordWise to external platforms. The initial focus is on a robust and secure integration with WordPress, while establishing a flexible architecture that allows for the seamless addition of other platforms (like Ghost, Medium, etc.) in the future.

## Planned Sprints
1. **Sprint 006:** WordPress Publishing MVP - Establish the core architecture, database schema, and UI to allow users to connect their WordPress site and publish a document as a new draft.
2. **Sprint 007:** (Future) Advanced Publishing & Sync - Implement post updating, metadata synchronization (categories, tags), and support for other post statuses.
3. **Sprint 008:** (Future) Ghost Integration - Add Ghost as the second publishing platform, validating the extensibility of the architecture.

## Technical Approach
- A new `publishing` service layer will be created, using a `Publisher` interface to abstract platform-specific logic.
- A new `publishing_integrations` table will be added to the database to store user credentials securely.
- API endpoints will be created for managing integrations and handling the publishing process.
- The UI will consist of a publishing dialog, integration setup forms, and status indicators.
- Credentials will be encrypted at rest.

## Success Criteria
- [ ] Users can securely connect their WordPress.org or WordPress.com site.
- [ ] Users can publish a document to their WordPress site as a 'draft'.
- [ ] The architecture is validated as "plug-and-play" for future integrations. 