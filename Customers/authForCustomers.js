const data = require("../data/data");
const bcryptJs = require("bcryptjs");
const crypto = require("crypto");
const { Resend } = require("resend");

// ======================================================
// Resend
// ======================================================

const resend = new Resend(process.env.RESEND_API_KEY);

// ======================================================
// In-Memory OTP Store
// No Redis / No Upstash / No external service
// ======================================================

// email -> { hash, expiresAt }
const otpStore = new Map();

// email -> expiresAt
const otpLockStore = new Map();

const OTP_EXPIRE_TIME = 60 * 1000; // 60 seconds
const OTP_LOCK_TIME = 60 * 1000; // 60 seconds

// ======================================================
// Helper: normalize email
// ======================================================

const normalizeEmail = (email) => {
  return String(email).trim().toLowerCase();
};

// ======================================================
// Helper: clean expired OTP data
// ======================================================

const cleanupExpiredOtp = () => {
  const now = Date.now();

  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt <= now) {
      otpStore.delete(email);
    }
  }

  for (const [email, expiresAt] of otpLockStore.entries()) {
    if (expiresAt <= now) {
      otpLockStore.delete(email);
    }
  }
};

// Cleanup every 30 seconds
const cleanupInterval = setInterval(cleanupExpiredOtp, 30 * 1000);

// Prevent the interval from keeping Node.js alive
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

// ======================================================
// Send OTP Email
// ======================================================

const sendEmail = async (email, otp) => {
  try {
    const { data: emailData, error } = await resend.emails.send({
      from: "noreply@httpsfood-front-rho.me",
      to: email,
      subject: "Your Login Code",

      html: `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f5f5f5;
    font-family:Arial,sans-serif;
  "
>

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    style="padding:2rem 0;"
  >
    <tr>
      <td align="center">

        <table
          width="520"
          cellpadding="0"
          cellspacing="0"
          style="
            background:#fff;
            border-radius:16px;
            overflow:hidden;
          "
        >

          <!-- Header -->
          <tr>
            <td
              style="
                background:#E8502A;
                padding:2rem;
                text-align:center;
              "
            >
              <div
                style="
                  font-size:32px;
                  margin-bottom:6px;
                "
              >
                🍕
              </div>

              <div
                style="
                  color:#fff;
                  font-size:22px;
                  font-weight:bold;
                "
              >
                أكلي
              </div>

              <div
                style="
                  color:rgba(255,255,255,0.8);
                  font-size:13px;
                  margin-top:4px;
                "
              >
                اطلب أكلك المفضل
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td
              style="
                padding:2rem;
                text-align:center;
              "
            >

              <p
                style="
                  font-size:16px;
                  color:#111;
                  margin:0 0 8px;
                "
              >
                مرحباً 👋
              </p>

              <p
                style="
                  font-size:14px;
                  color:#666;
                  margin:0 0 1.5rem;
                  line-height:1.7;
                "
              >
                استخدم الكود التالي لتأكيد حسابك.
                <br>
                الكود صالح لمدة
                <strong>دقيقة واحدة</strong>
                فقط.
              </p>

              <!-- OTP -->
              <div
                style="
                  background:#FDF1EE;
                  border-radius:12px;
                  padding:1.25rem;
                  display:inline-block;
                  margin-bottom:1.5rem;
                "
              >

                <div
                  style="
                    font-size:13px;
                    color:#993C1D;
                    margin-bottom:6px;
                    font-weight:bold;
                  "
                >
                  كود التحقق
                </div>

                <div
                  style="
                    font-size:36px;
                    font-weight:bold;
                    color:#E8502A;
                    letter-spacing:10px;
                  "
                >
                  ${otp}
                </div>

              </div>

              <p
                style="
                  font-size:12px;
                  color:#999;
                  line-height:1.7;
                  margin:0;
                "
              >
                إذا لم تطلب هذا الكود،
                يمكنك تجاهل هذا الإيميل بأمان.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td
              style="
                border-top:1px solid #eee;
                padding:1rem 2rem;
                text-align:center;
              "
            >
              <span
                style="
                  font-size:12px;
                  color:#999;
                "
              >
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
    });

    if (error) {
      console.error("Resend Error:", error);
      throw new Error("Failed to send email");
    }

    return emailData;
  } catch (err) {
    console.error("Email Error:", err.message);
    throw err;
  }
};

// ======================================================
// Send OTP
// ======================================================

const sendOTPEmail = async (req, res) => {
  try {
    cleanupExpiredOtp();

    const { email, phone } = req.body;

    if (!email || !phone) {
      return res.status(400).json({
        error: "Email and phone are required",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    // ==================================================
    // Check OTP lock
    // ==================================================

    const lockExpiresAt = otpLockStore.get(normalizedEmail);

    if (lockExpiresAt && lockExpiresAt > Date.now()) {
      return res.status(429).json({
        error: "OTP already sent. Please wait.",
      });
    }

    // Remove expired lock
    if (lockExpiresAt && lockExpiresAt <= Date.now()) {
      otpLockStore.delete(normalizedEmail);
    }

    // ==================================================
    // Check existing user
    // ==================================================

    const { rows: existing } = await data.query(
      "SELECT id FROM users WHERE email = $1 OR phone = $2",
      [normalizedEmail, phone]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: "Email or phone already exists",
      });
    }

    // ==================================================
    // Generate OTP
    // ==================================================

    const otp = crypto.randomInt(100000, 1000000).toString();

    // Hash OTP before storing it
    const hashedOtp = await bcryptJs.hash(otp, 10);

    const expiresAt = Date.now() + OTP_EXPIRE_TIME;

    // ==================================================
    // Store OTP in memory
    // ==================================================

    otpStore.set(normalizedEmail, {
      hash: hashedOtp,
      expiresAt,
    });

    // ==================================================
    // Create resend lock
    // ==================================================

    otpLockStore.set(
      normalizedEmail,
      Date.now() + OTP_LOCK_TIME
    );

    // ==================================================
    // Send email
    // ==================================================

    try {
      await sendEmail(normalizedEmail, otp);
    } catch (emailError) {
      // If email failed, remove stored OTP and lock
      otpStore.delete(normalizedEmail);
      otpLockStore.delete(normalizedEmail);

      throw emailError;
    }

    return res.status(200).json({
      message: "OTP sent to your email successfully",
    });
  } catch (err) {
    console.error("Send OTP Error:", err);

    return res.status(500).json({
      error: "Failed to send OTP",
    });
  }
};

// ======================================================
// Signup
// ======================================================

const signupForCustomer = async (req, res) => {
  try {
    cleanupExpiredOtp();

    const {
      name,
      email,
      password,
      role,
      phone,
      otp,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !phone ||
      !otp
    ) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    // ==================================================
    // Allowed Roles
    // ==================================================

    const ALLOWED_ROLES = [
      "customer",
      "admin",
    ];

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        error: "Invalid role",
      });
    }

    // ==================================================
    // Get stored OTP
    // ==================================================

    const storedOtp = otpStore.get(normalizedEmail);

    if (!storedOtp) {
      return res.status(400).json({
        error: "OTP expired or not found",
      });
    }

    // ==================================================
    // Check expiration
    // ==================================================

    if (storedOtp.expiresAt <= Date.now()) {
      otpStore.delete(normalizedEmail);
      otpLockStore.delete(normalizedEmail);

      return res.status(400).json({
        error: "OTP expired or not found",
      });
    }

    // ==================================================
    // Verify OTP
    // ==================================================

    const isValid = await bcryptJs.compare(
      String(otp),
      storedOtp.hash
    );

    if (!isValid) {
      return res.status(400).json({
        error: "Invalid OTP",
      });
    }

    // ==================================================
    // Delete OTP after successful verification
    // ==================================================

    otpStore.delete(normalizedEmail);
    otpLockStore.delete(normalizedEmail);

    // ==================================================
    // Double-check user existence
    // ==================================================

    const { rows: userExists } = await data.query(
      "SELECT id FROM users WHERE email = $1 OR phone = $2",
      [normalizedEmail, phone]
    );

    if (userExists.length > 0) {
      return res.status(409).json({
        error: "Email or phone already exists",
      });
    }

    // ==================================================
    // Hash Password
    // ==================================================

    const hashPassword = await bcryptJs.hash(
      password,
      11
    );

    // ==================================================
    // Create User
    // ==================================================

    try {
      await data.query(
        `
        INSERT INTO users
        (
          name,
          email,
          password,
          role,
          phone
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          name,
          normalizedEmail,
          hashPassword,
          role,
          phone,
        ]
      );
    } catch (err) {
      if (err.code === "23505") {
        return res.status(409).json({
          error: "Email or phone already exists",
        });
      }

      throw err;
    }

    return res.status(201).json({
      message: "User registered successfully",

      user: {
        name,
        email: normalizedEmail,
        phone,
        role,
      },
    });
  } catch (err) {
    console.error("Signup Error:", err);

    return res.status(500).json({
      error: "Internal server error",
    });
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
