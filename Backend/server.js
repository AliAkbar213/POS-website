require("dotenv").config()
const { randomBytes } = require("node:crypto");
const express = require("express")
const cors = require("cors");
const session = require("express-session");
const pool = require("./dbConnection");
const adminSalesRoute = require("./routes/adminSalesRoute");
const adminCashiersRoute = require("./routes/adminCashiersRoute");
const adminRoute = require("./routes/adminRoute");
const productsRoute = require("./routes/products/productsRoute");
const cashiersRoute = require("./routes/cashiers/cashiersRoute");
const salesRoute = require("./routes/cashiers/salesRoute");


const app = express();

app.set('trust proxy', 1)

app.use(cors({
    origin: [
        "http://localhost:5173"
    ],
    credentials: true
}));

app.use(express.json())
const sessionOptions = {

    secret: process.env.SESSION_SECRET || randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 8 * 60 * 60 * 1000
    }
};
const adminSession = session({ ...sessionOptions, name: "pos.admin.sid" });
app.use("/api/admin/sales", adminSession, adminSalesRoute);
app.use("/api/admin/cashiers", adminSession, adminCashiersRoute);
app.use("/api/admin", adminSession, adminRoute);
app.use("/api/products", adminSession, (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!req.session.adminId) {
        return res.status(401).json({ message: "Sign in as admin to view products." });
    }
    next();
}, productsRoute);
const cashierSession = session({ ...sessionOptions, name: "pos.sid" });
async function refreshCashier(req, res, next) {
    if (!req.session.cashier) return next();
    try {
        const { rows: [cashier] } = await pool.query(
            'SELECT id, name, store_id FROM public.cashiers WHERE id = $1 AND "PIN" IS NOT NULL',
            [req.session.cashier.id]
        );
        if (cashier) req.session.cashier = cashier;
        else delete req.session.cashier;
        next();
    } catch (error) {
        console.error("Cashier session lookup failed", error.code || error.name);
        res.status(500).json({ message: "Could not check the cashier session." });
    }
}
app.use("/api/cashiers", cashierSession, refreshCashier, cashiersRoute);
app.use("/api/cashier-sales", cashierSession, refreshCashier, salesRoute);

app.get("/api/test", (_req, res) => {
    res.json({ status: "ok", message: "POS API is running" });
});

app.listen(process.env.PORT || 5000, () => {
    console.log(`listening on port: ${process.env.PORT || 5000}`);
})
