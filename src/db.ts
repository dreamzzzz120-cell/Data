import pg from "pg";
import { config } from "./config.js";
export const pool=new pg.Pool({connectionString:config.DATABASE_URL,max:20,idleTimeoutMillis:10_000,connectionTimeoutMillis:5_000});
export async function tenantTx<T>(tenantId:string,fn:(c:pg.PoolClient)=>Promise<T>):Promise<T>{
 const c=await pool.connect();
 try{
  await c.query("BEGIN");
  await c.query("SET LOCAL statement_timeout='10s'");
  await c.query("SET LOCAL idle_in_transaction_session_timeout='15s'");
  await c.query("SELECT set_config('app.tenant_id',$1,true)",[tenantId]);
  const out=await fn(c);
  await c.query("COMMIT"); return out;
 }catch(e){await c.query("ROLLBACK");throw e}finally{c.release()}
}
