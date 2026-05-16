const data=require('../data/data');
const axios = require('axios');
const { sendMail } = require('../data/mailService');
const { bookingCustomerTemplate, bookingRestaurantTemplate } = require('../data/emailTemplates');

const sendBookingEmailsForOrder = async ({ orderId, customerId, restaurantId, reservationDate }) => {
  try {
    const { rows: orderItems } = await data.query(
      `SELECT oi.quantity, d.name AS dish_name
       FROM order_items oi
       JOIN dishes d ON d.id = oi.dish_id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    const { rows: customerRows } = await data.query(
      'SELECT name, email FROM users WHERE id = $1',
      [customerId]
    );

    const { rows: restaurantRows } = await data.query(
      `SELECT u.name, u.email
       FROM restaurant_profiles rp
       JOIN users u ON u.id = rp.user_id
       WHERE rp.id = $1`,
      [restaurantId]
    );

    if (!customerRows.length || !restaurantRows.length || !orderItems.length) {
      return;
    }

    const customer = customerRows[0];
    const restaurant = restaurantRows[0];
    const dishLines = orderItems.map((i) => `- ${i.dish_name} x${i.quantity}`).join('\n');

    const customerEmail = bookingCustomerTemplate({
      customerName: customer.name,
      dishLines,
      reservationDate,
    });

    const restaurantEmail = bookingRestaurantTemplate({
      restaurantName: restaurant.name,
      customerName: customer.name,
      dishLines,
      reservationDate,
    });

    await Promise.all([
      sendMail({
        to: customer.email,
        subject: customerEmail.subject,
        text: customerEmail.text,
        html: customerEmail.html,
      }),
      sendMail({
        to: restaurant.email,
        subject: restaurantEmail.subject,
        text: restaurantEmail.text,
        html: restaurantEmail.html,
      }),
    ]);
  } catch (err) {
    console.error('Failed to send booking emails:', err.message);
  }
};

const latLngToAddressOSM = async (lat, lng) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "NodeJS-App" }
    });
    return response.data.display_name;
  } catch (error) {
    console.error(error);
    return "Error fetching address";
  }
};

const lookForNearRestaurants = async (req, res) => {
  try {
    const { lat, lng } = req.body;

   if(lat == null || lng == null){
      return res.status(400).json({ error: "lat & lng required" });
    }

const userPoint = `POINT(${lng} ${lat})`;

const { rows } = await data.query(
  `SELECT id AS area_id, restaurant_id
   FROM restaurant_delivery_areas
   WHERE ST_Intersects(
     delivery_area,
     ST_GeomFromText($1, 4326)
   )`,
  [userPoint]
);

    if (rows.length === 0) {
      return res.status(400).json({ message: "No nearby restaurants found" });
    }

    const restaurantIds = rows.map(r => r.restaurant_id);
if (!restaurantIds.length) {
  return res.status(400).json({ error: "No nearby restaurants found" });
}

    const restaurantPlaceholders = restaurantIds.map((_, i) => `$${i + 1}`).join(',');
    const { rows: restaurants } = await data.query(
      `SELECT id, description, location
       FROM restaurant_profiles
       WHERE id IN (${restaurantPlaceholders})`,
      restaurantIds
    );

    const result = rows.map(area => {
      const info = restaurants.find(r => r.id === area.restaurant_id);
      return {
           id: area.restaurant_id,
        area_id: area.area_id,
        restaurant_id: area.restaurant_id,
        description: info?.description,
        location: info?.location
      };
    });

    return res.status(200).json({
      count: result.length,
      nearby_restaurants: result
    });

  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const lookForResByName=async(req,res)=>
{
  try
  {

    const {name}=req.query;
    if(!name)
    {
        return res.status(400).json({error:"Name query parameter is required"});
    }

    const { rows: restaurants } = await data.query(
      `SELECT u.id as user_id,u.phone as phone, u.name AS restaurant_name,rp.id as id, rp.description, rp.location, rp.delivery_fees, rp.is_open, rda.can_deliver, rda.can_reserve
       FROM users u
       INNER JOIN restaurant_profiles rp ON u.id = rp.user_id
       INNER JOIN restaurant_delivery_areas rda ON rp.id = rda.restaurant_id
       WHERE u.name LIKE $1`,
      [`%${name}%`]
    );



    if (restaurants.length === 0) {
      return res.status(404).json({ message: "No restaurants found" });
    }

    return res.status(200).json({ restaurant: restaurants[0] });
  }
  catch(err)
  {
    console.error("Error:",err);
    return res.status(500).json({error:"Internal server error"});
  }
}


const lookforAllRestaurants=async(req,res)=>
{
try
{
// const { rows: restaurants }=await data.query("SELECT id,description,location,can_reserve,can_deliver FROM restaurant_profiles inner join restaurant_delivery_areas ON restaurant_profiles.id = restaurant_delivery_areas.restaurant_id WHERE is_open = true");

const { rows: restaurants } = await data.query(`
 SELECT DISTINCT
  rp.id,
  rp.user_id,
  u.name AS restaurant_name,
  rp.description,
  rp.location,
  rp.delivery_fees,
  rda.can_deliver,
  rda.can_reserve,
  rda.delivery_area
FROM restaurant_profiles rp
INNER JOIN restaurant_delivery_areas rda
  ON rp.id = rda.restaurant_id
INNER JOIN users u
  ON rp.user_id = u.id
WHERE rp.is_open = true

`);


if(restaurants.length===0)
{
    return res.status(404).json({error:"No restaurants found"});
}
console.log("Restaurants found:", restaurants);
return res.status(200).json({restaurants});
}

catch(err)
{
    console.error("Error:",err);
    return res.status(500).json({error:"Internal server error"});
}
};

const restaurantsWhoCanResiveOrder=async(req,res)=>
{
try
{

const { rows: restaurantIds }=await data.query('SELECT restaurant_id FROM restaurant_delivery_areas WHERE can_reserve = true');



if(restaurantIds.length>0)
{
const ids=restaurantIds.map(r=>r.restaurant_id);
if (!ids.length) {
  return res.status(400).json({ error: "No restaurants found in cart" });
}

const idPlaceholders = ids.map((_, i) => `$${i + 1}`).join(',');
const { rows: restaurants }=await data.query(`SELECT description, location FROM restaurant_profiles WHERE id IN (${idPlaceholders})`, ids);

return res.status(200).json({ restaurants });
}
else
{
return res.status(404).json({error:"No restaurant available to receive orders"});
}
}catch(err)
{
    console.error("Error:",err);
    return res.status(500).json({error:"Internal server error"});
}

}



const addDishToCart=async(req,res)=>
{
try{

const customerId=req.user.id;
const {dishId,quantity}=req.body;

const { rows: dishAvailability }=await data.query("SELECT is_available FROM dishes WHERE id = $1", [dishId]);
if(dishAvailability.length===0)
{
    return res.status(400).json({error:"Dish not found"});
}
if(!dishAvailability[0].is_available)
{
    return res.status(400).json({error:"Dish is not available"});
}

const { rows: exitCart }=await data.query("SELECT id FROM carts WHERE user_id = $1", [customerId]);
if(exitCart.length===0)
{
    const newCart=await data.query("INSERT INTO carts (user_id) VALUES ($1) RETURNING id",[customerId]);
    const cartId=newCart.rows[0].id;
    await data.query("INSERT INTO cart_items (cart_id, dish_id, quantity) VALUES ($1, $2, $3)",[cartId,dishId,quantity]);
    console.log("New cart created with ID:", cartId);
    return res.status(201).json({message:"Dish added to cart successfully"});
}

else if(exitCart.length>0)
{
    await data.query('UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',[exitCart[0].id]);
    const { rows: exitItem }=await data.query("SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND dish_id = $2", [exitCart[0].id,dishId]);
if(exitItem.length===0)
{
    await data.query("INSERT INTO cart_items (cart_id, dish_id, quantity) VALUES ($1, $2, $3)",[exitCart[0].id,dishId,quantity]);
    return res.status(201).json({message:"Dish added to cart successfully"});

}

else if(exitItem.length>0)
{
    const newQuantity=exitItem[0].quantity+quantity;
    await data.query("UPDATE cart_items SET quantity = $1 WHERE id = $2", [newQuantity,exitItem[0].id]);
    return res.status(200).json({message:"Dish quantity updated in cart successfully"});
}



}

}catch(err)
{
    console.error("Error:",err);
    return res.status(500).json({error:"Internal server error"});
}

};

const updateDishQuantityInCart=async(req,res)=>
{
try
{
    const customerId=req.user.id;
    const {dishId,quantity}=req.body;
    const { rows: exitCart }=await data.query("SELECT id FROM carts WHERE user_id = $1", [customerId]);
    if(exitCart.length===0)
    {
        return res.status(400).json({error:"Cart not found"});
    }

    const { rows: exitItem }=await data.query("SELECT id FROM cart_items WHERE cart_id = $1 AND dish_id = $2", [exitCart[0].id,dishId]);
    if(exitItem.length===0)
    {
        return res.status(400).json({error:"Dish not found in cart"});
    }

    await data.query("UPDATE cart_items SET quantity = $1 WHERE id = $2", [quantity, exitItem[0].id]);
    return res.status(200).json({message:"Dish quantity updated in cart successfully"});

}
catch(err)
{
    console.error("Error:",err);
    return res.status(500).json({error:"Internal server error"});

}
};

const deleteDishFromCart=async(req,res)=>
{
try
{

    const customerId=req.user.id;
    const {dishId}=req.body;

    const { rows: exitCart }=await data.query("SELECT id FROM carts WHERE user_id = $1", [customerId]);
    if(exitCart.length===0)
    {
        return res.status(400).json({error:"Cart not found"});
    }

    const { rows: exitItem }=await data.query("SELECT id FROM cart_items WHERE cart_id = $1 AND dish_id = $2", [exitCart[0].id,dishId]);
    if(exitItem.length===0)
    {
        return res.status(400).json({error:"Dish not found in cart"});
    }

    await data.query("DELETE FROM cart_items WHERE id = $1", [exitItem[0].id]);
    return res.status(200).json({message:"Dish removed from cart successfully"});

}catch(err)
{
    console.error("Error:",err);
    return res.status(500).json({error:"Internal server error"});


}


};


const getCartDetails = async (req, res) => {
  try {
    const customerId = req.user.id;

    const { rows: existCart } = await data.query(
      "SELECT id FROM carts WHERE user_id = $1",
      [customerId]
    );

    if (existCart.length === 0) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const cartId = existCart[0].id;
    console.log("Cart ID:", cartId);
    const { rows: cartItems } = await data.query(
      "SELECT dish_id, quantity FROM cart_items WHERE cart_id = $1",
      [cartId]
    );
    console.log("Cart Items:", cartItems);

    if (cartItems.length === 0) {
      console.log("Cart is empty");
      return res.status(200).json({
        cartItems: [],
        groupedByRestaurant: [],
        summary: {
          totalRestaurants: 0,
          totalItems: 0,
          grandTotal: 0
        }
      });
    }

    const dishIds = cartItems.map(i => Number(i.dish_id));
    console.log("Dish IDs in cart:", dishIds);

    const placeholders = dishIds.map((_, i) => `$${i + 1}`).join(",");

    const { rows: dishes } = await data.query(
      'SELECT d.id,d.image,d.name,d.description,d.price,d.restaurant_id,rp.location as location,rp.delivery_fees,rda.can_reserve,rda.can_deliver, rp.user_id as restaurant_user_id, u.name as restaurant_name from dishes d inner join restaurant_delivery_areas as rda on d.restaurant_id = rda.restaurant_id inner join restaurant_profiles rp on d.restaurant_id = rp.id inner join users u on rp.user_id = u.id where d.id IN (' + placeholders + ')',
      dishIds
    );

    console.log("Dishes fetched:", dishes);

    const detailedCartItems = cartItems
      .map(item => {
        const dish = dishes.find(d => d.id === item.dish_id);

        if (!dish) return null;
const deliveryFee = dish.delivery_fees;
        return {
          dishId: item.dish_id,
          quantity: item.quantity,
          image: dish.image,
          name: dish.name,
          description: dish.description,
          price: dish.price,
          restaurantId: dish.restaurant_id,
          restaurantName: dish.restaurant_name,
          restaurantLocation: dish.location,
          restaurantCanReserve: dish.can_reserve,
          restaurantCanDeliver: dish.can_deliver,
          is_open: dish.is_open,
          deliveryFee: dish.delivery_fees,

          subtotal: dish.price * item.quantity
        };
      })
      .filter(Boolean);



    const groupedByRestaurant = detailedCartItems.reduce((acc, item) => {
      let restaurant = acc.find(
        r => r.restaurantId === item.restaurantId
      );

      if (!restaurant) {
        restaurant = {
          restaurantId: item.restaurantId,
          restaurantName: item.restaurantName,
          restaurantCanReserve: item.restaurantCanReserve,
          restaurantCanDeliver: item.restaurantCanDeliver,
          restaurantLocation: item.restaurantLocation,
          deliveryFee: item.deliveryFee,
          dishes: [],
          totalItems: 0,
          totalPrice: 0
        };

        acc.push(restaurant);
      }

      restaurant.dishes.push({

        dishId: item.dishId,
        image: item.image,
        quantity: item.quantity,
        name: item.name,
        description: item.description,
        price: item.price,
        subtotal: item.subtotal
      });

      restaurant.totalItems += item.quantity;
      restaurant.totalPrice += item.subtotal;

      return acc;
    }, []);

    for (let i = 0; i < groupedByRestaurant.length; i++) {
      const restaurantId = groupedByRestaurant[i].restaurantId;

      const { rows: deliveryAreas } = await data.query(
        "SELECT ST_AsGeoJSON(delivery_area) AS area FROM restaurant_delivery_areas WHERE restaurant_id = $1",
        [restaurantId]
      );

      let restaurantLat = null, restaurantLng = null;
      if (deliveryAreas.length > 0) {
        const geoJson = JSON.parse(deliveryAreas[0].area);
        const points = geoJson.coordinates[0] || [];
        let sumLat = 0, sumLng = 0;

        points.forEach(p => {
          sumLng += p[0];
          sumLat += p[1];
        });

        if (points.length > 0) {
          restaurantLng = sumLng / points.length;
          restaurantLat = sumLat / points.length;
        }
      }

      groupedByRestaurant[i] = {
        ...groupedByRestaurant[i],
        restaurantLat,
        restaurantLng
      };
    }

    const grandTotal = groupedByRestaurant.reduce(
      (sum, r) => sum + r.totalPrice,
      0
    );

    const totalItems = groupedByRestaurant.reduce(
      (sum, r) => sum + r.totalItems,
      0
    );

    return res.status(200).json({
      cartItems: detailedCartItems,
      groupedByRestaurant,
      summary: {
        totalRestaurants: groupedByRestaurant.length,
        totalItems,
        grandTotal
      }
    });

  } catch (err) {
    console.error("getCartDetails error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};


const countAtCart=async(req,res)=>
  {
try{
const customerId=req.user.id;
const { rows: existCart }=await data.query("SELECT id FROM carts WHERE user_id = $1", [customerId]);
if(existCart.length===0){
    return res.status(400).json({error:"Cart not found"});
}

const cartId=existCart[0].id;
const { rows: cartItems }=await data.query("SELECT dish_id, quantity FROM cart_items WHERE cart_id = $1", [cartId]);
if(cartItems.length===0){
    return res.status(400).json({error:"Cart is empty"});
}

const count=cartItems.reduce((sum,item)=>sum+item.quantity,0);
return res.status(200).json({count});

}
catch(err)
{
  console.error("Error:",err);
  return res.status(500).json({error:"Internal server error"});
}

  }






const makeOrder = async (req, res) => {
  const client = await data.connect();

  try {
    await client.query('BEGIN');

    const customerId = req.user.id;
    const { is_reservation, reservation_date, lat, lng, restaurantId } = req.body;
    const location = await latLngToAddressOSM(lat, lng);

    const { rows: cartRows } = await client.query("SELECT id FROM carts WHERE user_id = $1", [customerId]);

    if (cartRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Cart not found" });
    }

    const cartId = cartRows[0].id;

    let cartItemsQuery = `
      SELECT ci.dish_id, ci.quantity, d.price, d.restaurant_id, r.location as restaurant_location
      FROM cart_items ci
      JOIN dishes d ON ci.dish_id = d.id
      JOIN restaurant_profiles r ON d.restaurant_id = r.id
      WHERE ci.cart_id = $1
    `;

    const queryParams = [cartId];

    if (restaurantId) {
      cartItemsQuery += ` AND d.restaurant_id = $2`;
      queryParams.push(restaurantId);
    }

    const { rows: cartItems } = await client.query(cartItemsQuery, queryParams);

    if (cartItems.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Cart is empty or no items from selected restaurant" });
    }

    const groupOfResCartDishes = {};
    for (const item of cartItems) {
      if (!groupOfResCartDishes[item.restaurant_id]) {
        groupOfResCartDishes[item.restaurant_id] = [];
      }
      groupOfResCartDishes[item.restaurant_id].push(item);
    }

    const { rows: restaurantCanResvRows } = await client.query('SELECT restaurant_id FROM restaurant_delivery_areas WHERE can_reserve = true');
    if (restaurantCanResvRows.length === 0 && is_reservation) {
      throw new Error("No restaurant available to receive reservations");
    }

    const createdOrders = [];
    const failedOrders = [];
    const orderedDishIds = [];

    for (const resId of Object.keys(groupOfResCartDishes)) {
      try {
        const { rows: resRows } = await client.query(
          "SELECT is_open, location, allowed_radius_km, delivery_fees FROM restaurant_profiles WHERE id = $1",
          [resId]
        );

        if (resRows.length === 0 || !resRows[0].is_open) {
          failedOrders.push({
            restaurantId: resId,
            reason: "Restaurant is closed"
          });
          continue;
        }

        const { rows: deliveryareas } = await client.query(
          "SELECT ST_AsGeoJSON(delivery_area) AS area FROM restaurant_delivery_areas WHERE restaurant_id = $1",
          [resId]
        );

        if (deliveryareas.length === 0) {
          failedOrders.push({
            restaurantId: resId,
            reason: "Restaurant has no delivery areas defined"
          });
          continue;
        }

        const geoJson = JSON.parse(deliveryareas[0].area);
        const points = geoJson.coordinates[0] || [];
        let sumLat = 0, sumLng = 0;

        points.forEach(p => {
          sumLng += p[0];
          sumLat += p[1];
        });

        if (points.length === 0) {
          failedOrders.push({
            restaurantId: resId,
            reason: "Restaurant has invalid delivery area geometry"
          });
          continue;
        }

        const lngOfRes = sumLng / points.length;
        const latOfRes = sumLat / points.length;

        let totalAmount = 0;
        groupOfResCartDishes[resId].forEach(item => {
          totalAmount += item.price * item.quantity;
        });

        let deliveryFee = 0;
        const allowedRadius = resRows[0].allowed_radius_km;
        const delivery_fees = resRows[0].delivery_fees;

        const { rows: distanceRows } = await client.query(
        `SELECT ST_DistanceSphere(
   ST_SetSRID(ST_MakePoint($1, $2), 4326),
   ST_SetSRID(ST_MakePoint($3, $4), 4326)
 ) AS distance`,
          [lng, lat, lngOfRes, latOfRes]
        );

        const distanceInKm = distanceRows[0].distance / 1000;

        if (distanceInKm > allowedRadius) {
          failedOrders.push({
            restaurantId: resId,
            reason: "Delivery location is outside allowed radius",
            allowedRadius,
            distanceInKm
          });
          continue;
        }

        deliveryFee = parseFloat((delivery_fees * distanceInKm).toFixed(2));
        totalAmount += deliveryFee;

        const orderResult = await client.query(
          `INSERT INTO orders (user_id, restaurant_id, is_reservation, reservation_date, location, lat, lng, total_amount, delivery_fee, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending') RETURNING id`,
          [customerId, resId, is_reservation || false, reservation_date || null, location, lat, lng, totalAmount, deliveryFee]
        );

        const orderId = orderResult.rows[0].id;

        for (const item of groupOfResCartDishes[resId]) {
          await client.query(
            `INSERT INTO order_items (order_id, dish_id, quantity, price) VALUES ($1, $2, $3, $4)`,
            [orderId, item.dish_id, item.quantity, item.price]
          );
          orderedDishIds.push(item.dish_id);
        }

        createdOrders.push({
          orderId,
          restaurantId: resId,
          totalAmount,
          deliveryFee,
          customerLocation: {
            address: location,
            lat: lat,
            lng: lng
          }
        });

        if (is_reservation && reservation_date) {
          await sendBookingEmailsForOrder({
            orderId,
            customerId,
            restaurantId: Number(resId),
            reservationDate: reservation_date,
          });
        }

      } catch (err) {
        failedOrders.push({
          restaurantId: resId,
          reason: err.message
        });
        continue;
      }
    }

    if (orderedDishIds.length > 0) {
      const deletePlaceholders = orderedDishIds.map((_, i) => `$${i + 2}`).join(',');
      await client.query(
        `DELETE FROM cart_items WHERE cart_id = $1 AND dish_id IN (${deletePlaceholders})`,
        [cartId, ...orderedDishIds]
      );
    }

    if (createdOrders.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: "No orders created",
        failedOrders
      });
    }

    await client.query('COMMIT');

    return res.status(201).json({
      message: "Order processing completed",
      createdOrders,
      failedOrders
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error:", err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};


const getOrdersForCustomer = async (req, res) => {
  try {
    const customerId = req.user.id;

    const { rows } = await data.query(
      `
      SELECT
          o.id,
          o.restaurant_id,
          o.total_amount,
          o.status,
          o.created_at,
          o.is_reservation,
          o.reservation_date,

          ol.dish_id,
          d.name AS dish_name,
          d.image AS dish_image,
          d.price AS dish_price,

          p.status AS payment_status,
          u.name AS restaurant_name

      FROM orders o
      INNER JOIN restaurant_profiles rp ON o.restaurant_id = rp.id
      INNER JOIN users u ON rp.user_id = u.id
      INNER JOIN order_items ol ON o.id = ol.order_id
      INNER JOIN dishes d ON d.id = ol.dish_id
      LEFT JOIN payments p ON p.order_id = o.id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
      `,
      [customerId]
    );

    const ordersMap = {};

    rows.forEach((row) => {
      if (!ordersMap[row.id]) {
        ordersMap[row.id] = {
          id: row.id,
          restaurant_id: row.restaurant_id,
          restaurant_name: row.restaurant_name,
          total_amount: row.total_amount,
          status: row.status,
          created_at: row.created_at,
          is_reservation: row.is_reservation,
          reservation_date: row.reservation_date,
          payment_status: row.payment_status,
          items: [],
        };
      }

      ordersMap[row.id].items.push({
        dish_id: row.dish_id,
        dish_name: row.dish_name,
        dish_image: row.dish_image,
        dish_price: row.dish_price,
      });
    });

    const orders = Object.values(ordersMap);

    return res.status(200).json({ orders });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};





module.exports={getOrdersForCustomer,countAtCart,addDishToCart,deleteDishFromCart,getCartDetails,lookForNearRestaurants,restaurantsWhoCanResiveOrder,makeOrder,lookforAllRestaurants,lookForResByName,updateDishQuantityInCart};
