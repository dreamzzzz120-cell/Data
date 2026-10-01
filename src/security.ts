import { createRemoteJWKSet, jwtVerify } from "jose";
import { createHash } from "node:crypto";
import { config } from "./config.js";
const jwks=createRemoteJWKSet(new URL(config.M2M_JWKS_URL));
export type Principal={subject:string;tenantId:string;issuer:string;jti:string};
export async function verifyEnvelope(token:string):Promise<Principal>{
 const {payload,protectedHeader}=await jwtVerify(token,jwks,{audience:config.M2M_AUDIENCE,clockTolerance:5});
 if(!payload.iss||!config.M2M_ISSUERS.includes(payload.iss)) throw new Error("issuer_not_allowed");
 if(!payload.sub||!payload.jti||typeof payload.tenant_id!=="string") throw new Error("invalid_identity_claims");
 if(!payload.exp||!payload.iat||payload.exp-payload.iat>300) throw new Error("invalid_token_lifetime");
 if(!protectedHeader.kid) throw new Error("missing_kid");
 return {subject:payload.sub,tenantId:payload.tenant_id,issuer:payload.iss,jti:payload.jti};
}
export const canonicalHash=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
