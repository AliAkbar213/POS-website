const express = require("express");
const pool = require("../dbConnection");

const router = express.Router();
const sorts = new Map([
    ["newest", "s.created_at DESC, s.id DESC"],
    ["oldest", "s.created_at ASC, s.id ASC"],
    ["highest", 's."total price" DESC NULLS LAST, s.id DESC'],
    ["lowest", 's."total price" ASC NULLS LAST, s.id DESC'],
]);
const validId = (value) => typeof value === "string" && /^[1-9][0-9]{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n;
function validDate(value) {
    if (value === "") return true;
    if (typeof value !== "string" || !/^[1-9][0-9]{3}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!req.session.adminId) return res.status(401).json({ message: "Sign in as admin to view sales." });
    next();
});

router.get("/options", async (_req, res) => {
    const [stores, cashiers] = await Promise.all([
        pool.query("SELECT id FROM public.stores ORDER BY id"),
        pool.query("SELECT id, name FROM public.cashiers ORDER BY id"),
    ]);
    res.json({ stores: stores.rows, cashiers: cashiers.rows });
});

router.get("/", async (req, res) => {
    const { from = "", to = "", store = "", cashier = "", payment = "", min = "", max = "", sort = "newest", page = "1" } = req.query;
    const amount = (value) => typeof value === "string" && (value === "" || /^[0-9]{1,16}(\.[0-9]{1,3})?$/.test(value));
    if (!validDate(from) || !validDate(to) || (from && to && from > to) ||
        !(store === "" || validId(store)) || !(cashier === "" || validId(cashier)) ||
        typeof payment !== "string" || payment.length > 100 ||
        !amount(min) || !amount(max) || (min !== "" && max !== "" && Number(min) > Number(max)) ||
        !sorts.has(sort) || typeof page !== "string" || !/^[1-9][0-9]{0,5}$/.test(page)) {
        return res.status(400).json({ message: "Check the dates, amounts, and sales filters." });
    }
    const values = [from || null, to || null, store || null, cashier || null, payment, min || null, max || null];
    const filtered = `WITH filtered AS (
        SELECT s.* FROM public.sales s
        WHERE ($1::date IS NULL OR s.created_at >= ($1::date::timestamp AT TIME ZONE 'Asia/Kuwait'))
          AND ($2::date IS NULL OR s.created_at < (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Kuwait'))
          AND ($3::bigint IS NULL OR s.store_id = $3)
          AND ($4::bigint IS NULL OR s.cahier_id = $4)
          AND ($5 = '' OR lower(s.payment_method) = lower($5))
          AND ($6::numeric IS NULL OR s."total price" >= $6)
          AND ($7::numeric IS NULL OR s."total price" <= $7)
    )`;
    const client = await pool.connect();
    try {
        await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
        const { rows: [summary] } = await client.query(`${filtered}
            SELECT COUNT(*) AS count, COALESCE(SUM("total price"), 0) AS revenue,
                   COALESCE(AVG("total price"), 0) AS average,
                   (SELECT COALESCE(SUM(i.quantity), 0) FROM public.sale_items i JOIN filtered f ON f.id = i.sale_id) AS units
            FROM filtered`, values);
        const { rows: sales } = await client.query(`${filtered}
            SELECT s.id, s.store_id, s.cahier_id AS cashier_id, c.name AS cashier_name,
                   s."total price" AS total, s.payment_method, s.created_at
            FROM filtered s LEFT JOIN public.cashiers c ON c.id = s.cahier_id
            ORDER BY ${sorts.get(sort)} LIMIT 25 OFFSET $8`, [...values, (Number(page) - 1) * 25]);
        const { rows: daily } = await client.query(`${filtered}
            SELECT to_char(created_at AT TIME ZONE 'Asia/Kuwait', 'YYYY-MM-DD') AS day,
                   COUNT(*) AS count, COALESCE(SUM("total price"), 0) AS revenue
            FROM filtered GROUP BY day ORDER BY day DESC LIMIT 30`, values);
        const { rows: payments } = await client.query(`${filtered}
            SELECT COALESCE(payment_method, 'Unknown') AS method, COUNT(*) AS count,
                   COALESCE(SUM("total price"), 0) AS revenue
            FROM filtered GROUP BY payment_method ORDER BY revenue DESC, method`, values);
        const { rows: products } = await client.query(`${filtered}
            SELECT i.products_id AS id, p.name, SUM(i.quantity) AS units,
                   COALESCE(SUM(i.quantity * i.purchase_price), 0) AS revenue
            FROM public.sale_items i JOIN filtered f ON f.id = i.sale_id
            LEFT JOIN public.products p ON p.id = i.products_id
            GROUP BY i.products_id, p.name ORDER BY revenue DESC, i.products_id LIMIT 5`, values);
        await client.query("COMMIT");
        res.json({ sales, summary, daily: daily.reverse(), payments, products, page: Number(page), pages: Math.ceil(Number(summary.count) / 25) });
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
});

router.get("/:id", async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid sale ID." });
    const { rows: [sale] } = await pool.query(
        `SELECT s.id, s.store_id, s.cahier_id AS cashier_id, c.name AS cashier_name,
                s."total price" AS total, s.payment_method, s.created_at
         FROM public.sales s LEFT JOIN public.cashiers c ON c.id = s.cahier_id WHERE s.id = $1`, [req.params.id]);
    if (!sale) return res.status(404).json({ message: "Sale no longer exists." });
    const { rows: items } = await pool.query(
        `SELECT i.products_id AS product_id, p.name, i.quantity, i.purchase_price,
                i.quantity * i.purchase_price AS total
         FROM public.sale_items i LEFT JOIN public.products p ON p.id = i.products_id
         WHERE i.sale_id = $1 ORDER BY i.products_id`, [req.params.id]);
    res.json({ sale, items });
});

router.use((error, _req, res, _next) => {
    console.error("Admin sales request failed", error.code || error.name);
    res.status(500).json({ message: "Could not load sales. Please try again." });
});

module.exports = router;
