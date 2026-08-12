const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '../artifacts/api-server/.env');
if (!fs.existsSync(envPath)) {
  console.log('No .env found at', envPath);
} else {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  });
}

async function run() {
  const apiKey = process.env.COOLIFY_API_KEY;
  const baseUrl = process.env.COOLIFY_API_URL || 'https://coolify.mution.tech/api/v1';

  console.log('API Key length:', apiKey ? apiKey.length : 0);

  const res = await fetch(`${baseUrl}/applications`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  
  if (!res.ok) {
    console.error('Failed to get apps:', res.status, await res.text());
    return;
  }
  
  const apps = await res.json();
  if (apps.length === 0) {
    console.log('No applications found.');
    return;
  }
  
  const app = apps[0];
  console.log(`Testing logs for app: ${app.name} (${app.uuid})`);
  
  const logRes = await fetch(`${baseUrl}/applications/${app.uuid}/logs`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  
  console.log('Log response status:', logRes.status, logRes.headers.get('content-type'));
  const logText = await logRes.text();
  console.log('Log preview:', logText.substring(0, 200));
}

run().catch(console.error);
