import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();

// ✅ Basic console log when the app starts
console.log("🚀 Initializing HomeTown backend...");

// ✅ Log every incoming request (method, URL, body)
app.use((req, res, next) => {
  console.log(`🟢 [${req.method}] ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("📦 Request Body:", req.body);
  }
  next();
});

// ✅ Enable CORS with debugging
app.use(cors({
  origin: "*", // You can replace with specific URL later
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: false
}));
console.log("✅ CORS enabled for all origins");

// ✅ Parse JSON and catch invalid JSON errors
app.use(express.json({
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (err) {
      console.error("❌ Invalid JSON received:", buf.toString());
      throw new Error("Invalid JSON");
    }
  }
}));

// ✅ Global error handler for invalid JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error("❌ JSON Syntax Error:", err.message);
    return res.status(400).json({ error: "Invalid JSON format" });
  }
  next();
});

// ✅ Use your routes with try/catch debugging
try {
  app.use("/api/auth", authRoutes);
  console.log("✅ Auth routes loaded successfully");
} catch (err) {
  console.error("❌ Failed to load auth routes:", err);
}

// ✅ Root route
app.get("/", (req, res) => {
  console.log("🏠 Home route hit");
  res.send("✅ HomeTown backend is running successfully!");
});

// ✅ 404 Handler (for any unknown routes)
app.use((req, res) => {
  console.warn(`⚠️ Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: "Route not found" });
});

// ✅ Global error handler (for unhandled errors)
app.use((err, req, res, next) => {
  console.error("💥 Unhandled Error:", err.stack || err);
  res.status(500).json({ error: "Internal Server Error", details: err.message });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
