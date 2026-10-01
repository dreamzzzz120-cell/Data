import { z } from "zod";
const schema=z.object({
 NODE_ENV:z.enum(["development","test","production"]).default("development"),
 PORT:z.coerce.number().int().min(1).max(65535).default(3000),
 DATABASE_URL:z.string().min(1),
 ADMIN_DATABASE_URL:z.string().min(1).optional(),
 M2M_JWKS_URL:z.string().url(),
 M2M_ISSUERS:z.string().transform(v=>v.split(",").map(x=>x.trim()).filter(Boolean)),
 M2M_AUDIENCE:z.string().min(1).default("datasphere")
});
export const config=schema.parse(process.env);
