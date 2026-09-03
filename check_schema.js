const fs = require('fs');
const dotenv = require('dotenv');
const https = require('https');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const url = `${supabaseUrl}/rest/v1/`;

https.get(url, {
  headers: {
    'apikey': supabaseAnonKey
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const spec = JSON.parse(data);
    console.log("Root keys:", Object.keys(spec));
    if (spec.components && spec.components.schemas) {
      console.log("Schemas:", Object.keys(spec.components.schemas));
      if (spec.components.schemas.laptop_tests) {
        console.log("Properties:", spec.components.schemas.laptop_tests.properties.SlowCharging);
      }
    }
  });
}).on('error', (e) => {
  console.error(e);
});
