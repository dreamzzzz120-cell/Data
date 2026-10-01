import pg from "pg";
import { readFile } from "node:fs/promises";
import { config } from "./config.js";
if(!config.ADMIN_DATABASE_URL) throw new Error("ADMIN_DATABASE_URL required");
const c=new pg.Client({connectionString:config.ADMIN_DATABASE_URL});
await c.connect();
try{await c.query(await readFile(new URL("../migrations/001_init.sql",import.meta.url),"utf8"));console.log("migration complete")}finally{await c.end()}
