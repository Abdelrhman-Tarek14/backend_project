import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst();
    console.log('Sample user:', user);
    
    // Check if displayName is in the keys
    if (user) {
      console.log('Keys in user object:', Object.keys(user));
    }
  } catch (err) {
    console.error('Error fetching user:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
