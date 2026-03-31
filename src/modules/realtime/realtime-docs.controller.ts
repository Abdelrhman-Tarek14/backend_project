import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('🔌 Realtime (WebSockets)')
@Controller('realtime-docs')
export class RealtimeDocsController {
  
  @Get('info')
  @ApiOperation({
    summary: '📖 WebSocket Connection & Events Guide',
    description: `
### 🔗 Connection Details
- **Protocol:** Socket.io
- **URL:** \`ws://localhost:3000\` (or your production domain)
- **Authentication:** The server automatically extracts the \`access_token\` from **HttpOnly Cookies**. No manual headers are required.

---

### 🚪 Room Management (Auto-Join)
Upon successful connection, the server automatically assigns you to specific rooms based on your role and ID:
- **Agents:** Join \`user:{userId}\`.
- **Management (Admin/Leader/etc):** Join \`management_dashboard\` in addition to their private user room.

---

### 📥 Event Catalog (Listen For)

The frontend should implement \`socket.on('event_name', callback)\` for the following:

| Event Name | Trigger Context | Payload Example |
| :--- | :--- | :--- |
| \`case_assigned\` | New assignment distributed to agent | \`{ caseId, assignmentId, status, caseNumber }\` |
| \`eta_updated\` | Update received from GAS Form | \`{ assignmentId, etaMinutes, updatedAt }\` |
| \`case_closed\` | Case resolved via Salesforce | \`{ caseId, caseNumber, closedCount }\` |
| \`case_updated\` | Manual administrative data correction | \`{ caseId, assignmentId, ...changes }\` |
| \`user_status_changed\` | A user connects or disconnects | \`{ userId, isOnline: boolean }\` |
| \`force_logout\` | **Security:** Session override detected | \`{ message: 'SESSION_OVERRIDDEN' }\` |

---

### ⚠️ Handling Session Overrides (\`force_logout\`)
If the frontend receives this event, it must:
1. Display an alert: "This account has been opened in another window."
2. Redirect the user to the Login page and clear any local state.
    `,
  })
  @ApiResponse({ status: 200, description: 'Documentation only' })
  getWebsocketDocs() {
    return 'This endpoint is for Swagger documentation purposes only.';
  }
}
