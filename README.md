# TermHub: ETA Management System 🚀

TermHub is an enterprise-grade internal **ETA Management System** designed to improve tracking, visibility, and control over logistics and case handling processes. 

It solves "time blindness" for agents via live tracking and provides a centralized real-time dashboard for leadership to monitor at-risk cases.

## 🏗 System Architecture & Tech Stack

This project follows a **Modular Monolith** pattern using a single NestJS server with isolated internal modules.

- **Backend:** Node.js (NestJS v11) — REST API & WebSocket Server
- **Database:** PostgreSQL v16
- **ORM:** Prisma v7 (v7.6.0+)
- **Authentication:** Google Identity Provider (OAuth2) & JWT (with Refresh Token Rotation)
- **Documentation:** Swagger (OpenAPI 3.0)
- **Real-time:** Socket.io

---

## 🛡 Security & Session Management

### 🔑 Authentication Strategy
TermHub uses a dual-token JWT strategy for maximum security:
- **Cookie Storage**: Tokens are stored in **HttpOnly, Secure, SameSite: Lax** cookies. This prevents JavaScript from accessing the tokens, eliminating XSS steal risks.
- **Access Token**: Valid for **1 hour** (configurable via `JWT_ACCESS_EXPIRES_IN`).
- **Refresh Token**: Valid for **1 day** (configurable via `JWT_REFRESH_EXPIRES_IN`).
- **Rotation**: Refresh tokens are hashed and stored in the database. Every refresh request rotates both tokens, invalidating the old refresh token to prevent reuse.
- **Account Blocking**: Users with the `NEW_USER` role or with `isActive: false` are **blocked** from logging in. No JWTs are issued until an administrator activates the account or changes the role.

> [!IMPORTANT]
> **Frontend Requirement**: Clients must send requests with `withCredentials: true` (or equivalent) for the browser to include and accept cookies.

### 👤 User Activity Tracking
The system monitors real-time activity for all agents and supervisors:
- **`isOnline`**: Boolean flag toggled during login/logout.
- **`lastActive`**: Timestamp updated on every API request or token refresh.

### 🔐 Webhook Security (Zero-Trust Architecture)
The system uses a highly secure, zero-trust approach for system-to-system integrations (Salesforce & GAS):
- **IP Allowlisting & Normalization**: Requests are strictly filtered by IP via `ALLOWED_WEBHOOK_IPS`. The system automatically normalizes IPv6-mapped IPv4 addresses (e.g., `::ffff:127.0.0.1` -> `127.0.0.1`) to ensure reliable filtering across different network environments.
- **HMAC SHA256 Signatures**: Payloads must be signed using `WEBHOOK_SECRET`. The guard computes the hash of the raw request payload using `crypto.timingSafeEqual` to prevent timing attacks.
- **Synchronous Processing**: Webhooks are processed immediately to ensure atomic database updates. High-performance indexing and efficient service logic keep response times minimal.

### 🛑 Security & Rate Limiting
The application uses a tiered rate-limiting strategy via `@nestjs/throttler`:
- **Global Policy**: 120 requests/minute for general API usage.
- **Auth Protection**: Strict **5 attempts per 3 minutes** on login/SSO endpoints to prevent brute-force attacks.
- **Webhook Policy**: 200 requests/minute for Salesforce and GAS integrations to handle peak synchronization loads.

---

## 📋 System Logging & Monitoring
- **Winston Logger**: The application uses Winston for professional log management.
- **File Rotation**: Logs are automatically stored in the `/logs/` directory, separated into `error` and `combined` streams, and retained for 30 days with daily rotation.
- **HTTP Interceptors**: A global `LoggingInterceptor` tracks every request's method, URL, status code, and latency in milliseconds.

---

## 📊 Data Model & Architecture

### Case Workflow: Session-Based Model

The system uses a **two-table session model** that separates static case identity from dynamic agent work sessions.

#### 🗂 `Case` Table — Static Identity
Holds immutable data that does not change per agent or over time. Populated by **Salesforce**.

| Field | Source | Description |
| :--- | :--- | :--- |
| `caseNumber` | Salesforce | Unique identifier for the case. |
| `accountName` | Salesforce | Customer account name. |
| `country` | Salesforce | Country of the account. |
| `receiveCount` | Salesforce | Number of times the webhook created/updated the case. |
| `lastClosedAt` | Salesforce | Tracking timestamp for when the case was closed by webhook. |
| `createdAt` | System | Auto-generated creation timestamp. |

#### 📋 `Assignment` Table — Dynamic Session
Each time an agent submits the ETA form via **GAS**, a **new Assignment record** is created under the same case. This enables full historical tracking and concurrent multi-agent support.

| Field | Source | Description |
| :--- | :--- | :--- |
| `status` | System / Admin | `OPEN` or `CLOSED` — tracks the agent's work session. |
| `caseType` | Salesforce | Type of case (e.g., "Menu Typing"). Can change per session. |
| `formType` | GAS (Form) | Form type as filled by the agent. |
| `formSubmitTime` | GAS (Form) | Exact time the GAS form was submitted, defining the session identity. |
| `startTime` | Salesforce | When the agent started working on the case. |
| `etaMinutes` | GAS (Form) | Estimated time to completion in minutes. |
| `items`, `choices`, `description`, `images`, `tmpAreas`, `isValid`, `isOnTime` | GAS (Validated) | Evaluation metrics received from the final GAS validation phase. |
| `userId` | GAS / SF | The registered agent assigned to the case (Optional). |
| `ownerEmail` | Salesforce | The email of the case owner from Salesforce. |

> [!NOTE]
> **Historical Tracking**: Every GAS form submission creates a **new** Assignment record. If an agent re-opens a closed case, a fresh Assignment is created — preserving the full audit history.

> [!NOTE]
> **Concurrent Assignments**: Multiple agents can have `OPEN` assignments on the same case simultaneously. Each has an independent `status`, `formType`, and `etaMinutes`.

---

### 🚦 Hierarchical Visibility & Permissions (RBAC)
The system implements a strict **Rank-Based Hierarchical Model**:
- **Role Ranks**: Every role is assigned a numeric rank (e.g., `SUPER_USER: 100`, `ADMIN: 80`, `AGENT: 10`).
- **Management Guard**: Users can only manage/modify accounts with a **lower rank** than their own. This prevents an `ADMIN` from modifying a `SUPER_USER`, and ensures a `LEADER` cannot promote someone to `ADMIN`.
- **Visibility**: `ADMIN` and `SUPER_USER` have complete visibility. `SUPERVISOR` sees everyone except `ADMIN+`. `CMD/LEADER` only see operational roles.
- **Self-Modification Prohibited**: No user can change their own role or active status.

---

### 👥 Team Hierarchy (Self-Referencing)
The `User` model supports a **one-to-many self-referencing hierarchy**, allowing Agents and Supporters to be linked to a single Team Leader.

| Field | Type | Description |
| :--- | :--- | :--- |
| `leaderId` | `String?` | Optional FK referencing another `User.id` — the direct Team Leader. |
| `leader` | `User?` | Relation field: the Team Leader this user reports to. |
| `team` | `User[]` | Relation field: the list of users managed by this Leader. |

> [!NOTE]
> **Single Leader Rule**: Each user can only be assigned to **one** Team Leader at a time, enforced at the database level via a simple Foreign Key (not a junction table).

> [!TIP]
> **No Leader**: Users with no `leaderId` (e.g., `SUPER_USER`, `ADMIN`, `SUPERVISOR`) operate independently at the top of the hierarchy. Their `leader` field is `null`.


---

## 🛡 Phase 1 & 2 Security & Performance Audit (April 4, 2026)

### 🔒 Security Hardening
- **HTTP Security Headers**: Integrated `helmet` middleware to enforce secure headers (CSP, HSTS, XSS protection).
- **Dynamic CORS**: Moved CORS origin control to `.env` (`CORS_ORIGIN`) for environment-specific flexibility.
- **Refresh Token Reuse Detection**: Implemented a defense-in-depth strategy where using an old/rotated refresh token triggers a `TOKEN_REUSE_DETECTED` event and immediately invalidates all active sessions for that user.

### ⚡ Database Optimization
- **Performance Indexes**: Added strategic indexes to `schema.prisma` targeting the most expensive queries:
    - `Assignment(userId, assignedAt)`: Optimized the Leaderboard SQL query for sub-second execution.
    - `Assignment(caseId)`, `Assignment(status)`: Accelerated case history and status filtering.
    - `User(role, isActive)`, `User(leaderId)`: Improved management list and hierarchy performance.
- **Prisma 7 Compatibility**: Standardized the configuration by moving database connection strings to `prisma.config.ts`, ensuring compliance with the latest Prisma architecture.
- **Data Integrity**: Enforced strict relationship rules to prevent orphaned records and maintain a reliable audit trail.

### 🔄 Integration & Webhook Audit
- **Transaction Hardening**: Refactored logic to move Socket.io emissions outside of Prisma transactions, ensuring database locks are released as quickly as possible.
- **Strict Data Validation**: Upgraded all webhook DTOs with `@IsISO8601()`, `@IsEmail()`, and other strict Type-Safety decorators to prevent malformed data from external systems.
- **Race Condition Prevention**: Verified the use of atomic `upsert` and strict `findFirst` ordering within transactions to handle high-frequency overlap between Salesforce and GAS webhooks.

### 💎 Comprehensive Module Audit (April 4, 2026)
- **Auth Hardening**: Removed all insecure default secrets (`|| 'secret'`) from JWT strategies. All secrets are now strictly required in `.env` for the server to boot.
- **Hierarchy Security**: Implemented a centralized `ROLE_RANK` system in `UsersService` to prevent unauthorized privilege escalation (e.g., an ADMIN promoting someone to SUPER_USER).
- **Webhook Stabilization**: Resolved IP matching issues behind proxies/dual-stack by implementing IPv4 normalization in `WebhookSecurityGuard`.
- **RT Connectivity**: Optimized Socket.io connection logs to differentiate between token-related failures and connectivity issues.
- **Data Integrity**: Verified 100% Prisma `select` coverage to ensure `passwordHash` is never leaked through any API response or the Leaderboard.
- **Robust Testing Suite**: Added a comprehensive set of unit tests covering the most critical security and mathematical logic.

---

## 🛠 Getting Started

### 1. Environment Configuration
Create a `.env` file from `.env.example` and ensure the following variables are set:

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# Security
CORS_ORIGIN=true  # Set to specific origin in production
WEBHOOK_SECRET=your-shared-secret-key
ALLOWED_WEBHOOK_IPS=127.0.0.1  # Comma-separated list

# Auth
JWT_ACCESS_SECRET=your-access-secret
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=24h
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
ENABLE_LOCAL_AUTH=true
```

### 📘 Swagger UI
Interactive API documentation is available at:
`http://localhost:3000/api`

### 🧪 Unit Testing
The project includes a robust suite of unit tests for critical security and business logic.

```bash
# Run all tests
npm run test

# Run tests in watch mode (Development)
npm run test:watch
```

Test coverage includes:
- **Auth Service**: Token reuse detection and account status blocking.
- **Users Service**: Role hierarchy (Rank-based) validation.
- **Webhook Guard**: IP normalization and HMAC signature verification.
- **Leaderboard**: Calculation accuracy and zero-case protection.

### 🏁 Core Endpoints
| Category | Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/auth/login` | None | Local login |
| **Auth** | `POST` | `/auth/google-sso` | None | Google SSO login |
| **Auth** | `POST` | `/auth/refresh` | Refresh Guard | Rotate tokens |
| **Auth** | `POST` | `/auth/logout` | JWT | Logout and clear RT |
| **System** | `GET` | `/` | None | System Health Check |
| **Cases** | `POST` | `/cases/webhook/salesforce` | API Key | Ingest Case & Create Initial Assignment |
| **Cases** | `POST` | `/cases/webhook/salesforce/close` | API Key | Close all OPEN assignments for a Case/Owner |
| **Cases** | `POST` | `/cases/webhook/gas-form` | API Key | Update Case ETA/Session from GAS Form |
| **Cases** | `POST` | `/cases/webhook/gas-validated` | API Key | Receive form validation details from GAS |
| **Cases** | `POST` | `/cases/webhook/gas-evaluation` | API Key | Receive quality & final check boolean scores from GAS |
| **Cases** | `GET` | `/cases` | JWT | Get cases with dynamic filters (`status`, `agentEmail`, `agentName`, `date`). Agents only see their own work. |
| **Cases** | `GET` | `/cases/:id` | JWT | Get case with full assignment history |
| **Cases** | `PATCH` | `/cases/assignments/:id` | JWT + RBAC | Manual Assignment Update (Admin/CMD Only) |
| **Users** | `GET` | `/users/me` | JWT | Get own profile |
| **Users** | `GET` | `/users/:id` | JWT + RBAC | Get specific user by ID |
| **Users** | `PATCH` | `/users/:id/status` | JWT + RBAC (Management Only) | Update role or isActive status |
| Leaderboard | GET | /leaderboard | JWT (Agents+) | Get performance metrics & percentages with dynamic filters (`name`, `email`, `leaderName`, `leaderId`) |

---

#### 🐳 Docker Deployment Guide (Production)

This project uses a multi-stage Docker build to ensure a lightweight and secure production image.

1.  **Build the Image**:
    ```bash
    docker build -t termhub-backend .
    ```

2.  **Prepare Production Environment**:
    Manually create a `.env` file on the server. **Do not copy your local .env**.
    Ensure `DATABASE_URL` points to the internal IP of the database server.

3.  **Run the Container**:
    ```bash
    docker run -d \
      --name termhub-api \
      -p 3000:3000 \
      --env-file .env \
      --restart always \
      termhub-backend
    ```

4.  **Database Synchronization**:
    The Docker build automatically runs `prisma generate`. To push schema changes to a fresh DB:
    ```bash
    docker exec -it termhub-api npx prisma db push
    ```

---

4. **Password Hashing Utility:**
   If you need to generate a hashed password for manual database entry:
   ```bash
   npx ts-node scripts/hash-password.ts "your_password_here"
   ```
### 👤 User Activity & Real-time Presence
TermHub monitors user activity in real-time using WebSockets:
- **`isOnline`**: Toggled via WebSocket connection/disconnection. 
- **Single Session Rule**: A user can only have **one active session**. If a user connects from a new device, the old session is automatically terminated with a `force_logout` event.
- **`isOnline` Database Sync**: The system updates the `User` table and logs every `CONNECTED`, `DISCONNECTED`, and `SESSION_OVERRIDDEN` event in `UserLog`.

### 📡 WebSocket Architecture
The system uses **Socket.io** with room-based isolation:
- **`user:{userId}`**: Agents join their own room to receive private case updates.
- **`management_dashboard`**: Supervisors and Admins receive all system-wide updates.
- **Security**: The gateway manually parses **HttpOnly cookies** during the handshake for secure JWT verification.

| Event | Payload | Description |
| :--- | :--- | :--- |
| `case_assigned` | `{ caseId, assignmentId, status, caseNumber }` | Broadcast to management and the assigned agent. |
| `eta_updated` | `{ caseId, assignmentId, etaMinutes, updatedAt }` | Broadcast when a case ETA is set via GAS. |
| `case_closed` | `{ caseId, caseNumber, closedCount }` | Broadcast when a case is closed via webhook. |
| `case_updated` | `{ caseId, assignmentId, ...changes }` | Broadcast when a case is manually updated by Admin. |
| `user_status_changed` | `{ userId, isOnline }` | Broadcast system-wide when a user connects/disconnects. |
| `force_logout` | `{ message }` | Sent to a socket when a newer session override occurs. |

---

## 🕒 Recent Updates & Fixes

### Phase 9 — Dynamic Leaderboard Filtering (April 3, 2026)
- **Advanced Filtering**: Enhanced the `GET /leaderboard` and `GET /cases` (History/Open) endpoints to support real-time filtering by `name`, `email`, `leaderName`, and `leaderId`.
- **Search Logic**: Implemented case-insensitive partial matching (ILIKE for DB, Prisma `contains` for ORM) for name and email searches, providing a more user-friendly search experience.
- **Deep Filtering**: Optimized `CasesService.findAll` to not only filter cases but also filter the nested assignments to ensure only relevant work history is returned for the searched agent.
- **Team-Specific Views**: Added the ability to fetch entire team leaderboards by searching for a leader's name or ID.

### Phase 8 — Live Leaderboard & Aggregation (April 2, 2026)
- **Leaderboard Module**: Created a highly efficient, standalone module (`GET /leaderboard`) powered by raw PostgreSQL queries ensuring zero performance degradation.
- **Dynamic Percentages**: Agents' success rates are derived dynamically in milliseconds calculating percentages metrics for `qualityScore` and `finalCheckScore` against monthly data. Users with 0 cases natively hidden.
- **Evaluation Webhook**: Added a new discrete entry point (`POST /cases/webhook/gas-evaluation`) explicitly structured to map delayed boolean outcomes directly back onto the most recent assignment for seamless correlation.

### Phase 7 — Webhook Extensions & Evaluation Metric Collection (April 2, 2026)
- **Database Expansion**: Added tracking columns (`receiveCount`, `lastClosedAt`) to `Case` and new validation dimensions (`items`, `choices`, `description`, `images`, `tmpAreas`, `isValid`, `isOnTime`) along with a dedicated `formSubmitTime` field to `Assignment`.
- **GAS Validated Webhook**: Added `POST /cases/webhook/gas-validated` endpoint to ingest precise validation and evaluation details for agent assignments dynamically. Included fallback matching ordering to prevent random row alterations.
- **Improved Field Segregation**: Directed the GAS Form Webhook payload into `formSubmitTime` and explicitly preserved `startTime` purely for Salesforce initialization.

### Phase 6 — Team Hierarchy & Schema Hardening (April 1, 2026)
- **Self-Referencing Team Structure**: Added `leaderId`, `leader`, and `team` fields to the `User` model, enabling a one-to-many hierarchical structure where each agent/supporter belongs to exactly one Team Leader.
- **Database Migration**: Applied Prisma migration `20260331230610_add_team_hierarchy` to introduce the `leader_id` column and FK constraint in PostgreSQL.

### Phase 5 — Production Polish & Security Suite (April 1, 2026)
- **Zero-Trust Webhooks**: Replaced basic API keys with robust HMAC SHA256 signature validation and strict IP allowlisting (`WebhookSecurityGuard`) backed by `trust proxy` configuration.
- **Tiered Rate Limiting**: Implemented a comprehensive throttling strategy:
    - **Auth**: 5 attempts / 3 mins (Anti-Brute Force).
    - **Global**: 120 reqs / min (Platform Stability).
    - **Webhooks**: 200 reqs / min (Sync Readiness).
- **Synchronous Reliability**: Refactored webhook processing to be synchronous and atomic, ensuring immediate consistency across Case and Assignment records.
- **Professional Logging**: Replaced default Nest logger with `winston` and `winston-daily-rotate-file`. Logs are neatly separated and kept for 30 days.
- **Global Monitoring**: Introduced a `LoggingInterceptor` to track all incoming HTTP traffic and latencies.

### Phase 4 — Integrated Webhook Workflow (March 30, 2026)
- **Advanced Real-time Security**: Implemented room-based isolation and manual cookie parsing for WebSockets.
- **Single-Session Enforcement**: In-memory tracking ensures agents only have one active session at a time.
- **Manual Data Control**: Replaced simple status updates with a full `PATCH /cases/assignments/:id` endpoint for `ADMIN`/`CMD` to correct any assignment field.
- **System Health Check**: Refactored the default route into a professional JSON health check.
- **Specialized Case Listings**: Added `GET /cases/my-open` and `GET /cases/all-open` for streamlined access to active work for agents and management.
- **New Salesforce Closure Webhook**: Added `POST /cases/webhook/salesforce/close` to allow remote session termination.
- **Independent Security**: Separated Salesforce and GAS security guards. Now uses `x-sf-api-key` and `x-gas-api-key` respectively.
- **Renamed GAS Webhook**: Changed `POST /cases/webhook/gas` to `POST /cases/webhook/gas-form` for better clarity.
- **Unified Assignment Creation**: Salesforce webhook now creates both the Case and the initial `OPEN` Assignment for the case owner.
- **Conditional GAS Updates**: GAS Form now updates an existing `OPEN` assignment (or a closed one without an ETA) instead of always creating a new record.
- **Unregistered Owner Support**: Made `userId` optional in Assignments and added `ownerEmail` to support case owners not yet registered in the system.
- **Standardized Timeflows**: All webhooks now use ISO 8601 for `startTime` and `formSubmitTime`.

### Phase 3 — Session-Based Case Architecture (March 29, 2026)
- **Dual Webhook Design**: Split the single `/cases/webhook` into two dedicated endpoints: `POST /cases/webhook/salesforce` and `POST /cases/webhook/gas`.
- **Assignment-Centric Status**: Moved `status` (OPEN/CLOSED), `caseType`, and `formType` from the `Case` table to the `Assignment` table.
- **Historical Tracking**: Every GAS form submission creates a **new** Assignment record — enabling complete per-agent audit trails.
- **Concurrent Agent Support**: Multiple agents can now hold independent, simultaneous `OPEN` assignments on the same case.
- **New `AssignmentStatus` Enum**: Replaced the old `CaseStatus` enum with `AssignmentStatus { OPEN, CLOSED }` to reflect the new session model.
- **Admin Control**: Added `PATCH /cases/assignments/:id/status` for `SUPERVISOR`/`CMD`/`ADMIN`/`SUPER_USER` to open or close any agent session.

### Phase 2 — Hierarchical User Management (March 29, 2026)
- **`CMD` Role Added**: Introduced an intermediary management role between `SUPERVISOR` and `LEADER`.
- **Rank-Filtered Visibility**: Implemented dynamic Prisma filtering in `UsersService.findAll` based on the requesting user's role.
- **Unified Status Management**: Added `PATCH /users/:id/status` with hierarchical validation to manage both roles and account activation.
- **Self-Modification Guard**: Prevented users from changing their own roles to ensure administrative integrity.
- **Account Approval Gate**: `NEW_USER` and `isActive: false` accounts are blocked from obtaining JWTs entirely.
