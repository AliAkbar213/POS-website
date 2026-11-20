const { issueToken } = require("../../auth");
const express = require("express");
const pool = require("../../dbConnection");

const router = express.Router();
const windowMs = 5 * 60 * 1000;
const attemptsByCashier = new Map();
const attemptsByAddress = new Map();
let windowEnd = Date.now() + windowMs;

router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

router.get("/", async (_req, res) => {
    const { rows } = await pool.query(
        'SELECT id FROM public.cashiers WHERE "PIN" IS NOT NULL ORDER BY id'
    );
    res.json(rows);
});

router.get("/session", (req, res) => {
    res.json({ cashier: req.cashier ?? null });
});

// Requiring JSON makes cross-origin form submissions ineligible for session changes.
router.post("/login", (req, res, next) => {
    if (!req.is("application/json")) {
        return res.status(415).json({ message: "Expected a JSON request." });
    }
    next();
});

router.post("/login", async (req, res) => {
    const { cashierId, pin } = req.body ?? {};
    if (
        typeof cashierId !== "string" ||
        !/^[1-9][0-9]{0,18}$/.test(cashierId) ||
        BigInt(cashierId) > 9223372036854775807n ||
        typeof pin !== "string" ||
        !/^[0-9]{1,32}$/.test(pin)
    ) {
        return res.status(400).json({ message: "Choose a cashier ID and enter a numeric PIN." });
    }

    const now = Date.now();
    if (now >= windowEnd) {
        attemptsByCashier.clear();
        attemptsByAddress.clear();
        windowEnd = now + windowMs;
    }

    const address = req.socket.remoteAddress;
    const cashierAttempts = attemptsByCashier.get(cashierId) ?? 0;
    const addressAttempts = attemptsByAddress.get(address) ?? 0;
    if (cashierAttempts >= 5 || addressAttempts >= 30) {
        res.set("Retry-After", String(Math.ceil((windowEnd - now) / 1000)));
        return res.status(429).json({ message: "Too many sign-in attempts. Try again in a few minutes." });
    }

    attemptsByCashier.set(cashierId, cashierAttempts + 1);
    attemptsByAddress.set(address, addressAttempts + 1);

    const { rows: [cashier] } = await pool.query(
        'SELECT id, name, store_id FROM public.cashiers WHERE id = $1::bigint AND "PIN" = $2::numeric',
        [cashierId, pin]
    );
    if (!cashier) {
        return res.status(401).json({ message: "Cashier ID or PIN is incorrect." });
    }

    attemptsByCashier.delete(cashierId);
    const token = await issueToken("cashier", cashier.id);
    res.json({ cashier, token });
});


router.use((error, _req, res, _next) => {
    console.error("Cashier request failed", error.code || error.name);
    res.status(500).json({ message: "Could not complete the cashier request." });
});

module.exports = router;
