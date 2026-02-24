const data = require("../data/data");
const bcryptJs = require("bcryptjs");
const crypto = require("crypto");
const { createToken } = require("../middelware/jwtmake");
const { sendMail } = require("../data/mailService");
const { verificationEmailTemplate } = require("../data/emailTemplates");
const { saveOtp, getOtp, deleteOtp } = require("../data/otpStore");

const VERIFICATION_EXPIRY_MINUTES = Number(process.env.VERIFICATION_EXPIRY_MINUTES || 15);
const VERIFICATION_TTL_MS = VERIFICATION_EXPIRY_MINUTES * 60 * 1000;

const generateVerificationCode = () => String(crypto.randomInt(100000, 1000000));

const signupForCustomer = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
if(role==='restaurant')
{

  return res.status(400).json({ error: "Invalid role" });
}


if(role!=='customer' && role!=='admin')
{
    return res.status(400).json({ error: "Invalid role" });
}

    const [userExists] = await data.query(
      "SELECT * FROM users WHERE email=? OR phone=?",
      [email, phone]
    );

    if (userExists.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashPassword = await bcryptJs.hash(password, 11);
    const verificationCode = generateVerificationCode();

    await data.query(
      `INSERT INTO users (name, email, password, role, phone, is_active)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [name, email, hashPassword, role, phone]
    );

    saveOtp({
      email,
      accountType: 'customer',
      code: verificationCode,
      ttlMs: VERIFICATION_TTL_MS,
    });

    const verificationEmail = verificationEmailTemplate({
      name,
      code: verificationCode,
      expiryMinutes: VERIFICATION_EXPIRY_MINUTES,
    });

    await sendMail({
      to: email,
      subject: verificationEmail.subject,
      text: verificationEmail.text,
      html: verificationEmail.html,
    });

    return res.status(201).json({
      message: "User registered successfully. Verification code sent to email.",
      requiresVerification: true,
    });
  } catch (err) {
    console.error("Error:", err);
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
if(user.role!=='customer')
{
    return res.status(403).json({ error: "Access denied. Not a customer account." });
}

if (!user.is_active) {
    return res.status(403).json({
      error: "Account is not verified",
      requiresVerification: true,
    });
}

    const isPasswordValid = await bcryptJs.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid email or password" });
    }


const token = createToken({id: user.id, role: user.role, name: user.name, email: user.email});
console.log("Generated token:", token);

res.cookie('token', token, {
    httpOnly: true,
    secure: true,

    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
});
    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        token: token
      },
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};



const getProfile=async(req,res)=>
    {

    try{
        const user=req.user.id;
        const [userRows]=await data.query("SELECT id,name,email,role,phone FROM users WHERE id=?", [user]);
        if(userRows.length===0)
        {
            return res.status(404).json({error:"User not found"});
        }
        

        return res.status(200).json({user:userRows[0]});
    }
    catch(err)
    {
        console.error("Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};


const changeUserInfoForCustomer=async(req,res)=>
{
try
{
    const userId=req.user.id;
    if(req.user.role !== 'customer')
    {
        return  res.status(403).json({error:"Access denied. Only customers can change their info."});
    }
    const {name,phone}=req.body;

if(!name || !phone)
{
    return res.status(400).json({error:"Name or phone are required"});
}


    await data.query("UPDATE users SET name=?, phone=? WHERE id=?", [name, phone, userId]);
    console.log(`User info updated for user ID ${userId}: name=${name}, phone=${phone}`);

    return res.status(200).json({message:"User info updated successfully", name, phone });

}
catch(err)
{
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });


}
};

const verifyCustomerAccount = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and verification code are required" });
    }

    const [rows] = await data.query(
      `SELECT id, is_active
       FROM users
       WHERE email = ? AND role = 'customer'`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    const user = rows[0];

    if (user.is_active) {
      return res.status(200).json({ message: "Account already verified" });
    }

    const otpEntry = getOtp({ email, accountType: 'customer' });
    if (!otpEntry) {
      return res.status(400).json({ error: "Verification code has expired or not found" });
    }

    if (otpEntry.code !== String(code)) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    await data.query(
      `UPDATE users
       SET is_active = 1
       WHERE id = ?`,
      [user.id]
    );

    deleteOtp({ email, accountType: 'customer' });

    return res.status(200).json({ message: "Account verified successfully" });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const loginForAdmin=async(req,res)=>
{
  try
  {

    const {email,password}=req.body;

    const [userRows]=await data.query("SELECT * FROM users WHERE email=?", [email]);
    if(userRows.length===0)
    {
        return res.status(400).json({error:"Invalid email or password"});
    }
    const admin=userRows[0];
    if(admin.role!=='admin')
    {
        return res.status(403).json({error:"Access denied. Not an admin account."});
    }
    const isPasswordValid=await bcryptJs.compare(password,admin.password);
    if(!isPasswordValid)
    {
        return res.status(400).json({error:"Invalid email or password"});
    }
    const token=createToken({id:admin.id,role:admin.role,name:admin.name,email:admin.email});
res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
});
    return res.status(200).json({
        message: "Login successful",
        user: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            phone: admin.phone,
            token: token
        }
    });
  }catch(err)
  {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { loginForCustomer, signupForCustomer, verifyCustomerAccount, getProfile, changeUserInfoForCustomer, loginForAdmin };
