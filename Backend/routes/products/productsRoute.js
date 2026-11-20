const express = require("express");
const pool = require("../../dbConnection");

const router = express.Router();

router.get("/", async (_req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT id, name, price, barcode FROM public.products ORDER BY id"
        );
        res.json(rows);
    } catch (error) {
        console.error("Products query failed", error.code || error.name);
        res.status(500).json({ message: "Could not load products." });
    }
});

router.patch("/:id", async (req, res) => {
    const { id } = req.params;
    const { name, price, barcode } = req.body ?? {};
    if (!/^[1-9][0-9]{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n) {
        return res.status(400).json({ message: "Invalid product ID." });
    }
    if (typeof name !== "string" || !name.trim() || name.includes("\0")) {
        return res.status(400).json({ message: "Enter a product name." });
    }
    if (typeof price !== "string" || !/^[0-9]{1,16}(?:\.[0-9]{1,3})?$/.test(price)) {
        return res.status(400).json({ message: "Enter a non-negative price with up to three decimal places." });
    }
    if (typeof barcode !== "string" || barcode.includes("\0")) {
        return res.status(400).json({ message: "Enter a valid barcode." });
    }

    try {
        const { rows: [product] } = await pool.query(
            `UPDATE public.products SET name = $1, price = $2, barcode = $3
             WHERE id = $4 RETURNING id, name, price, barcode`,
            [name.trim(), price, barcode.trim() || null, id]
        );
        if (!product) {
            return res.status(404).json({ message: "Product no longer exists." });
        }
        res.json(product);
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ message: "A product already uses that value." });
        }
        if (["22001", "22003", "22P02", "23502", "23514"].includes(error.code)) {
            return res.status(400).json({ message: "The product name, price, or barcode is invalid." });
        }
        console.error("Product update failed", error.code || error.name);
        res.status(500).json({ message: "Could not save the product." });
    }
});

module.exports = router;
