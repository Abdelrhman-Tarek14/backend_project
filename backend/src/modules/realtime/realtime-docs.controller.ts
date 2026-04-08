import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('🔌 Realtime (WebSockets)')
@Controller('realtime-docs')
export class RealtimeDocsController {

  @Get('info')
  @ApiOperation({
    summary: '📖 WebSocket Connection & Events Guide',
    description: `
## 🔗 Connection Details

| Property | Value |
| :--- | :--- |
| **Protocol** | Socket.io |
| **Dev URL** | \`ws://localhost:3000\` |
| **Prod URL** | Your production domain |
| **Auth Method** | Auto-extracted \`access_token\` from HttpOnly Cookie |

> ⚠️ No manual headers or tokens are needed. Just connect — the server handles authentication automatically.

---

## 🚪 Room Assignment (Auto-Join)

Upon successful connection, the server assigns rooms based on your role:

| Role | Rooms Joined |
| :--- | :--- |
| \`AGENT\` | \`user:{userId}\` |
| \`LEADER\`, \`CMD\`, \`SUPERVISOR\`, \`ADMIN\`, \`SUPER_USER\`, \`SUPPORT\` | \`user:{userId}\` + \`management_dashboard\` |

---

## 📥 Events — Listen For

\`\`\`js
socket.on('event_name', (payload) => { ... })
\`\`\`

| Event | Trigger | Payload |
| :--- | :--- | :--- |
| \`case_assigned\` | New assignment distributed to agent | \`{ caseId, assignmentId, status, caseNumber }\` |
| \`eta_updated\` | ETA update received from GAS Form | \`{ assignmentId, etaMinutes, updatedAt }\` |
| \`case_closed\` | Case resolved via Salesforce webhook | \`{ caseId, caseNumber, closedCount }\` |
| \`case_updated\` | Manual admin data correction | \`{ caseId, assignmentId, ...changes }\` |
| \`user_status_changed\` | A user connects or disconnects | \`{ userId, isOnline: boolean }\` |
| \`force_logout\` | Account deactivated or session overridden | \`{ message: string }\` |

---

## ⚠️ Handling \`force_logout\`

This event is fired in **two scenarios**:

**1. Session Override** — Same account opened in another window/tab:
\`\`\`js
socket.on('force_logout', ({ message }) => {
  alert('This account has been opened in another window.');
  // Clear local state and redirect to login
  window.location.href = '/login';
});
\`\`\`

**2. Account Deactivated** — Admin deactivated the account:
\`\`\`js
socket.on('force_logout', ({ message }) => {
  alert(message); // 'Your account has been deactivated by an administrator.'
  window.location.href = '/login';
});
\`\`\`

---

## 🏓 Ping / Pong (Heartbeat)

\`\`\`js
socket.emit('ping');
socket.on('pong', ({ timestamp }) => {
  console.log('Server alive at:', timestamp);
});
\`\`\`
    `,
  })
  @ApiResponse({ status: 200, description: 'Documentation only — no data returned.' })
  getWebsocketDocs() {
    return 'This endpoint is for Swagger documentation purposes only.';
  }
}