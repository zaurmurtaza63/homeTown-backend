import nodemailer from "nodemailer";

let transporter;

if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  // ✅ Real Gmail SMTP (for production)
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: +process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  console.log("📨 Using Gmail SMTP transporter");
} else {
  // 🧪 Local test mode (no emails sent, logs output instead)
  transporter = nodemailer.createTransport({
    jsonTransport: true,
  });

  console.log("🧪 Using test mode email transporter (no real emails sent)");
}

export async function sendResetEmail(to, link) {
  const message = {
    from: `"HomeTown" <${process.env.SMTP_USER || "no-reply@hometown.local"}>`,
    to,
    subject: "Reset your HomeTown password",
    html: `
      <div style="font-family:Arial,sans-serif">
        <h2>Reset your password</h2>
        <p>Click the button below (valid for 30 minutes):</p>
        <p><a href="${link}" style="background:#1ABC9C;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Reset Password</a></p>
        <p>If the button doesn't work, copy this link:</p>
        <p>${link}</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(message);
    console.log("✅ Reset email processed:", info);
  } catch (error) {
    console.error("❌ Email send failed:", error.message);
  }
}
