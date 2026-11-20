const { issueToken } = require("../auth");
const express = require("express");
const pool = require("../dbConnection");

const router = express.Router();
const windowMs = 5 * 60 * 1000;
const attemptsByAddress = new Map();
let windowEnd = Date.now() + windowMs;

router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

router.get("/session", (req, res) => {
    res.json({ signedIn: req.auth?.role === "admin" });
});

router.post("/login", (req, res, next) => {
    if (!req.is("application/json")) {
        return res.status(415).json({ message: "Expected a JSON request." });
    }
    next();
});

router.post("/login", async (req, res) => {
    const { password } = req.body ?? {};
    if (typeof password !== "string" || !password || password.includes("\0")) {
        return res.status(400).json({ message: "Enter the admin password." });
    }

    const now = Date.now();
    if (now >= windowEnd) {
        attemptsByAddress.clear();
        windowEnd = now + windowMs;
    }

    const address = req.socket.remoteAddress;
    const attempts = attemptsByAddress.get(address) ?? 0;
    if (attempts >= 10) {
        res.set("Retry-After", String(Math.ceil((windowEnd - now) / 1000)));
        return res.status(429).json({ message: "Too many sign-in attempts. Try again in a few minutes." });
    }
    attemptsByAddress.set(address, attempts + 1);

    const { rows: [admin] } = await pool.query(
        "SELECT id FROM public.admin WHERE password = $1 ORDER BY id LIMIT 1",
        [password]
    );
    if (!admin) {
        return res.status(401).json({ message: "Incorrect admin password." });
    }

    attemptsByAddress.delete(address);
    const token = await issueToken("admin", admin.id);
    res.json({ signedIn: true, token });
});


router.use((error, _req, res, _next) => {
    console.error("Admin session request failed", error.code || error.name);
    res.status(500).json({ message: "Could not complete the admin session request." });
});

module.exports = router;
