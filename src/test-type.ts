import { User } from '@prisma/client';

const testUser: User = {
  id: '1',
  email: 'test@example.com',
  name: 'Test',
  passwordHash: 'hash',
  googleId: 'google-id',
  role: 'AGENT',
  isActive: true,
  hashedRefreshToken: 'token-hash',
  isOnline: true,
  lastActive: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

console.log('User type verified successfully!');
