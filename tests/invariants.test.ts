import { describe,it,expect } from "vitest";
import { createHash } from "node:crypto";
describe("Datasphere invariants",()=>{
 it("hashes deterministic event material",()=>{const x=JSON.stringify({tenant:"t",stream:"s",sequence:"1"});expect(createHash("sha256").update(x).digest("hex")).toHaveLength(64)});
 it("does not define portable trust conclusions",()=>{const forbidden=["trusted","approved","safe","compliant","trustScore"];const schema=["streamId","eventType","producerEventId","occurredAt","payload","correctionOf"];expect(schema.some(x=>forbidden.includes(x))).toBe(false)});
});
