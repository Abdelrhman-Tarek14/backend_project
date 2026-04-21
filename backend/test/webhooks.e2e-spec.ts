import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

describe('WebhooksController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let secret: string;

  const testCaseNumber = 'CASE-E2E-999';
  const testOwner = 'e2e-agent@example.com';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    await app.init();

    prisma = app.get(PrismaService);
    const config = app.get(ConfigService);
    secret = config.get<string>('webhookSecret') || 'unified-super-secure-webhook-secret-key';

    // Teardown previous if existing
    const prevCase = await prisma.case.findUnique({ where: { caseNumber: testCaseNumber } });
    if (prevCase) {
      const assignments = await prisma.assignment.findMany({ where: { caseId: prevCase.id } });
      const assignmentIds = assignments.map(a => a.id);
      await prisma.caseLog.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
      await prisma.assignment.deleteMany({ where: { caseId: prevCase.id } });
      await prisma.case.delete({ where: { id: prevCase.id } });
    }
    await prisma.user.deleteMany({ where: { email: testOwner } });

    // Seed User for case
    await prisma.user.create({
      data: {
        email: testOwner,
        name: 'E2E Webhook Agent',
        role: 'AGENT',
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    const prevCase = await prisma.case.findUnique({ where: { caseNumber: testCaseNumber } });
    if (prevCase) {
      const assignments = await prisma.assignment.findMany({ where: { caseId: prevCase.id } });
      const assignmentIds = assignments.map(a => a.id);
      await prisma.caseLog.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
      await prisma.assignment.deleteMany({ where: { caseId: prevCase.id } });
      await prisma.case.delete({ where: { id: prevCase.id } });
    }
    await prisma.user.deleteMany({ where: { email: testOwner } });
    await app.close();
  });

  const sign = (payload: any) => {
    const rawBody = Buffer.from(JSON.stringify(payload));
    return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  };

  it('/cases/webhook/salesforce (POST) - Create Case', async () => {
    const payload = {
      caseNumber: testCaseNumber,
      caseAccountName: 'Acme E2E',
      caseCountry: 'US',
      caseType: 'Menu Typing',
      caseOwner: testOwner,
    };

    await request(app.getHttpServer())
      .post('/cases/webhook/salesforce')
      .set('x-webhook-signature', sign(payload))
      .send(payload)
      .expect(202);

    // Verify DB
    const createdCase = await prisma.case.findUnique({ where: { caseNumber: testCaseNumber } });
    expect(createdCase).toBeDefined();

    const assignment = await prisma.assignment.findFirst({ where: { caseId: createdCase!.id } });
    expect(assignment!.status).toBe('OPEN');
    expect(assignment!.caseType).toBe('Menu Typing');
  });

  it('/cases/webhook/sheet-form (POST) - Update ETA', async () => {
    const payload = {
      caseNumber: testCaseNumber,
      caseOwner: testOwner,
      formType: 'Manual',
      caseETA: 15,
      formSubmitTime: new Date().toISOString(),
    };

    await request(app.getHttpServer())
      .post('/cases/webhook/sheet-form')
      .set('x-webhook-signature', sign(payload))
      .send(payload)
      .expect(202);

    // Verify DB
    const caseRec = await prisma.case.findUnique({ where: { caseNumber: testCaseNumber } });
    const assignment = await prisma.assignment.findFirst({
      where: { caseId: caseRec!.id },
      orderBy: { startTime: 'desc' },
    });

    expect(assignment!.etaMinutes).toBe(15);
    expect(assignment!.formType).toBe('Manual');
  });

  it('/cases/webhook/salesforce/close (POST) - Close Case', async () => {
    const payload = {
      caseNumber: testCaseNumber,
      caseOwner: testOwner,
    };

    await request(app.getHttpServer())
      .post('/cases/webhook/salesforce/close')
      .set('x-webhook-signature', sign(payload))
      .send(payload)
      .expect(202);

    // Verify DB
    const caseRec = await prisma.case.findUnique({ where: { caseNumber: testCaseNumber } });
    const assignment = await prisma.assignment.findFirst({
      where: { caseId: caseRec!.id },
      orderBy: { startTime: 'desc' },
    });

    expect(assignment!.status).toBe('CLOSED');
  });

  describe('Heartbeat Webhook (e2e)', () => {
    it('/cases/webhook/salesforce/heartbeat (POST) - should block without signature', () => {
      return request(app.getHttpServer())
        .post('/cases/webhook/salesforce/heartbeat')
        .send({})
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Missing signature');
        });
    });

    it('/cases/system/status (GET) - should block without JWT token', () => {
      return request(app.getHttpServer())
        .get('/cases/system/status')
        .expect(401);
    });
  });
});
