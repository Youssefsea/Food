const data=require("../data/data");
const bcryptJs=require("bcryptjs");
const {createToken}=require("../middelware/jwtmake");

const AddInfoRestaurant=async(req,res)=>
{
try
{

const {name,email,password,phone,description,location,allowed_radius_km,open_time,close_time,area_name,can_deliver,can_reserve,delivery_area}=req.body;
const [existingRows]=await data.query("SELECT * FROM users WHERE email=?  or phone=?", [email,phone]);
if(existingRows.length>0)
{
    return res.status(400).json({error:"User with this email or phone already exists"});
}
const role='restaurant';
const hashPassword=await bcryptJs.hash(password,11);
await data.query("INSERT INTO users (name,email,password,role,phone) VALUES (?,?,?,?,?)",[name,email,hashPassword,role,phone]);

const userId= await data.query("SELECT id FROM users WHERE email=?", [email]);
await data.query("INSERT INTO restaurant_profiles (user_id,description,location,allowed_radius_km,open_time,close_time) VALUES (?,?,?,?,?,?)",[userId[0][0].id,description,location,allowed_radius_km,open_time,close_time]);

const restaurantProfileId= await data.query("SELECT id FROM restaurant_profiles WHERE user_id=?", [userId[0][0].id]);

const polygonString = `POLYGON((${delivery_area
  .map(coord => `${coord[0]} ${coord[1]}`)
  .join(", ")}))`;

await data.query(
  `INSERT INTO restaurant_delivery_areas
   (restaurant_id, area_name, can_deliver, can_reserve, delivery_area)
   VALUES (?, ?, ?, ?, ST_GeomFromText(?, 4326))`,
  [
    restaurantProfileId[0][0].id,
    area_name,
    can_deliver,
    can_reserve,
    polygonString
  ]
);

return res.status(201).json({message:"Restaurant registered successfully"});

}
catch(err)
{
    console.error("Error:",err);
    return res.status(500).json({error:"Internal server error"});

}

};

const loginForRestaurant=async(req,res)=>
{
try
{
const {email,password}=req.body;

const [userRows]=await data.query("SELECT * FROM users WHERE email=?", [email]);
if(userRows.length===0)
{
    return res.status(400).json({error:"Invalid email or password"});
}
const restaurant=userRows[0];
if(restaurant.role!=='restaurant')
{
    return res.status(403).json({error:"Access denied. Not a restaurant account."});
}
const isPasswordValid=await bcryptJs.compare(password,restaurant.password);
if(!isPasswordValid)
{
    return res.status(400).json({error:"Invalid email or password"});
}

const token=createToken({id:restaurant.id,role:restaurant.role,name:restaurant.name,email:restaurant.email});

res.cookie('token',token,{
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
});

return res.status(200).json({
    message:"Login successful",
    restaurant:{
        id:restaurant.id,
        name:restaurant.name,
        email:restaurant.email,
        role:restaurant.role,
        phone:restaurant.phone,
        token
    }
});
}
catch(err)
{
    console.error("Error:",err);
    return res.status(500).json({error:"Internal server error"});
}
};

const restaurantProfile=async(req,res)=>
{
try
{
const restaurantId=req.user.restaurantProfileId;
const [restaurantRows]=await data.query("SELECT * FROM restaurant_profiles WHERE id=?", [restaurantId]);
if(restaurantRows.length===0)
{
    return res.status(400).json({error:"Restaurant profile not found"});
}

const restaurantProfile=restaurantRows[0];
const dishesRows=await data.query("SELECT * FROM dishes WHERE restaurant_id=?", [restaurantId]);

const resMoreInfo= await data.query("SELECT name,email,phone,(SELECT delivery_fees FROM restaurant_profiles WHERE user_id=?) as delivery_fees FROM users WHERE id=?", [restaurantProfile.user_id,restaurantProfile.user_id]);

restaurantProfile.name=resMoreInfo[0][0].name;
restaurantProfile.email=resMoreInfo[0][0].email;
restaurantProfile.phone=resMoreInfo[0][0].phone;
restaurantProfile.delivery_fees=resMoreInfo[0][0].delivery_fees;

return res.status(200).json({"restaurantProfile":{
    name:restaurantProfile.name,email:restaurantProfile.email,phone:restaurantProfile.phone,description:restaurantProfile.description,location:restaurantProfile.location,allowed_radius_km:restaurantProfile.allowed_radius_km,open_time:restaurantProfile.open_time,close_time:restaurantProfile.close_time,delivery_fees:restaurantProfile.delivery_fees},"dishes":dishesRows[0]});

}
catch(err)
{
    console.error("Error:",err);
    return res.status(500).json({error:"Internal server error"});
}

}

const changeResturantinfo=async(req,res)=>
{
    const connection = await data.getConnection();
try
{
    await connection.beginTransaction();
    const restaurantId=req.user.restaurantProfileId;
    const {description,location,allowed_radius_km,open_time,close_time,name,email,phone,delivery_fees}=req.body;
    const [existingRows]=await connection.query("SELECT id FROM users WHERE (email = ? OR phone = ?) AND id <> (SELECT user_id FROM restaurant_profiles WHERE id = ?)", [email,phone,restaurantId]);
    if(existingRows.length>0)
    {
        return res.status(400).json({error:"Another user with this email or phone already exists"});
    }

    await connection.query("UPDATE restaurant_profiles SET description=?, location=?, allowed_radius_km=?, open_time=?, close_time=? , delivery_fees=? WHERE id=?", [description,location,allowed_radius_km,open_time,close_time,delivery_fees,restaurantId]);
    await connection.query("UPDATE users SET name=?, email=?, phone=? WHERE id=(SELECT user_id FROM restaurant_profiles WHERE id=?)", [name,email,phone,restaurantId]);

    await connection.commit();

    return res.status(200).json({message:"Restaurant information updated successfully"});

}
catch(err)
{
    console.error("Error:",err);
    await connection.rollback();
    return res.status(500).json({error:"Internal server error"});   
}};

const updateRestaurantLocation = async (req, res) => {
  const connection = await data.getConnection();
  try {
    await connection.beginTransaction();
    
    const restaurantId = req.user.restaurantProfileId;
    const {
      allowed_radius_km, 
      delivery_area, 
      area_name, 
      can_deliver, 
      can_reserve ,
      location
    } = req.body;
    
    await connection.query(
      "UPDATE restaurant_profiles SET location = ?, allowed_radius_km = ? WHERE id = ?",
      [location, allowed_radius_km, restaurantId]
    );
    
    const polygonString = `POLYGON((${delivery_area
      .map(coord => `${coord[0]} ${coord[1]}`)
      .join(", ")}))`;
    
    await connection.query(
      "DELETE FROM restaurant_delivery_areas WHERE restaurant_id = ?",
      [restaurantId]
    );
    
    await connection.query(
      `INSERT INTO restaurant_delivery_areas
       (restaurant_id, area_name, can_deliver, can_reserve, delivery_area)
       VALUES (?, ?, ?, ?, ST_GeomFromText(?, 4326))`,
      [restaurantId, area_name, can_deliver, can_reserve, polygonString]
    );
    
    await connection.commit();
    
    return res.status(200).json({ 
      message: "Location and delivery area updated successfully" 
    });
    
  } catch (err) {
    console.error("Error updating location:", err);
    await connection.rollback();
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    connection.release();
  }
};

const changeRestaurantPassword = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantProfileId;
    const { oldPassword, newPassword } = req.body;
    const [userRows] = await data.query("SELECT u.password FROM users u JOIN restaurant_profiles rp ON u.id=rp.user_id WHERE rp.id=?", [restaurantId]);
    if (userRows.length === 0) {
      return res.status(400).json({ error: "Restaurant profile not found" });
    }
const restaurantPassword=userRows[0].password;
const isOldPasswordValid=await bcryptJs.compare(oldPassword,restaurantPassword);
if(!isOldPasswordValid)
{
    return res.status(400).json({error:"Old password is incorrect"});
}

const hashNewPassword=await bcryptJs.hash(newPassword,11);
await data.query("UPDATE users SET password=? WHERE id=(SELECT user_id FROM restaurant_profiles WHERE id=?)", [hashNewPassword,restaurantId]);
return res.status(200).json({message:"Password updated successfully"});

    }
    catch(err)
    {
        console.error("Error:",err);
        return res.status(500).json({error:"Internal server error"});
    }
}

const changeDeliveryFee=async(req,res)=>
{
try
{
    const restaurantId=req.user.restaurantProfileId;
    const {delivery_fees}=req.body;

    await data.query("UPDATE restaurant_profiles SET delivery_fees=? WHERE id=?", [delivery_fees, restaurantId]);

    return res.status(200).json({message:"Delivery fees updated successfully"});

}
catch(err)
{
    console.error("Error:",err);
    return res.status(500).json({error:"Internal server error"});   
}

}

const restaurantProfileStatus=async(req,res)=>
{
try
{
    const restaurantId=req.user.restaurantProfileId;
    const [statuOfRes]=await data.query("SELECT is_open FROM restaurant_profiles WHERE id=?", [restaurantId]);
    if(statuOfRes.length===0)
    {
        return res.status(400).json({error:"Restaurant profile not found"});
    }
    const statu=statuOfRes[0].is_open;

    return res.status(200).json({is_open:statu});
}
catch(err)
{
    console.error("Error:",err);
    return res.status(500).json({error:"Internal server error"});   

};}

const openOrCloseRestaurant=async(req,res)=>
{
try{

const restaurantId=req.user.restaurantProfileId;
const statuOfRes=await data.query("SELECT is_open FROM restaurant_profiles WHERE id=?", [restaurantId]);
if(statuOfRes.length===0)
{
    return res.status(400).json({error:"Restaurant profile not found"});

}
const statu=statuOfRes[0][0].is_open;
let  newStatu=statu;
if(statu==1)
{
    newStatu=0;
}
else if(statu==0)
{
    newStatu=1;
}
await data.query("UPDATE restaurant_profiles SET is_open=? WHERE id=?", [newStatu, restaurantId]);
return res.status(200).json({message:"Restaurant status updated successfully", is_open:newStatu});
}
catch(err)
{
    console.error("Error:",err);
    return res.status(500).json({error:"Internal server error"});
}
}

const getDashboardStats = async (req, res) => {
    try {
        const restaurantId = req.user.restaurantProfileId;
        const [restaurantInfo] = await data.query(
            `SELECT rp.*, u.name, u.email, u.phone 
             FROM restaurant_profiles rp
             JOIN users u ON rp.user_id = u.id
             WHERE rp.id = ?`,
            [restaurantId]
        );

        if (restaurantInfo.length === 0) {
            return res.status(404).json({ error: "Restaurant not found" });
        }

        const [dishesCount] = await data.query("SELECT COUNT(*) as total_dishes FROM dishes WHERE restaurant_id = ?", [restaurantId]);
        const [availableDishes] = await data.query("SELECT COUNT(*) as available_dishes FROM dishes WHERE restaurant_id = ? AND is_available = 1", [restaurantId]);
        const [todayOrders] = await data.query(`SELECT COUNT(*) as today_orders, COALESCE(SUM(total_amount), 0) as today_revenue FROM orders WHERE restaurant_id = ? AND DATE(created_at) = CURDATE()`, [restaurantId]);
        const [pendingOrders] = await data.query("SELECT COUNT(*) as pending_orders FROM orders WHERE restaurant_id = ? AND status = 'pending'", [restaurantId]);
        const [totalOrders] = await data.query(`SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue FROM orders WHERE restaurant_id = ?`, [restaurantId]);
        const [recentOrders] = await data.query(`SELECT o.id, o.total_amount, o.status, o.created_at, u.name as customer_name, u.phone as customer_phone FROM orders o JOIN users u ON o.user_id = u.id WHERE o.restaurant_id = ? ORDER BY o.created_at DESC LIMIT 10`, [restaurantId]);
        const [topDishes] = await data.query(`SELECT d.id, d.name, d.price, d.image, COUNT(oi.id) as order_count, SUM(oi.quantity) as total_quantity, SUM(oi.quantity * oi.price) as total_revenue FROM dishes d LEFT JOIN order_items oi ON d.id = oi.dish_id WHERE d.restaurant_id = ? GROUP BY d.id ORDER BY total_quantity DESC LIMIT 5`, [restaurantId]);

        return res.status(200).json({
            restaurant: restaurantInfo[0],
            stats: {
                dishes: { total: dishesCount[0].total_dishes, available: availableDishes[0].available_dishes },
                orders: { today: todayOrders[0].today_orders, pending: pendingOrders[0].pending_orders, total: totalOrders[0].total_orders },
                revenue: { today: parseFloat(todayOrders[0].today_revenue), total: parseFloat(totalOrders[0].total_revenue) }
            },
            recentOrders,
            topDishes
        });

    } catch (err) {
        console.error("Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const getRestaurantOrders = async (req, res) => {
    try {
        const restaurantId = req.user.restaurantProfileId;
        const { status, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT o.id, o.total_amount, o.delivery_fee, o.status, 
                   o.is_reservation, o.reservation_date, o.location,
                   o.created_at,o.lat, o.lng,p.status as payment_status,
                   u.name as customer_name, u.phone as customer_phone, u.email as customer_email
            FROM orders o
            JOIN payments p ON o.id = p.order_id
            JOIN users u ON o.user_id = u.id
            WHERE o.restaurant_id = ?
        `;

        const params = [restaurantId];

        if (status) {
            query += ` AND o.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [orders] = await data.query(query, params);

        for (let order of orders) {
            const [items] = await data.query(
                `SELECT oi.*, d.name as dish_name, d.image as dish_image
                 FROM order_items oi
                 JOIN dishes d ON oi.dish_id = d.id
                 WHERE oi.order_id = ?`,
                [order.id]
            );
            order.items = items;
        }

        return res.status(200).json({ orders });

    } catch (err) {
        console.error("Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const restaurantId = req.user.restaurantProfileId;
        const { orderId, status } = req.body;

        const validStatuses = ['pending','paid','cooking','delivering','completed','cancelled'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const [orderCheck] = await data.query("SELECT id FROM orders WHERE id = ? AND restaurant_id = ?", [orderId, restaurantId]);

        if (orderCheck.length === 0) {
            return res.status(404).json({ error: "Order not found" });
        }

        await data.query("UPDATE orders SET status = ? WHERE id = ?", [status, orderId]);

        return res.status(200).json({ message: "Order status updated successfully" });

    } catch (err) {
        console.error("Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports={changeRestaurantPassword,AddInfoRestaurant,loginForRestaurant,restaurantProfile,changeResturantinfo,openOrCloseRestaurant,changeDeliveryFee,getDashboardStats,getRestaurantOrders,updateOrderStatus,updateRestaurantLocation,restaurantProfileStatus};
