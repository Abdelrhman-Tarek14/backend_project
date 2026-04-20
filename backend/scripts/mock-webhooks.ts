import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import { SalesforceWebhookDto } from '../src/modules/cases/dto/salesforce-webhook.dto';
import { SheetFormDto } from '../src/modules/cases/dto/sheet-form.dto';
import { CloseCaseWebhookDto } from '../src/modules/cases/dto/close-case-webhook.dto';
import { GasValidatedWebhookDto } from '../src/modules/cases/dto/gas-validated-webhook.dto';
import { GasEvaluationWebhookDto } from '../src/modules/cases/dto/gas-evaluation-webhook.dto';

dotenv.config();

const GAS_SECRET = process.env.GAS_WEBHOOK_SECRET || 'gas-fallback';
const SF_SECRET = process.env.SALESFORCE_WEBHOOK_SECRET || 'sf-fallback';
const BASE_URL = `http://localhost:${process.env.PORT || 3000}/cases/webhook`;

async function signAndSend(path: string, payload: any) {
  const secret = path.includes('salesforce') ? SF_SECRET : GAS_SECRET;
  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  console.log(`\n🚀 Sending Webhook to: ${BASE_URL}${path}`);
  console.log(`📦 Payload: ${body}`);
  console.log(`🔐 Signature: ${signature}`);

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-signature': signature,
    },
    body,
  });

  const data = await response.json();
  console.log(`\n✅ Response [${response.status}]:`, data);
}

const action = process.argv[2];
const caseNumber = process.argv[3] || '99998888';
const caseOwner = process.argv[4] || 'testagent@example.com';

async function main() {
  switch (action) {
    case 'sf-create':
      const sfPayload: SalesforceWebhookDto = {
        caseNumber,
        caseAccountName: 'Mock Account Corp',
        caseCountry: 'USA',
        caseType: 'Menu Typing',
        caseOwner,
        caseStartTime: new Date().toISOString(),
      };
      await signAndSend('/salesforce', sfPayload);
      break;

    case 'sf-close':
      const closePayload: CloseCaseWebhookDto = {
        caseNumber,
        caseOwner,
      };
      await signAndSend('/salesforce/close', closePayload);
      break;

    case 'gas-form':
      const sheetPayload: SheetFormDto = {
        caseNumber,
        caseOwner,
        formType: 'TypeA',
        eta: 45,
        formSubmitTime: new Date().toISOString(),
        items: 5,
        choices: 2,
        description: 1,
        images: 1,
        tmpAreas: 1,
        formValidation: 'Valid',
      };
      await signAndSend('/sheet-open-cases', sheetPayload);
      break;

    case 'gas-validated':
      const validatedPayload: GasValidatedWebhookDto = {
        caseNumber,
        caseOwner,
        formType: 'TypeA',
        formSubmitTime: new Date().toISOString(),
        items: 10,
        choices: 5,
        description: 2,
        images: 3,
        tmpAreas: 1,
        formValidation: 'valid',
        isOnTime: true,
      };
      await signAndSend('/gas-validated', validatedPayload);
      break;

    case 'gas-evaluation':
      const evaluationPayload: GasEvaluationWebhookDto = {
        caseNumber,
        caseOwner,
        evaluationTime: new Date().toISOString(),
        qualityScore: true,
        finalCheckScore: true,
      };
      await signAndSend('/gas-evaluation', evaluationPayload);
      break;

    case 'sf-heartbeat':
      await signAndSend('/salesforce/heartbeat', {});
      break;

    default:
      console.log('\n🛠️  Webhook Simulator Usage:');
      console.log('npx tsx scripts/mock-webhooks.ts <action> [caseNumber] [caseOwner]');
      console.log('\nAvailable Actions:');
      console.log('- sf-create      : Simulate Salesforce case creation');
      console.log('- sf-close       : Simulate Salesforce case closure');
      console.log('- sf-heartbeat   : Simulate Salesforce heartbeat');
      console.log('- gas-form       : Simulate Sheet Form (Unified) submission');
      console.log('- gas-validated  : Simulate GAS Form Validation (Metrics)');
      console.log('- gas-evaluation : Simulate GAS Final Evaluation');
      console.log('\nExample:');
      console.log('npx tsx scripts/mock-webhooks.ts sf-create 12345678 agent@test.com');
  }
}

main().catch(err => console.error('❌ Error:', err.message));
