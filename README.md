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
- **IP Allowlisting**: Requests are strictly filtered by IP via `ALLOWED_WEBHOOK_IPS`.
- **HMAC SHA256 Signatures**: Payloads must be signed using `WEBHOOK_SECRET`. The guard computes the hash of the raw request payload to ensure data integrity and authenticity.
- **Asynchronous Processing (BullMQ)**: Webhooks instantly return a `202 Accepted` status to prevent timeouts. The heavy processing is seamlessly offloaded to a Redis-backed background queue (`webhook-processing-queue`) with automatic exponential backoff retries.

### 🛑 Security & Rate Limiting
- **Throttling**: The global application is protected against brute-force attacks via `@nestjs/throttler` (e.g., max 5 requests per 3 minutes for Auth). Webhooks are exempt from this limit due to their intrinsic Zero-Trust signature requirements and high-volume nature.

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
| `createdAt` | System | Auto-generated creation timestamp. |

#### 📋 `Assignment` Table — Dynamic Session
Each time an agent submits the ETA form via **GAS**, a **new Assignment record** is created under the same case. This enables full historical tracking and concurrent multi-agent support.

| Field | Source | Description |
| :--- | :--- | :--- |
| `status` | System / Admin | `OPEN` or `CLOSED` — tracks the agent's work session. |
| `caseType` | Salesforce | Type of case (e.g., "Menu Typing"). Can change per session. |
| `formType` | GAS | Form type as filled by the agent. |
| `startTime` | GAS | When the agent started working on the case. |
| `etaMinutes` | GAS | Estimated time to completion in minutes. |
| `userId` | GAS / SF | The registered agent assigned to the case (Optional). |
| `ownerEmail` | Salesforce | The email of the case owner from Salesforce. |

> [!NOTE]
> **Historical Tracking**: Every GAS form submission creates a **new** Assignment record. If an agent re-opens a closed case, a fresh Assignment is created — preserving the full audit history.

> [!NOTE]
> **Concurrent Assignments**: Multiple agents can have `OPEN` assignments on the same case simultaneously. Each has an independent `status`, `formType`, and `etaMinutes`.

---

### 🚦 Hierarchical Visibility & Permissions (RBAC)
The system implements a strict hierarchical visibility model for its users:
- **`SUPER_USER` / `ADMIN`**: Complete visibility of all users. Can perform any role updates (with `ADMIN` restricted from modifying `SUPER_USER`).
- **`SUPERVISOR`**: Can see and manage all users except `ADMIN` and `SUPER_USER`. Can promote/demote users between `NEW_USER` and `SUPERVISOR`.
- **`CMD` / `LEADER`**: Can only see the status of `AGENT`, `LEADER`, and `CMD` roles. No management permissions.
- **`AGENT` / `SUPPORT` / `NEW_USER`**: No access to the user list. Restricted from viewing any other user's status.

> [!CAUTION]
> **Self-Modification Prohibited**: No user, regardless of role, can change their own role. Administrative actions must be performed by a different user with sufficient permissions.

---

## 🌐 API Documentation

### 📘 Swagger UI
Interactive API documentation is available at:
`http://localhost:3000/api`

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
| **Cases** | `GET` | `/cases/my-open` | JWT | Get OPEN assignments for current user |
| **Cases** | `GET` | `/cases/my-history` | JWT | Get CLOSED assignments for current user |
| **Cases** | `GET` | `/cases/all-open` | JWT + Roles | Get all system-wide OPEN assignments |
| **Cases** | `GET` | `/cases/all-history` | JWT + Roles | Get all system-wide CLOSED assignments |
| **Cases** | `GET` | `/cases/:id` | JWT | Get case with full assignment history |
| **Cases** | `PATCH` | `/cases/assignments/:id` | JWT + RBAC | Manual Assignment Update (Admin/CMD Only) |
| **Users** | `GET` | `/users/me` | JWT | Get own profile |
| **Users** | `GET` | `/users` | JWT + RBAC (Rank-Filtered) | List users by visibility rules |
| **Users** | `PATCH` | `/users/:id/status` | JWT + RBAC (Management Only) | Update role or isActive status |

---

## 🛠 Setup Instructions

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Setup Environment:**
   Create a `.env` file with the following:
   - `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`, `GAS_WEBHOOK_SECRET`.

3. **Database Synchronization:**
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

### Phase 5 — Production Polish & Zero-Trust Webhooks (March 31, 2026)
- **Zero-Trust Webhooks**: Replaced basic API keys with robust HMAC SHA256 signature validation and strict IP allowlisting (`WebhookSecurityGuard`).
- **Asynchronous Queues**: Integrated `BullMQ` and Redis to decouple webhook reception from processing. Webhooks now return `202 Accepted` instantly, preventing Salesforce/GAS timeouts during bulk updates.
- **Professional Logging**: Replaced default Nest logger with `winston` and `winston-daily-rotate-file`. Logs are neatly separated and kept for 30 days.
- **Global Monitoring**: Introduced a `LoggingInterceptor` to track all incoming HTTP traffic and latencies.
- **Brute-Force Protection**: Added structural rate limiting (`ThrottlerModule`) capping authentication endpoints at 5 attempts per 3 minutes.

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
