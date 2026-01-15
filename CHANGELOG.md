# Changelog

## [Unreleased] - 2026-01-12

### Added
- **Mobile**: Added Floating Action Button (FAB) to Dashboard screen for quick ticket creation.
- **Mobile**: Implemented ticket categorization tabs (Sistema, Equipamento, Concluído) in Tickets screen to match web version.
- **Mobile**: Enhanced filtering logic for ticket categories.
- **Mobile**: Added previous/next navigation controls to TicketDetailModal for better navigation.
- **Mobile**: Implemented full Users Management screen (`UsersScreen`) with List, Search, Sort, and CRUD operations.
- **Mobile**: Added Role-based access control for Users screen and actions (Admin only for edits).
- **Mobile**: Added `UserModal` and `PasswordModal` for managing users.
- **Mobile**: Implemented complete Notification System parity with Web version.
- **Mobile**: Added `NotificationContext` for global state management and synchronization.
- **Mobile**: Added vibration alerts for new notifications with toggle control.
- **Mobile**: Updated `Header` and `NotificationModal` to use the new context.

### Fixed
- **Mobile**: Fixed `styles` declaration conflict in ProfileScreen.
- **Mobile**: Fixed `filteredTickets` declaration conflict in TicketsScreen.
- **Mobile**: Removed duplicate "Dados da Conta" section from ProfileScreen.
- **Mobile**: Updated `NotificationDropdown` for WCAG accessibility (aria-labels).
- **Mobile**: Corrected `User` type definition and usage of `role` vs `profile` across the app for better permission handling.
- **Mobile**: Fixed ticket rating flow so Clientes and Administradores podem avaliar chamados resolvidos diretamente na tela de detalhes, alinhando o comportamento com a versão Web.

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
