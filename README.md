# TigerTix

## Project Overview
TigerTix is a comprehensive ticketing system designed to manage events and ticket sales. The system is built using a microservices architecture, separating administrative functions from client-facing features, all powered by a modern web stack.

## Tech Stack
- **Frontend:** React.js
- **Backend:** Node.js, Express.js
- **Database:** SQLite (managed via `better-sqlite3`)
- **AI Integration:** Google Gemini API (for LLM features)
- **Testing:** Jest, React Testing Library, Playwright

## Architecture Summary
The system is composed of the following components:

1.  **Admin Service (`backend/admin-service`)**:
    -   Runs on port **5001**.
    -   Handles event creation, management, and administrative tasks.
    -   Connects to the shared SQLite database.

2.  **Client Service (`backend/client-service`)**:
    -   Runs on port **6001**.
    -   Handles user interactions, ticket purchasing, and chatbot features.
    -   Connects to the shared SQLite database.
    -   Integrates with Google Gemini for AI capabilities.

3.  **Shared Database (`backend/shared-db`)**:
    -   A SQLite database file (`database.sqlite`) shared between the services.

4.  **Frontend (`frontend`)**:
    -   Runs on port **3000**.
    -   A React application that interacts with the backend services.

## Installation & Setup Instructions

### Prerequisites
-   Node.js (v16 or higher recommended)
-   npm

### Backend Setup
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Initialize the database:
    ```bash
    npm run setup
    ```
4.  Seed the database with initial data:
    ```bash
    npm run seed
    ```
5.  Start the backend services (starts both Admin and Client services):
    ```bash
    npm start
    ```

### Frontend Setup
1.  Open a new terminal and navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the React application:
    ```bash
    npm start
    ```
    The application should open automatically at `http://localhost:3000`.

## Environment Variables Setup
Create a `.env` file in the `backend` directory (or set these in your environment) to configure the system.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | API Key for Google Gemini (Required for AI features) | - |
| `JWT_PRIVATE_KEY` | Secret key for signing JWTs | `PLACEHOLDER_JWT_PRIVKEY_101010` |
| `INTERNAL_JWT_TOKEN` | Token for internal service communication | `PLACEHOLDER_INTERNAL_JWT_42` |
| `ADMIN_PORT` | Port for the Admin Service | `5001` |
| `CLIENT_PORT` | Port for the Client Service | `6001` |
| `TIGERTIX_DB_PATH` | Path to the SQLite database file | `shared-db/database.sqlite` |

For the frontend, you can create a `.env` file in the `frontend` directory:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `REACT_APP_API_BASE` | Base URL for the backend API | `http://localhost:6001/api` |

## How to Run Regression Tests

### Backend Tests
To run unit and integration tests for the backend services:
```bash
cd backend
npm test
```

### Frontend Tests
To run component tests for the frontend:
```bash
cd frontend
npm test
```

### End-to-End Tests
To run the full suite of regression tests using Playwright (from the root directory):
```bash
npx playwright test
```

## Team Members
-   **Instructor:** Dr. Julian Brinkley
-   **TAs:** Colt Doster & Atik Enam

| Name | Role |
| :--- | :--- |
| Aarav Chowbey | Frontend Developer, Tester |
| George Atkinson | Backend Developer, Tester |
| John Suchanek | Backend Developer, Tester |

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
