import * as bcrypt from 'bcrypt';

async function hashPassword() {
  const password = process.argv[2];
  if (!password) {
    console.error('Please provide a password as an argument: npx ts-node scripts/hash-password.ts "your_password"');
    process.exit(1);
  }

  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);

  console.log('\n--- HASHED PASSWORD ---');
  console.log('Plain Password:', password);
  console.log('Hashed Password:', hash);
  console.log('-----------------------\n');
}

hashPassword();
