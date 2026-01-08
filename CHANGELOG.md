# Changelog

## [Unreleased] - 2026-01-08

### Fixed
- **Novo Chamado**: Fixed issue where `clientName` was not being sent to the backend (mapped correctly from camelCase to snake_case).
- **Novo Chamado**: Added validation for empty description in rich text editor.
- **Novo Chamado**: Improved error messages using `useToast` with specific API feedback.
- **Avaliação**: Fixed issue where `rating` and `feedback` were not visible in the frontend due to missing mapping in `TicketService`.
- **Backend**: Verified schema compatibility for `ticket_history` and `tickets` tables.
- **Database**: Added missing columns `unit`, `municipality`, `uf`, `attachment`, `assigned_at` to `tickets` table via migration scripts to fix "Erro ao criar chamado".
- **Backend**: Increased JSON body limit to 50MB to support large attachments.
- **Frontend**: Fixed issue where Rating Modal would close unexpectedly when selecting a rating (added event propagation handling).
- **Avaliação**: Confirmed and preserved rating labels logic (Péssimo to Excelente).
- **Frontend**: Increased attachment size limit to 5MB per file.
- **Avaliação**: Updated backend permissions to allow Clients to resolve and rate tickets simultaneously (fixing 403 error).
- **Backend**: Added validation to ensure rating is between 1 and 5.

### Added
- **Tests**: Added `backend/src/scripts/test-new-ticket-flow.ts` and `test-evaluation-flow.ts` for automated validation.
