const data = require("../data/data");
const bcryptJs = require("bcryptjs");
const crypto = require("crypto");
const NodeCache = require("node-cache");
const nodemailer = require("nodemailer");
const { createToken } = require("../middelware/jwtmake");

const otpCache = new NodeCache({ stdTTL: 60, checkperiod: 10 });

async function sendEmail(to, OTP) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "yassefsea274@gmail.com",
      pass: "vjgf odiu nnul krpg",
    },
  });

  await transporter.sendMail({
    from: '"My Shop" <yassefsea274@gmail.com>',
    to,
    subject: "Email Verification",
    text: `Your OTP is: ${OTP}`,
  });
}

const sendOTPEmail = async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email || !phone) {
      return res.status(400).json({ error: "Email and phone are required" });
    }

    const [existing] = await data.query(
      "SELECT id FROM users WHERE email = ? OR phone = ?",
      [email, phone]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: "Email or phone already exists" });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    otpCache.set(email, otp);

    res.status(200).json({ message: "OTP sent to your email successfully" });

    sendEmail(email, otp)
      .then(() => {
        console.log(`OTP ${otp} sent to email: ${email}`);
      })
      .catch(err => {
        console.error("Email sending failed:", err);
      });

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

    if (role === "restaurant") {
      return res.status(400).json({ error: "Invalid role" });
    }

    if (role !== "customer" && role !== "admin") {
      return res.status(400).json({ error: "Invalid role" });
    }

    const storedOtp = otpCache.get(email);
    if (!storedOtp || storedOtp !== otp) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    otpCache.del(email);

    const [userExists] = await data.query(
      "SELECT id FROM users WHERE email=? OR phone=?",
      [email, phone]
    );

    if (userExists.length > 0) {
      return res.status(409).json({ error: "Email or phone already exists" });
    }

    const hashPassword = await bcryptJs.hash(password, 11);

    await data.query(
      "INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)",
      [name, email, hashPassword, role, phone]
    );

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

    const [userRows] = await data.query("SELECT * FROM users WHERE email=?", [email]);

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
    const [userRows] = await data.query("SELECT id,name,email,role,phone FROM users WHERE id=?", [user]);
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

    await data.query("UPDATE users SET name=?, phone=? WHERE id=?", [name, phone, userId]);

    return res.status(200).json({ message: "User info updated successfully", name, phone });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const loginForAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [userRows] = await data.query("SELECT * FROM users WHERE email=?", [email]);
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
