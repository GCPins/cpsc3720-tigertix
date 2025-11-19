# TigerTix Test Report

Date: 2025-11-02

## Automated Execution Details

- Platform: Windows (PowerShell)
- Node.js: v22.19.0
- npm: 10.9.3
- Database: SQLite (better-sqlite3)
- Isolation: Temporary SQLite file per run via TIGERTIX_DB_PATH and init.sql
- Branch: main

## Automated Test Summary

- Backend (Jest + Supertest)
  - Admin service: PASS (event creation valid/invalid)
  - Client service: PASS (list events, purchases, conflicts, concurrency), PASS (mocked LLM parse)
  - Authentication tests: PASS  (registration, login, 
  JWT/expected routes, expired token)
  - Totals: 16 tests (3 suites) — all passed
- Frontend (React Testing Library + Jest)
  - App renders and loads events: PASS
  - Accessibility live region updates on purchase: PASS
  - Chatbot toggle and mocked LLM error message: PASS
  - Totals: 4 tests (3 suites) — all passed

## Manual Test Cases and Results

Record actual outcomes and any issues while executing the steps below on a running system.

### NL Booking via Text
- Steps:
  1) Start backend services and the frontend.
  2) Open the chatbot and enter: "Reserve 2 tickets for Homecoming Concert".
  3) The assistant should ask for confirmation; reply with "yes".
- Expected: Tickets decrement by 2; confirmation message announced.
- Actual: [record]
- Notes/Bugs: [record]

### NL Booking via Voice
- Steps:
  1) Open the chatbot, press the microphone button, and say: "Book 1 ticket for Basketball Game".
  2) Observe the acknowledgment. On confirmation, seats should decrement.
- Expected: Recognition beeps, bot echoes, confirmation path available.
- Actual: [record]
- Notes/Bugs: [record]

### Accessibility: Keyboard & Screen Reader
- Steps:
  1) Navigate to Buy Ticket buttons via Tab; ensure visible focus.
  2) Use Enter to purchase; observe `role=status` updates.
  3) Screen reader announces button labels and live updates.
- Expected: Buttons reachable, ARIA labels accurate, live region announces.
- Actual: [record]
- Notes/Bugs: [record]

### Concurrency & Database Consistency
- Steps:
  1) With capacity N on an event, simultaneously attempt >N purchases.
  2) Verify only N successes; remaining are conflicts; capacity never negative.
- Expected: Consistent state, no deadlocks.
- Actual: [record]
- Notes/Bugs: [record]

### Registration & Sign In
- Steps:
  1) Navigate to registration page, enter valid email, password, first name, and last name, and submit registration
  2) Navigate to sign in page and enter the same email and password
  to sign in.
- Expected: Tickets and chatbot are now available to user.
- Actual: [record]
- Notes/Bugs: [record]
