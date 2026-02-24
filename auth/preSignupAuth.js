const crypto = require('crypto');
const bcryptJs = require('bcryptjs');
const data = require('../data/data');
const { sendMail } = require('../data/mailService');
const { verificationEmailTemplate } = require('../data/emailTemplates');
const { saveOtp, getOtp, deleteOtp } = require('../data/otpStore');

const OTP_EXP_MINUTES = Number(process.env.VERIFICATION_EXPIRY_MINUTES || 5);
const OTP_TTL_MS = OTP_EXP_MINUTES * 60 * 1000;
const RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);

const generateVerificationCode = () => String(crypto.randomInt(100000, 1000000));

const validatePayloadByRole = (payload, role) => {
  if (!payload?.name || !payload?.email || !payload?.password || !payload?.phone) {
    return 'Missing required fields';
  }

  if (role === 'customer') return null;

  const requiredRestaurantFields = [
    'description',
    'location',
    'allowed_radius_km',
    'open_time',
    'close_time',
    'area_name',
    'can_deliver',
    'can_reserve',
    'delivery_area',
  ];

  for (const field of requiredRestaurantFields) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      return `Missing required restaurant field: ${field}`;
    }
  }

  return null;
};

const createCustomerAccount = async (payload) => {
  const { name, email, password, phone } = payload;

  const [exists] = await data.query('SELECT id FROM users WHERE email=? OR phone=?', [email, phone]);
  if (exists.length > 0) {
    throw new Error('User already exists');
  }

  const hashPassword = await bcryptJs.hash(password, 11);
  await data.query(
    'INSERT INTO users (name, email, password, role, phone, is_active) VALUES (?, ?, ?, ?, ?, 1)',
    [name, email, hashPassword, 'customer', phone]
  );
};

const createRestaurantAccount = async (payload) => {
  const connection = await data.getConnection();
  try {
    await connection.beginTransaction();

    const {
      name,
      email,
      password,
      phone,
      description,
      location,
      allowed_radius_km,
      open_time,
      close_time,
      area_name,
      can_deliver,
      can_reserve,
      delivery_area,
    } = payload;

    const [existingRows] = await connection.query('SELECT id FROM users WHERE email=? OR phone=?', [email, phone]);
    if (existingRows.length > 0) {
      throw new Error('User with this email or phone already exists');
    }

    const hashPassword = await bcryptJs.hash(password, 11);
    await connection.query(
      'INSERT INTO users (name,email,password,role,phone,is_active) VALUES (?,?,?,?,?,1)',
      [name, email, hashPassword, 'restaurant', phone]
    );

    const [userRows] = await connection.query('SELECT id FROM users WHERE email=?', [email]);
    const userId = userRows[0].id;

    await connection.query(
      'INSERT INTO restaurant_profiles (user_id,description,location,allowed_radius_km,open_time,close_time) VALUES (?,?,?,?,?,?)',
      [userId, description, location, allowed_radius_km, open_time, close_time]
    );

    const [profileRows] = await connection.query('SELECT id FROM restaurant_profiles WHERE user_id=?', [userId]);
    const restaurantProfileId = profileRows[0].id;

    const polygonString = `POLYGON((${delivery_area.map((coord) => `${coord[0]} ${coord[1]}`).join(', ')}))`;

    await connection.query(
      `INSERT INTO restaurant_delivery_areas
       (restaurant_id, area_name, can_deliver, can_reserve, delivery_area)
       VALUES (?, ?, ?, ?, ST_GeomFromText(?, 4326))`,
      [restaurantProfileId, area_name, can_deliver, can_reserve, polygonString]
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

const sendOtp = async (req, res) => {
  try {
    const { role, signupData } = req.body;

    if (!['customer', 'restaurant'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const validationError = validatePayloadByRole(signupData, role);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const code = generateVerificationCode();

    saveOtp({
      email: signupData.email,
      accountType: role,
      code,
      ttlMs: OTP_TTL_MS,
      signupData,
      resendAvailableAt: Date.now() + RESEND_COOLDOWN_SECONDS * 1000,
    });

    const verificationEmail = verificationEmailTemplate({
      name: signupData.name,
      code,
      expiryMinutes: OTP_EXP_MINUTES,
    });

    await sendMail({
      to: signupData.email,
      subject: verificationEmail.subject,
      text: verificationEmail.text,
      html: verificationEmail.html,
    });

    return res.status(200).json({
      message: 'Verification code sent successfully',
      expiresInSeconds: OTP_EXP_MINUTES * 60,
      resendCooldownSeconds: RESEND_COOLDOWN_SECONDS,
    });
  } catch (err) {
    console.error('sendOtp error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { role, email } = req.body;

    if (!['customer', 'restaurant'].includes(role) || !email) {
      return res.status(400).json({ error: 'Role and email are required' });
    }

    const entry = getOtp({ email, accountType: role });
    if (!entry) {
      return res.status(400).json({ error: 'OTP session expired. Please send a new verification code.' });
    }

    if (entry.resendAvailableAt && entry.resendAvailableAt > Date.now()) {
      const remaining = Math.ceil((entry.resendAvailableAt - Date.now()) / 1000);
      return res.status(429).json({ error: 'Please wait before resending OTP', retryAfterSeconds: remaining });
    }

    const code = generateVerificationCode();

    saveOtp({
      email,
      accountType: role,
      code,
      ttlMs: OTP_TTL_MS,
      signupData: entry.signupData,
      resendAvailableAt: Date.now() + RESEND_COOLDOWN_SECONDS * 1000,
    });

    const verificationEmail = verificationEmailTemplate({
      name: entry.signupData?.name,
      code,
      expiryMinutes: OTP_EXP_MINUTES,
    });

    await sendMail({
      to: email,
      subject: verificationEmail.subject,
      text: verificationEmail.text,
      html: verificationEmail.html,
    });

    return res.status(200).json({
      message: 'Verification code resent successfully',
      expiresInSeconds: OTP_EXP_MINUTES * 60,
      resendCooldownSeconds: RESEND_COOLDOWN_SECONDS,
    });
  } catch (err) {
    console.error('resendOtp error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { role, email, code } = req.body;

    if (!['customer', 'restaurant'].includes(role) || !email || !code) {
      return res.status(400).json({ error: 'Role, email and OTP code are required' });
    }

    const entry = getOtp({ email, accountType: role });
    if (!entry) {
      return res.status(400).json({ error: 'OTP expired or not found. Please resend OTP.' });
    }

    if (String(entry.code) !== String(code)) {
      return res.status(400).json({ error: 'Invalid OTP code' });
    }

    if (!entry.signupData) {
      return res.status(400).json({ error: 'Signup payload expired. Please start again.' });
    }

    if (role === 'customer') {
      await createCustomerAccount(entry.signupData);
    } else {
      await createRestaurantAccount(entry.signupData);
    }

    deleteOtp({ email, accountType: role });

    return res.status(201).json({ message: 'Account created successfully' });
  } catch (err) {
    console.error('verifyOtp error:', err);
    if (err?.message?.includes('exists')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  sendOtp,
  resendOtp,
  verifyOtp,
};
