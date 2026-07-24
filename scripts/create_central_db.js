const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbHost = "dpg-d9b3k3gjs32c73al5340-a.singapore-postgres.render.com";
const user = "conquerglobal";
const password = "PoY9u2PDmypawrVeHXkoyBcF7YmFP4Ds";

async function main() {
  // 1. Connect to default postgres / conquer_global_db database to issue CREATE DATABASE
  const adminClient = new Client({
    host: dbHost,
    port: 5432,
    user,
    password,
    database: "conquer_global_db",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await adminClient.connect();
    console.log("Connected to PostgreSQL server.");

    // Check if database already exists
    const checkDb = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = 'central_database';");
    if (checkDb.rows.length === 0) {
      console.log("Creating database 'central_database'...");
      await adminClient.query('CREATE DATABASE "central_database";');
      console.log("Database 'central_database' created successfully!");
    } else {
      console.log("Database 'central_database' already exists.");
    }
  } catch (err) {
    console.error("Error creating database:", err.message);
  } finally {
    await adminClient.end();
  }

  // 2. Connect to the new 'central_database' and execute the SQL file
  console.log("Connecting to 'central_database' to apply schema...");
  const targetClient = new Client({
    host: dbHost,
    port: 5432,
    user,
    password,
    database: "central_database",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await targetClient.connect();
    console.log("Connected to 'central_database'. Reading SQL file...");

    const sqlFilePath = path.join(__dirname, '..', 'deepseek_sql_20260724_9adca3.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log("Executing SQL script on 'central_database'...");
    await targetClient.query(sqlContent);
    console.log("SQL script executed successfully on 'central_database'!");
  } catch (err) {
    console.error("Error executing SQL script on target database:", err.message);
  } finally {
    await targetClient.end();
  }
}

main();
