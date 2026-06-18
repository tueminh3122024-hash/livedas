const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54342/postgres'
  });

  try {
    console.log('Connecting to database to apply migration 010...');
    const client = await pool.connect();
    
    try {
      const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260615000010_logistic_tracking.sql');
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      
      console.log('Applying SQL migration...');
      await client.query(sqlContent);
      console.log('Migration applied successfully!');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

run();
