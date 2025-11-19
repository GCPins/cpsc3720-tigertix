# TigerTix Testing Strategy

This document describes the comprehensive testing approach for TigerTix, covering unit, integration, and end-to-end (E2E) testing across microservices, the React frontend, user authentication, LLM-driven features, voice UX, accessibility, and database concurrency.

## Scope

- Admin microservice (Express, SQLite): event and user creation and validation.
- Client microservice (Express, SQLite): listing events, purchasing tickets, transactional integrity, LLM parsing endpoint, user authentication (registration, sign in, JWT), protected routes, and JWT validation and expiration.
- Frontend (React): UI rendering, purchase flow, live regions for accessibility, and chatbot interactions.
- LLM-driven booking: request/response contract tests via mocks; live systems covered by manual tests.
- Voice-enabled interface: manual interaction verification and basic fallback handling.
- User registration and login: automated integration tests and manual interaction verification.
- Accessibility features: ARIA roles, live region announcements, keyboard navigation.
- Database transactions and concurrency: atomic ticket purchases and capacity enforcement.

## Test Types and Tools

- Unit tests
  - Backend: Jest for pure functions and controller validation logic.
  - Frontend: React Testing Library + Jest for helpers and component behavior.
- Integration tests
  - Backend: Supertest + Jest against exported Express apps. SQLite DB isolated per test via `TIGERTIX_DB_PATH` and `init.sql`.
  - Concurrency: multi-request tests to validate capacity limits and transactional updates.
- End-to-end (lightweight)
  - Automated: Service-to-service flows (e.g., purchase endpoint updates capacity and response used by frontend state).
  - Manual: LLM/voice, keyboard/screen-reader navigation, registration/log in.

## Environments

- Local dev (Windows PowerShell) with Node 18+ and SQLite (via better-sqlite3).
- Tests use a temporary SQLite DB file per test run. No persistent state.

## Contracts and Edge Cases

- Admin: rejects invalid JSON, negative capacity, non-ISO dates, and past datetimes.
- Client: robust authentication (invalid input, wrong credentials, expired/tampered tokens); purchase rejects zero/negative qty, invalid event ID, insufficient capacity; transactions are atomic.
- LLM: controller returns a JSON string (from model) for the frontend to JSON.parse. For automated tests, the model layer is mocked.
- Voice: feature-detects SpeechRecognition and degrades gracefully.
- Accessibility: live `role="status"` region updates after purchases; buttons have ARIA labels; keyboard-first flows.

## Running Tests

- Backend
  - Install dev deps in `backend` and run tests:
    - `npm install`
    - `npm test`
- Frontend
  - In `frontend`:
    - `npm install`
    - `npm test`

See TEST-REPORT.md for executed cases and outcomes.
