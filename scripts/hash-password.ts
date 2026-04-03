import * as bcrypt from 'bcrypt';

async function generateHash() {
  const password = process.argv[2];

  if (!password) {
    console.error('Usage: npx ts-node scripts/hash-password.ts <password>');
    process.exit(1);
  }

  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);

  console.log('\n----------------------------------------');
  console.log('Plain Password:', password);
  console.log('Hashed Password:', hash);
  console.log('----------------------------------------\n');
}

generateHash();
