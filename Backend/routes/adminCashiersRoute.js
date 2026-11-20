const express = require("express");
const pool = require("../dbConnection");

const router = express.Router();
const columns = 'id, name, store_id, created_at, ("PIN" IS NOT NULL) AS has_pin';
const validId = (value) => typeof value === "string" && /^[1-9][0-9]{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n;

router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!req.session.adminId) return res.status(401).json({ message: "Sign in as admin to manage cashiers." });
    if (req.method !== "GET" && !req.is("application/json")) {
        return res.status(415).json({ message: "Expected a JSON request." });
    }
    next();
});

router.get("/", async (_req, res) => {
    const { rows } = await pool.query(`SELECT ${columns} FROM public.cashiers ORDER BY id`);
    res.json(rows);
});

router.get("/stores", async (_req, res) => {
    const { rows } = await pool.query("SELECT id FROM public.stores ORDER BY id");
    res.json(rows);
});

router.param("id", (req, res, next, id) => {
    if (!validId(id)) return res.status(400).json({ message: "Invalid cashier ID." });
    next();
});

router.post("/", validateCashier, async (req, res) => {
    const { name, storeId, pin } = req.cashierInput;
    const { rows: [cashier] } = await pool.query(
        `INSERT INTO public.cashiers (name, store_id, "PIN") VALUES ($1, $2, $3::numeric) RETURNING ${columns}`,
        [name, storeId, pin]
    );
    res.status(201).json(cashier);
});

router.patch("/:id", validateCashier, async (req, res) => {
    const { name, storeId, pin } = req.cashierInput;
    const { rows: [cashier] } = await pool.query(
        `UPDATE public.cashiers SET name = $1, store_id = $2, "PIN" = COALESCE($3::numeric, "PIN")
         WHERE id = $4 RETURNING ${columns}`,
        [name, storeId, pin || null, req.params.id]
    );
    if (!cashier) return res.status(404).json({ message: "Cashier no longer exists." });
    res.json(cashier);
});

router.delete("/:id", async (req, res) => {
    const { rowCount } = await pool.query("DELETE FROM public.cashiers WHERE id = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ message: "Cashier no longer exists." });
    res.json({ deleted: true });
});

function validateCashier(req, res, next) {
    const { name, storeId, pin } = req.body ?? {};
    if (typeof name !== "string" || !name.trim() || name.includes("\0") ||
        !(storeId === "" || validId(storeId)) ||
        typeof pin !== "string" || (pin !== "" && !/^[0-9]{1,32}$/.test(pin)) ||
        (req.method === "POST" && pin === "")) {
        return res.status(400).json({ message: "Enter a name, choose a store, and use a numeric PIN of up to 32 digits." });
    }
    req.cashierInput = { name: name.trim(), storeId: storeId || null, pin };
    next();
}

router.use((error, req, res, _next) => {
    if (error.code === "23503") {
        return res.status(409).json({ message: req.method === "DELETE"
            ? "This cashier has linked records and cannot be deleted."
            : "The selected store no longer exists." });
    }
    console.error("Cashier management failed", error.code || error.name);
    res.status(500).json({ message: "Could not complete the cashier management request." });
});

module.exports = router;
