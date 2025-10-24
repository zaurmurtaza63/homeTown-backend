import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { pool } from "../db.js";
import { sendResetEmail } from "../utils/mailer.js";

const tokenTTLMin = 30;

export async function signup(req, res) {
  try {
    const { first_name, last_name, email, phone, password } = req.body;
    if (!first_name || !last_name || !email || !password)
      return res.status(400).json({ message: "Missing required fields" });

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) return res.status(409).json({ message: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (first_name, last_name, email, phone, password) VALUES (?,?,?,?,?)",
      [first_name, last_name, email, phone || null, hash]
    );

    return res.status(201).json({ message: "Signup successful" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (!rows.length) return res.status(401).json({ message: "Invalid credentials" });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
}

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const [rows] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (!rows.length) return res.json({ message: "If that email exists, a reset link was sent." }); // avoid user enumeration

    const userId = rows[0].id;
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + tokenTTLMin * 60 * 1000);

    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?,?,?)",
      [userId, token, expires]
    );

    const link = `${process.env.APP_BASE_URL}/reset-password?token=${token}`;
    await sendResetEmail(email, link);

    res.json({ message: "Reset link sent" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) return res.status(400).json({ message: "Invalid request" });

    const [rows] = await pool.query(
      "SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > NOW()",
      [token]
    );
    if (!rows.length) return res.status(400).json({ message: "Invalid or expired token" });

    const entry = rows[0];
    const hash = await bcrypt.hash(new_password, 10);

    await pool.query("UPDATE users SET password = ? WHERE id = ?", [hash, entry.user_id]);
    await pool.query("UPDATE password_reset_tokens SET used = 1 WHERE id = ?", [entry.id]);

    res.json({ message: "Password updated" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
}
