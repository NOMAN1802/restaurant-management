const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/database");
const config = require("./config/config");
const globalErrorHandler = require("./middlewares/globalErrorHandler");
const cookieParser = require("cookie-parser");

dotenv.config();
connectDB();

const PORT = config.port;

// Cors Policy
app.use(cors({
    credentials: true,
    origin: [process.env.FRONTEND_URL ||'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}))

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Routes
const userRoute = require("./routes/userRoute");
const orderRoute = require("./routes/orderRoute");
const tableRoute = require("./routes/tableRoute");
const couponRoute = require("./routes/couponRoute");
const paymentRoute = require("./routes/paymentRoute");
const menuRoute = require("./routes/menuRoute");
const expenseRoute = require("./routes/expenseRoute");
const reportRoute = require("./routes/reportRoute");
const userManagementRoute = require("./routes/userManagementRoute");

app.use("/api/user", userRoute);
app.use("/api/table", tableRoute);
app.use("/api/coupon", couponRoute);
app.use("/api/order", orderRoute);
app.use("/api/payment", paymentRoute);
app.use("/api/menu", menuRoute);
app.use("/api/expense", expenseRoute);
app.use("/api/report", reportRoute);
app.use("/api/users", userManagementRoute);

app.get("/", (req, res) => {
    res.send("Welcome to the POS Backend API!");
});

// Error Handling Middleware
app.use(globalErrorHandler);



// Server
app.listen(PORT, () => {
    console.log(`☑️  POS Server is listening on port ${PORT}`);
})

module.exports = app;