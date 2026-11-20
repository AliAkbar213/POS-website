require("dotenv").config()
const { readToken } = require("./auth");
const express = require("express")
const cors = require("cors");
const pool = require("./dbConnection");
const adminSalesRoute = require("./routes/adminSalesRoute");
const adminCashiersRoute = require("./routes/adminCashiersRoute");
const adminRoute = require("./routes/adminRoute");
const productsRoute = require("./routes/products/productsRoute");
const cashiersRoute = require("./routes/cashiers/cashiersRoute");
const salesRoute = require("./routes/cashiers/salesRoute");


const app = express();

app.set('trust proxy', 1)

const allowedOrigins = [
    "http://localhost:5173",
    "https://pos100.netlify.app"
];
// Reject untrusted browser origins before any session-changing route runs.
app.use((req, res, next) => {
    if (req.headers.origin && !allowedOrigins.includes(req.headers.origin)) {
        return res.status(403).json({ message: "This frontend origin is not allowed." });
    }
    next();
});
app.use(cors({
    origin: allowedOrigins,
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json())
app.use("/api", readToken);
app.use("/api/admin/sales", adminSalesRoute);
app.use("/api/admin/cashiers", adminCashiersRoute);
app.use("/api/admin", adminRoute);
app.use("/api/products", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (req.auth?.role !== "admin") {
        return res.status(401).json({ message: "Sign in as admin to view products." });
    }
    next();
}, productsRoute);
async function refreshCashier(req, res, next) {
    if (req.auth?.role !== "cashier") return next();
    try {
        const { rows: [cashier] } = await pool.query(
            'SELECT id, name, store_id FROM public.cashiers WHERE id = $1 AND "PIN" IS NOT NULL',
            [req.auth.id]
        );
        req.cashier = cashier;
        next();
    } catch (error) {
        console.error("Cashier session lookup failed", error.code || error.name);
        res.status(500).json({ message: "Could not check the cashier session." });
    }
}
app.use("/api/cashiers", refreshCashier, cashiersRoute);
app.use("/api/cashier-sales", refreshCashier, salesRoute);

app.get("/api/test", (_req, res) => {
    res.json({ status: "ok", message: "POS API is running" });
});

if (require.main === module) {
    app.listen(process.env.PORT || 5000, () => {
        console.log(`listening on port: ${process.env.PORT || 5000}`);
    });
}

module.exports = app;
