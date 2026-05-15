const data = require("../data/data");
const bcryptJs = require("bcryptjs");
const crypto = require("crypto");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const {redisClient}=require("../middelware/redisClient"); 
const { createToken } = require("../middelware/jwtmake");
const brevo = require('@getbrevo/brevo');
 
const sendEmail = async (email, otp) => {
  const response = await fetch(
    "https://api.brevo.com/v3/smtp/email",
    {
      method: "POST",

      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },

      body: JSON.stringify({
        sender: {
          email: "yassefsea274@gmail.com",
          name: "أكلي",
        },

        to: [{ email }],

        subject: "🍕 كود التحقق من أكلي",

        htmlContent: `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:2rem 0;">
<tr>
<td align="center">

<table width="520" cellpadding="0" cellspacing="0"
style="background:#fff;border-radius:16px;overflow:hidden;">

<tr>
<td style="background:#E8502A;padding:2rem;text-align:center;">
<div style="font-size:32px;margin-bottom:6px;">🍕</div>

<div style="color:#fff;font-size:22px;font-weight:bold;">
أكلي
</div>

<div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;">
اطلب أكلك المفضل
</div>
</td>
</tr>

<tr>
<td style="padding:2rem;text-align:center;">

<p style="font-size:16px;color:#111;margin:0 0 8px;">
مرحباً 👋
</p>

<p style="font-size:14px;color:#666;margin:0 0 1.5rem;line-height:1.7;">
استخدم الكود التالي لتأكيد حسابك.<br>
الكود صالح لمدة <strong>دقيقة واحدة</strong> فقط.
</p>

<div style="background:#FDF1EE;border-radius:12px;
padding:1.25rem;display:inline-block;margin-bottom:1.5rem;">

<div style="font-size:13px;color:#993C1D;
margin-bottom:6px;font-weight:bold;">
كود التحقق
</div>

<div style="font-size:36px;font-weight:bold;
color:#E8502A;letter-spacing:10px;">
${otp}
</div>

</div>

<p style="font-size:12px;color:#999;line-height:1.7;margin:0;">
إذا لم تطلب هذا الكود، يمكنك تجاهل هذا الإيميل بأمان.
</p>

</td>
</tr>

<tr>
<td style="border-top:1px solid #eee;
padding:1rem 2rem;text-align:center;">

<span style="font-size:12px;color:#999;">
📍 أكلي — أفضل مطاعم حواليك لحد الباب
</span>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.log(data);
    throw new Error(data.message || "Failed to send email");
  }

  return data;
};


const sendOTPEmail = async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email || !phone) {
      return res.status(400).json({ error: "Email and phone are required" });
    }

    const lockExists = await redisClient.get(`otp_lock:${email}`);
    if (lockExists) {
      return res.status(429).json({ error: "OTP already sent. Please wait." });
    }

    const { rows: existing } = await data.query(
      "SELECT id FROM users WHERE email = $1 OR phone = $2",
      [email, phone]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "Email or phone already exists" });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcryptJs.hash(otp, 10);

    await redisClient.set(`otp:${email}`, hashedOtp, { ex: 60 });

    await redisClient.set(`otp_lock:${email}`, "1", { ex: 60 });

    await sendEmail(email, otp);

    return res.status(200).json({ message: "OTP sent to your email successfully" });
  } catch (err) {
    console.error("Send OTP Error:", err);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
};

const signupForCustomer = async (req, res) => {
  try {
    const { name, email, password, role, phone, otp } = req.body;

    if (!name || !email || !password || !phone || !otp) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const ALLOWED_ROLES = ["customer", "admin"];
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const storedHash = await redisClient.get(`otp:${email}`);
    if (!storedHash) {
      return res.status(400).json({ error: "OTP expired or not found" });
    }

    const isValid = await bcryptJs.compare(otp, storedHash);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    await redisClient.del(`otp:${email}`);
    await redisClient.del(`otp_lock:${email}`);

    const { rows: userExists } = await data.query(
      "SELECT id FROM users WHERE email = $1 OR phone = $2",
      [email, phone]
    );
    if (userExists.length > 0) {
      return res.status(409).json({ error: "Email or phone already exists" });
    }

    const hashPassword = await bcryptJs.hash(password, 11);

    try {
      await data.query(
        "INSERT INTO users (name, email, password, role, phone) VALUES ($1, $2, $3, $4, $5)",
        [name, email, hashPassword, role, phone]
      );
    } catch (err) {
      if (err.code === "23505") {
        return res.status(409).json({ error: "Email or phone already exists" });
      }
      throw err;
    }

    return res.status(201).json({
      message: "User registered successfully",
      user: { name, email, phone, role },
    });
  } catch (err) {
    console.error("Signup Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};


const loginForCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { rows: userRows } = await data.query("SELECT * FROM users WHERE email = $1", [email]);

    if (userRows.length === 0) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const user = userRows[0];
    if (user.role !== "customer") {
      return res.status(403).json({ error: "Access denied. Not a customer account." });
    }

    const isPasswordValid = await bcryptJs.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = createToken({ id: user.id, role: user.role, name: user.name, email: user.email });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        token,
      },
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = req.user.id;
    const { rows: userRows } = await data.query("SELECT id, name, email, role, phone FROM users WHERE id = $1", [user]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ user: userRows[0] });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const changeUserInfoForCustomer = async (req, res) => {
  try {
    const userId = req.user.id;
    if (req.user.role !== "customer") {
      return res.status(403).json({ error: "Access denied. Only customers can change their info." });
    }
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: "Name or phone are required" });
    }

    await data.query("UPDATE users SET name = $1, phone = $2 WHERE id = $3", [name, phone, userId]);

    return res.status(200).json({ message: "User info updated successfully", name, phone });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const loginForAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { rows: userRows } = await data.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userRows.length === 0) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    const admin = userRows[0];
    if (admin.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Not an admin account." });
    }
    const isPasswordValid = await bcryptJs.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    const token = createToken({ id: admin.id, role: admin.role, name: admin.name, email: admin.email });
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });
    return res.status(200).json({
      message: "Login successful",
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        phone: admin.phone,
        token,
      },
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  sendOTPEmail,
  loginForCustomer,
  signupForCustomer,
  getProfile,
  changeUserInfoForCustomer,
  loginForAdmin,
};
