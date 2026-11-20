const express = require("express");
const pool = require("../../dbConnection");

const router = express.Router();
const methods = ["Cash", "Card"];
const sorts = new Map([
    ["newest", "s.created_at DESC, s.id DESC"],
    ["oldest", "s.created_at ASC, s.id ASC"],
    ["highest", 's."total price" DESC NULLS LAST, s.id DESC'],
    ["lowest", 's."total price" ASC NULLS LAST, s.id DESC'],
]);

router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!req.cashier) return res.status(401).json({ message: "Sign in as a cashier." });
    if (req.cashier.store_id == null) {
        return res.status(403).json({ message: "This cashier has no assigned store." });
    }
    next();
});

router.get("/catalog", async (req, res) => {
    const { rows } = await pool.query(
        `SELECT p.id, p.name, p.barcode, p.price, COALESCE(i.stock, 0) AS stock
         FROM public.products p LEFT JOIN public.inventory i ON i.product_id = p.id AND i.store_id = $1
         WHERE p.price >= 0
         ORDER BY (COALESCE(i.stock, 0) > 0) DESC, p.name, p.id`,
        [req.cashier.store_id]
    );
    res.json(rows);
});

router.get("/", async (req, res) => {
    const { from = "", to = "", payment = "", sort = "newest", page = "1" } = req.query;
    const order = sorts.get(sort);
    const validDate = (value) => {
        if (value === "") return true;
        if (typeof value !== "string" || !/^[1-9][0-9]{3}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
        const date = new Date(value);
        return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
    };
    if (!order || !validDate(from) || !validDate(to) || (from && to && from > to) ||
        typeof payment !== "string" || payment.length > 100 ||
        typeof page !== "string" || !/^[1-9][0-9]{0,5}$/.test(page)) {
        return res.status(400).json({ message: "Check your sales filters." });
    }

    const { rows } = await pool.query(
        `SELECT s.id, s.cahier_id AS cashier_id, c.name AS cashier_name,
                s."total price" AS total, s.payment_method, s.created_at
         FROM public.sales s LEFT JOIN public.cashiers c ON c.id = s.cahier_id
         WHERE s.store_id = $1
           AND ($2::date IS NULL OR s.created_at >= ($2::date::timestamp AT TIME ZONE 'Asia/Kuwait'))
           AND ($3::date IS NULL OR s.created_at < (($3::date + 1)::timestamp AT TIME ZONE 'Asia/Kuwait'))
           AND ($4 = '' OR lower(s.payment_method) = lower($4))
         ORDER BY ${order} LIMIT 26 OFFSET $5`,
        [req.cashier.store_id, from || null, to || null, payment, (Number(page) - 1) * 25]
    );
    res.json({ sales: rows.slice(0, 25), hasMore: rows.length > 25 });
});

router.post("/", async (req, res) => {
    const { items, paymentMethod } = req.body ?? {};
    if (!req.is("application/json") || !methods.includes(paymentMethod) ||
        !Array.isArray(items) || !items.length || items.length > 100 ||
        items.some((item) => typeof item?.productId !== "string" ||
            !/^[1-9][0-9]{0,18}$/.test(item.productId) ||
            BigInt(item.productId) > 9223372036854775807n ||
            !Number.isSafeInteger(item.quantity) || item.quantity < 1) ||
        new Set(items.map((item) => item.productId)).size !== items.length) {
        return res.status(400).json({ message: "Choose products, whole quantities and a payment method." });
    }

    const { id: cashierId, store_id: storeId } = req.cashier;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const { rows: [sale] } = await client.query(
            'INSERT INTO public.sales (store_id, cahier_id, payment_method) VALUES ($1, $2, $3) RETURNING id',
            [storeId, cashierId, paymentMethod]
        );

        // Acquire inventory locks in a consistent order across checkouts.
        const orderedItems = [...items].sort((a, b) => a.productId.localeCompare(b.productId));
        for (const { productId, quantity } of orderedItems) {
            const updated = await client.query(
                `UPDATE public.inventory SET stock = stock - $3::bigint
                 WHERE store_id = $1 AND product_id = $2 AND stock >= $3::bigint`,
                [storeId, productId, quantity]
            );
            const inserted = updated.rowCount === 1 && await client.query(
                `INSERT INTO public.sale_items (sale_id, products_id, quantity, purchase_price)
                 SELECT $1, id, $3, price FROM public.products WHERE id = $2 AND price >= 0`,
                [sale.id, productId, quantity]
            );
            if (!inserted || inserted.rowCount !== 1) {
                await client.query("ROLLBACK");
                return res.status(409).json({ message: `Product #${productId} is unavailable in the requested quantity.` });
            }
        }

        const { rows: [receipt] } = await client.query(
            `UPDATE public.sales SET "total price" = (
                SELECT SUM(quantity * purchase_price) FROM public.sale_items WHERE sale_id = $1
             ) WHERE id = $1 RETURNING id, "total price" AS total`,
            [sale.id]
        );
        await client.query("COMMIT");
        res.status(201).json(receipt);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
});

router.use((error, _req, res, _next) => {
    console.error("Sales request failed", error.code || error.name);
    res.status(500).json({ message: "Could not complete the sales request." });
});

module.exports = router;
