const { randomBytes } = require("node:crypto");
const jose = import("jose");

const configuredKey = process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (!configuredKey && (process.env.NODE_ENV === "production" || process.env.VERCEL)) {
    throw new Error("Configure JWT_SECRET with a stable random secret on the backend.");
}
const key = configuredKey ? Buffer.from(configuredKey) : randomBytes(32);
const issuer = "pos-backend";
const audience = "pos-api";

async function issueToken(role, id) {
    const { SignJWT } = await jose;
    return new SignJWT({ role })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(issuer).setAudience(audience).setSubject(String(id))
        .setIssuedAt().setExpirationTime("8h").sign(key);
}

async function readToken(req, res, next) {
    const match = /^Bearer ([^\s]+)$/i.exec(req.get("Authorization") || "");
    if (!match) return next();
    const { jwtVerify, errors } = await jose;
    try {
        const { payload } = await jwtVerify(match[1], key, {
            algorithms: ["HS256"], issuer, audience, typ: "JWT", requiredClaims: ["exp", "sub"],
        });
        if (typeof payload.sub === "string" && ["cashier", "admin"].includes(payload.role)) {
            req.auth = { id: payload.sub, role: payload.role };
        }
    } catch (error) {
        if (!(error instanceof errors.JOSEError)) return next(error);
    }
    next();
}

module.exports = { readToken, issueToken };
