import type pg from "pg";
import { createHash } from "node:crypto";
export type EventInput={streamId:string;eventType:string;producer:string;producerEventId:string;occurredAt:string;payload:unknown;correctionOf?:string};
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
export async function appendEvent(c:pg.PoolClient,tenantId:string,input:EventInput){
 const prior=await c.query("SELECT sequence,event_hash FROM events WHERE tenant_id=$1 AND stream_id=$2 ORDER BY sequence DESC LIMIT 1 FOR UPDATE",[tenantId,input.streamId]);
 const sequence=prior.rowCount?(BigInt(prior.rows[0].sequence)+1n):1n;
 const previousEventHash=prior.rows[0]?.event_hash??null;
 const payloadJson=JSON.stringify(input.payload); const payloadHash=hash(payloadJson);
 const eventHash=hash(JSON.stringify({tenantId,streamId:input.streamId,sequence:String(sequence),eventType:input.eventType,producer:input.producer,producerEventId:input.producerEventId,occurredAt:input.occurredAt,payloadHash,previousEventHash,correctionOf:input.correctionOf??null}));
 const q=await c.query(`INSERT INTO events(tenant_id,stream_id,sequence,event_type,producer,producer_event_id,occurred_at,payload,payload_hash,previous_event_hash,event_hash,correction_of)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12) RETURNING *`,[tenantId,input.streamId,String(sequence),input.eventType,input.producer,input.producerEventId,input.occurredAt,payloadJson,payloadHash,previousEventHash,eventHash,input.correctionOf??null]);
 return q.rows[0];
}
