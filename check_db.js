const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkType() {
  const { data, error } = await supabase.from('laptop_tests').select('SlowCharging').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Data:', data);
    if (data && data.length > 0) {
      console.log('Type of SlowCharging is:', typeof data[0].SlowCharging);
    } else {
      console.log('No rows found, cannot determine type.');
    }
  }
}
checkType();
