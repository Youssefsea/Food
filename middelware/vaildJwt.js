const jwt = require('jsonwebtoken');
const data = require('../data/data');



const sureToken = (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
console.log('Received token:', token);

    if (!token) {
      return res.status(401).send({ message: 'No token provided' });
    }
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
console.log('Authenticated user:', req.user);
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(401).send({ message: 'Invalid or expired token' });
  }
};


const verifyRoleForRestaurant=async(req,res,next)=>{
  const restaurant=req.user;
    const { rows } = await data.query('SELECT id FROM restaurant_profiles WHERE user_id = $1',[restaurant.id]);
req.user.restaurantProfileId=rows[0]?.id;

  if(rows.length===0){
    return res.status(403).send({message:'Restaurant profile not found'});
  }
    
    if(restaurant.role!=='restaurant'){
    return res.status(403).send({message:'Unauthorized'});
  }
  next();
};


const verifyResturntAreActive=async(req,res,next)=>
{
const restaurantId=req.user.id;

const { rows }=await data.query("SELECT is_verified FROM restaurant_profiles WHERE user_id = $1", [restaurantId]);
if(rows.length===0)
{
    return res.status(400).json({error:"Restaurant profile not found"});
}

const isVerified=rows[0].is_verified;
if(!isVerified)
{
    return res.status(403).json({error:"Restaurant account is not verified"});
}

next();
};


const verifyRoleForCustomer=(req,res,next)=>{
    const customer=req.user;
    if(customer.role!=='customer'){
    return res.status(403).send({message:'Unauthorized'});
  }
  next();
};

const verifyRoleForAdmin=(req,res,next)=>{
    const admin=req.user;
    if(admin.role!=='admin'){
    return res.status(403).send({message:'Unauthorized'});
  }
  next();
};

module.exports = { sureToken, verifyRoleForRestaurant, verifyResturntAreActive, verifyRoleForCustomer, verifyRoleForAdmin };