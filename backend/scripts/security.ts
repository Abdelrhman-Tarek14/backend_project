import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

async function run() {
  const action = process.argv[2]; // action (hash or jwt)
  const value = process.argv[3];  // value (password in case of hash)

  if (action === 'jwt') {
    // generate jwt secret
    const secret = crypto.randomBytes(64).toString('hex');
    console.log('\n🚀 New JWT Secret Generated:');
    console.log(secret);
    console.log('\n(Copy this to your .env file)\n');
  } 
  
  else if (action === 'hash') {
    // hash a password
    if (!value) {
      console.error('❌ Error: Please provide a password. Example: npx tsx scripts/security.ts hash "your_password"');
      return;
    }
    const hash = await bcrypt.hash(value, 10);
    console.log('\n🔑 Password Hashed:');
    console.log(hash);
    console.log('\n(Save this in your Database)\n');
  } 
  
  else {
    // if the script is run incorrectly
    console.log('\n🛠️  Security Utility Help:');
    console.log('1. To generate JWT Secret:  npx tsx scripts/security.ts jwt');
    console.log('2. To hash a password:     npx tsx scripts/security.ts hash "your_password"\n');
  }
}

run();