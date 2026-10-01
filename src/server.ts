import Fastify from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";
import { dirname,join } from "node:path";
import { z } from "zod";
import { config } from "./config.js";
import { pool,tenantTx } from "./db.js";
import { verifyEnvelope } from "./security.js";
import { appendEvent } from "./ledger.js";
const app=Fastify({logger:{redact:["req.headers.authorization","req.headers.cookie"]},bodyLimit:1_048_576,requestTimeout:15_000});
await app.register(helmet,{contentSecurityPolicy:true});
await app.register(rateLimit,{max:120,timeWindow:"1 minute"});
const here=dirname(fileURLToPath(import.meta.url));
await app.register(fastifyStatic,{root:join(here,"../public"),prefix:"/"});
app.get("/health",async()=>({ok:true}));
app.get("/ready",async(_req,reply)=>{try{await pool.query("SELECT 1");return {ready:true}}catch{return reply.code(503).send({ready:false})}});
const eventSchema=z.object({streamId:z.string().min(1).max(200),eventType:z.string().min(1).max(120),producerEventId:z.string().min(1).max(200),occurredAt:z.iso.datetime(),payload:z.unknown(),correctionOf:z.uuid().optional()}).strict();
async function principal(req:any,reply:any){
 const h=req.headers.authorization;if(!h?.startsWith("Bearer ")) return reply.code(401).send({error:"unauthorized"});
 try{return await verifyEnvelope(h.slice(7))}catch{return reply.code(401).send({error:"unauthorized"})}
}
app.post("/v1/events",{config:{rateLimit:{max:60,timeWindow:"1 minute"}}},async(req,reply)=>{
 const p:any=await principal(req,reply);if(!p?.tenantId)return;
 const parsed=eventSchema.safeParse(req.body);if(!parsed.success)return reply.code(400).send({error:"invalid_event"});
 try{return await tenantTx(p.tenantId,async c=>{
   const replay=await c.query("INSERT INTO replay_guard(tenant_id,issuer,jti,expires_at) VALUES($1,$2,$3,now()+interval '6 minutes') ON CONFLICT DO NOTHING RETURNING jti",[p.tenantId,p.issuer,p.jti]);
   if(!replay.rowCount){reply.code(409);return {error:"replay_detected"}}
   const e=await appendEvent(c,p.tenantId,{...parsed.data,producer:p.subject});
   await c.query("INSERT INTO audit_log(tenant_id,actor,action,target,details) VALUES($1,$2,'event.append',$3,$4::jsonb)",[p.tenantId,p.subject,e.id,JSON.stringify({streamId:e.stream_id,eventType:e.event_type})]);
   reply.code(201);return e;
 })}catch(e:any){if(e?.code==="23505")return reply.code(409).send({error:"duplicate_event"});throw e}
});
app.get("/v1/streams/:streamId/events",async(req:any,reply)=>{
 const p:any=await principal(req,reply);if(!p?.tenantId)return;
 const limit=Math.min(Math.max(Number(req.query?.limit)||100,1),500);
 return tenantTx(p.tenantId,async c=>(await c.query("SELECT * FROM events WHERE stream_id=$1 ORDER BY sequence ASC LIMIT $2",[req.params.streamId,limit])).rows);
});
app.get("/v1/events/:id",async(req:any,reply)=>{
 const p:any=await principal(req,reply);if(!p?.tenantId)return;
 return tenantTx(p.tenantId,async c=>{const q=await c.query("SELECT * FROM events WHERE id=$1",[req.params.id]);if(!q.rowCount){reply.code(404);return {error:"not_found"}}return q.rows[0]});
});
app.setErrorHandler((err,req,reply)=>{req.log.error({err},"request failed");reply.code(500).send({error:"internal_error"})});
const close=async()=>{await app.close();await pool.end();process.exit(0)};process.on("SIGTERM",close);process.on("SIGINT",close);
await app.listen({port:config.PORT,host:"0.0.0.0"});
