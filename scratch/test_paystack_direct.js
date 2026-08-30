const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
let secretKey = '';
envContent.split('\n').forEach(line => {
  if (line.startsWith('PAYSTACK_SECRET_KEY=')) {
    secretKey = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
  }
});

async function testPaystackTestBank() {
  const testCases = [
    { acc: "0001234567", code: "001" },
    { acc: "0123456789", code: "001" },
    { acc: "0000000001", code: "001" },
    { acc: "1234567890", code: "001" },
    { acc: "0580000001", code: "001" },
  ];

  for (const tc of testCases) {
    console.log(`\n--- Testing Resolve: Acc=${tc.acc}, Code=${tc.code} ---`);
    try {
      const res = await fetch(`https://api.paystack.co/bank/resolve?account_number=${tc.acc}&bank_code=${tc.code}`, {
        headers: { Authorization: `Bearer ${secretKey}` }
      });
      console.log("HTTP Status:", res.status);
      const data = await res.json();
      console.log("Paystack Response Body:", JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Resolve error:", err);
    }
  }
}

testPaystackTestBank();
