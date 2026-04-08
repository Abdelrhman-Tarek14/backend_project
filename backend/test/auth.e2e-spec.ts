import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import { Role } from '@prisma/client';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let csrfToken: string;
  let csrfCookie: string;

  const testUser = {
    email: 'test_e2e_user@example.com',
    password: 'Password123!',
    name: 'E2E Test User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.use(cookieParser());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Clean up if already exists — must delete child records first
    const existingUsers = await prisma.user.findMany({ where: { email: testUser.email } });
    for (const u of existingUsers) {
      await prisma.userLog.deleteMany({ where: { userId: u.id } });
      await prisma.caseLog.deleteMany({ where: { userId: u.id } });
    }
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });

    // Seed mock user
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await prisma.user.create({
      data: {
        email: testUser.email,
        passwordHash: hashedPassword,
        name: testUser.name,
        role: Role.AGENT,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    // Teardown — delete child records before user
    const users = await prisma.user.findMany({ where: { email: testUser.email } });
    for (const u of users) {
      await prisma.userLog.deleteMany({ where: { userId: u.id } });
      await prisma.caseLog.deleteMany({ where: { userId: u.id } });
    }
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
    await app.close();
  });

  it('/csrf (GET) - should generate CSRF token', async () => {
    const response = await request(app.getHttpServer())
      .get('/csrf')
      .expect(200);

    expect(response.body.csrfToken).toBeDefined();
    csrfToken = response.body.csrfToken;
    
    // Extract __Host-csrf cookie
    const cookies = response.headers['set-cookie'] as unknown as string[];
    const hostCsrfCookie = cookies.find((c: string) => c.startsWith('__Host-csrf='));
    expect(hostCsrfCookie).toBeDefined();
    csrfCookie = hostCsrfCookie!.split(';')[0];
  });

  it('/auth/login (POST) - should reject invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({ email: testUser.email, password: 'wrongpassword' })
      .expect(401);
  });

  it('/auth/login (POST) - should authenticate valid user and return set-cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);

    expect(response.body.message).toBe('Successfully authenticated');
    
    // Verify Access and Refresh cookies are set
    const cookies = response.headers['set-cookie'] as unknown as string[];
    const accessCookieStr = cookies.find((c: string) => c.startsWith('access_token='));
    const refreshCookieStr = cookies.find((c: string) => c.startsWith('refresh_token='));
    
    expect(accessCookieStr).toBeDefined();
    expect(refreshCookieStr).toBeDefined();
  });
});
