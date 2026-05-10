const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const User = require("./models/User");

const authRoutes = require("./routes/authRoutes");
const newsRoutes = require("./routes/newsRoutes");
const userRoutes = require("./routes/userRoutes");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ message: "API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/user", userRoutes);

const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Admin User";

  if (!email || !password) return;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (!existing) {
    await User.create({ name, email: email.toLowerCase(), password });
    console.log("Default admin created");
  }
};

const PORT = process.env.PORT || 5000;

const connectWithRetry = async (attempt = 1) => {
  try {
    await connectDB();
    await seedAdmin();
    console.log("Database initialization complete");
  } catch (error) {
    console.error(`Database init failed (attempt ${attempt}):`, error.message);
    const nextAttempt = attempt + 1;
    setTimeout(() => connectWithRetry(nextAttempt), 10000);
  }
};

const startServer = () => {
  console.log("Starting backend service...");
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Port: ${PORT}`);

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    connectWithRetry();
  });
};

startServer();
