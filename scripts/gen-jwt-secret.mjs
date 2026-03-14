import crypto from "crypto";
const s = crypto.randomBytes(48).toString("hex");
console.log("JWT_SECRET (salin ke .env / Vercel):\n");
console.log(s);
console.log("\nPanjang:", s.length, "karakter");
