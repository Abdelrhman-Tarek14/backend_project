# TermHub: ETA Management System 🚀

TermHub is an enterprise-grade internal **ETA Management System** designed to improve tracking, visibility, and control over logistics and case handling processes. 

It solves "time blindness" for agents via live tracking and provides a centralized real-time dashboard for leadership to monitor at-risk cases.

## 🏗 System Architecture & Tech Stack

This project follows a **Modular Monolith** pattern with a **Containerized Micro-Services Architecture** for production.

- **Backend:** Node.js (NestJS v11.1.18) — REST API & WebSocket Server
- **Build System:** [SWC](https://swc.rs/) (Speedy Web Compiler) — ~20x faster than `tsc`
- **Database:** PostgreSQL v16
- **Cache/Queue:** Prisma v7 with Raw Performance Optimization
- **Reverse Proxy:** **Nginx (Alpine)** — Handles SSL Termination & Load Balancing
- **Containerization:** Docker & Docker Compose
- **Security:** HMAC SHA256 Signature Validation, Joi Env Validation, Rate Limiting
- **Documentation:** Swagger (OpenAPI 3.0)

---

## 🚀 Production Deployment (Docker + Nginx)

The project is pre-configured for a zero-downtime, secure production environment using a two-container model.

### 1. Prerequisites
- Docker & Docker Compose v2+
<!-- - SSL certificates (`fullchain.pem` and `privkey.pem`) -->

### 2. Configuration (`.env`)
Ensure your `.env` contains the production-specific variables:
```env
DOMAIN=your-production-domain.com
DATABASE_URL="postgresql://user:pass@remote-db-ip:5432/db"
SSL_CERT_FILE=/etc/letsencrypt/live/domain/fullchain.pem
SSL_KEY_FILE=/etc/letsencrypt/live/domain/privkey.pem
NODE_ENV=production
```

### 3. Start the Environment
```bash
docker-compose up -d --build
```
Nginx will automatically perform environment substitution on its configuration and proxy traffic to the NestJS app running on an internal network.

---

## 📋 Data Model & Architecture

### Case Workflow: Session-Based Model
The system uses a **two-table session model** that separates static case identity from dynamic agent work sessions.

#### 🗂 `Case` Table — Static Identity 
| Field | Source | Description |
| :--- | :--- | :--- |
| `caseNumber` | Salesforce | Unique identifier for the case. |
| `accountName` | Salesforce | Customer account name. |
| `country` | Salesforce | Country of the account. |
| `receiveCount` | Salesforce | Number of times the webhook created/updated the case. |
| `lastClosedAt` | Salesforce | Tracking timestamp for when the case was closed by webhook. |

#### 📋 `Assignment` Table — Dynamic Session
| Field | Source | Description |
| :--- | :--- | :--- |
| `status` | System / Admin | `OPEN` or `CLOSED` — tracks the agent's work session. |
| `caseType` | Salesforce | Type of case (e.g., "Menu Typing"). |
| `formType` | GAS (Form) | Form type as filled by the agent. |
| `formSubmitTime` | GAS (Form) | Exact time the GAS form was submitted. |
| `startTime` | Salesforce | When the agent started working on the case. |
| `etaMinutes` | GAS (Form) | Estimated time to completion in minutes. |
| `items`, `choices`, `description`, `images`, `tmpAreas`, `isValid`, `isOnTime` | GAS (Validated) | Evaluation metrics from the final GAS validation phase. |
| `userId` | GAS / SF | The registered agent assigned to the case (Optional). |
| `ownerEmail` | Salesforce | The email of the case owner from Salesforce. |

#### 🔢 `QueueRecord` Table — Server-side State
| Field | Source | Description |
| :--- | :--- | :--- |
| `assignmentId` | System | FK referencing the active `Assignment`. |
| `position` | System | The calculated rank (FIFO + Priority rules). |

#### 💓 `IntegrationStatus` Table — System Health
| Field | Source | Description |
| :--- | :--- | :--- |
| `system` | System | The name of the integrated system (e.g., `salesforce`). |
| `status` | System | The current status (e.g., `OK`). |

---

## 🛠 Internal Services

- **`CasesService`**: Handles core operations, manual updates, and unified case history fetching.
- **`CasesWebhookService`**: Manages all high-frequency external integrations (Salesforce & GAS).
- **`RealtimeGateway`**: Manages live WebSocket rooms (`user:{userId}` and `management_dashboard`).

### 🔐 Webhook Security (Zero-Trust)
- **IP Allowlisting**: Strictly filtered via `ALLOWED_WEBHOOK_IPS`.
- **HMAC SHA256 Signatures**: Payloads signed using `WEBHOOK_SECRET` and verified via `timingSafeEqual`.
- **Validation Layer**: `env.validation.ts` ensured via `Joi`.

---

## 🛣 API Endpoints Reference

| Category | Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- | :--- |
| **System** | `GET` | `/` | None | System Health Check |
| **System** | `GET` | `/csrf` | None | Get CSRF token |
| **Auth** | `POST` | `/auth/login` | CSRF | Local login |
| **Auth** | `POST` | `/auth/sso` | CSRF | Google SSO login |
| **Auth** | `POST` | `/auth/refresh` | Refresh Guard | Rotate tokens |
| **Auth** | `POST` | `/auth/logout` | JWT | Logout |
| **Cases** | `POST` | `/cases/webhook/salesforce` | HMAC | Ingest Case & Create Initial Assignment |
| **Cases** | `POST` | `/cases/webhook/salesforce/close` | HMAC | Close all OPEN assignments |
| **Cases** | `POST` | `/cases/webhook/gas-form` | HMAC | Update Case ETA/Session from GAS Form |
| **Cases** | `POST` | `/cases/webhook/gas-validated` | HMAC | Receive validation details from GAS |
| **Cases** | `POST` | `/cases/webhook/gas-evaluation` | HMAC | Receive quality & final check scores |
| **Cases** | `POST` | `/cases/webhook/salesforce/heartbeat` | HMAC | Salesforce Heartbeat |
| **Cases** | `GET` | `/cases/system/status` | JWT | System Connectivity Status |
| **Cases** | `GET` | `/cases` | JWT | Get cases with dynamic filters |
| **Cases** | `GET` | `/cases/:id` | JWT | Get case with full history |
| **Cases** | `PATCH` | `/cases/assignments/:id` | JWT + RBAC | Manual Assignment Update |
| **Users** | `GET` | `/users/me` | JWT | Get own profile |
| **Users** | `GET` | `/users` | JWT + RBAC | List users |
| **Users** | `PATCH` | `/users/:id/status` | JWT + RBAC | Update role or isActive status |
| **Leaderboard**| `GET` | `/leaderboard` | JWT | Get team performance metrics |

---

## 🛠 Security & Hashing Utilities

The project includes a utility script in `scripts/security.ts` for generating secrets and hashing passwords manually.

| Action | Command |
| :--- | :--- |
| **Generate JWT Secret** | `npx tsx scripts/security.ts jwt` |
| **Hash a Password** | `npm run security hash "your_password"` |

---

## 🧪 Webhook Simulator (Mocking)

You can simulate incoming webhooks from Salesforce and GAS to test the system's end-to-end flow.

| Action | Command |
| :--- | :--- |
| **Simulate SF Case Create** | `npm run mock sf-create 12345678 agent@test.com` |
| **Simulate SF Case Close** | `npm run mock sf-close 12345678 agent@test.com` |
| **Simulate GAS ETA Form** | `npm run mock gas-form 12345678 agent@test.com` |
| **Simulate GAS Validation** | `npm run mock gas-validated 12345678 agent@test.com` |
| **Simulate GAS Evaluation** | `npm run mock gas-evaluation 12345678 agent@test.com` |

---

## 👥 Team Hierarchy (RBAC)
- **Role Ranks**: `SUPER_USER: 100`, `ADMIN: 80`, `SUPERVISOR: 60`, `CMD: 40`, `LEADER: 20`, `AGENT: 10`.
- **Management Guard**: Users only manage accounts with a lower rank than their own.
- **Team-Self-Referencing**: Agents are linked to Leaders via `leaderId`.

---

## 🧪 Development Setup

1. **Install**: `npm install`
2. **Setup DB**: `npx prisma migrate dev`
3. **Local Dev**: `npm run start:dev`
4. **Build Check**: `npm run build`

---

<details>
<summary>📜 Historical Development Log (Phases 1-12)</summary>

### Phase 12 — Production Hardening (April 5, 2026)
- **Nginx Integration**: Reverse proxy with SSL termination and `envsubst`.
- **Docker Optimization**: Multi-stage build with non-root user.
- **Service Splitting**: Extracted `CasesWebhookService`.
- **Type Safety**: Cleaned up `any` types and removed unused imports.
- **Strict Env Validation**: Joi validation schema implemented.

*(Older phases preserved below...)*
</details>
