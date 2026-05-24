

const data=require('../data/data');
const { Readable } = require('stream');
const cloudinary = require('../data/cloudTheImg');

const addDishesForRestaurant=async(req,res)=>
{
try
{
const restaurantId=req.user.restaurantProfileId;

const {name,description,price,preparation_time,category}=req.body;
const imges=req.files;

if(!imges || imges.length===0)
{
    return res.status(400).json({error:"At least one image is required"});
}

  const imageUrls = [];

  for (const file of imges) {
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder:"foodimg"},
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      Readable.from(file.buffer).pipe(stream);
    });
      imageUrls.push(uploadResult.secure_url);
    }

    const image_url = imageUrls.join(",");

const insertDish=await data.query("INSERT INTO dishes (restaurant_id, name, description, price, preparation_time, category, image) VALUES ($1, $2, $3, $4, $5, $6, $7)",[restaurantId,name,description,price,preparation_time,category,image_url]);

return res.status(201).json({message:"Dish added successfully"},insertDish);


}
catch(err)
{
    console.error("Error:",err);
    return res.status(500).json({error:"Internal server error"});


}};


const getAllResDishes = async (req, res) => {
  try {
        const { rows: resultRows } = await data.query(`
      SELECT 
          restaurant_id,
                    STRING_AGG(image, ',' ORDER BY image) AS images
      FROM (
          SELECT 
              restaurant_id,
              image,
              ROW_NUMBER() OVER (
                  PARTITION BY restaurant_id 
                  ORDER BY image
              ) AS rn
          FROM dishes
      ) t
      WHERE rn <= 3
      GROUP BY restaurant_id;
    `);

        const dataWithArrays = resultRows.map(row => ({
      restaurant_id: row.restaurant_id,
      images: row.images ? row.images.split(',') : []
    }));

    return res.status(200).json({ data: dataWithArrays });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};


const getAllDishesForRestaurantVendor=async(req,res)=>
{
    try{

        const restaurantId=req.user.restaurantProfileId;

    const { rows: dishesRows }=await data.query("SELECT * FROM dishes WHERE restaurant_id = $1", [restaurantId]);
  
     return res.status(200).json({dishes:dishesRows});
     
    }
    catch(err)
    {
        console.error("Error:",err);
        return res.status(500).json({error:"Internal server error"});   
    }


};

const getAllDishesForRestaurantExplore=async(req,res)=>
{
    try{

        

    const { rows: dishesRows }=await data.query("SELECT name, description, price, preparation_time, category, image FROM dishes WHERE restaurant_id = $1 AND is_available = true", [restaurantId]);
  
    
     return res.status(200).json({dishes:dishesRows});
     
    }
    catch(err)
    {
        console.error("Error:",err);
        return res.status(500).json({error:"Internal server error"});   
    }


};

const changeResturantDish=async(req,res)=>
{
    try{
const restaurantId=req.user.restaurantProfileId;
const {name,description,price,preparation_time,category,dishId}=req.body;
await data.query("UPDATE dishes SET name = $1, description = $2, price = $3, preparation_time = $4, category = $5 WHERE restaurant_id = $6 AND id = $7", [name,description,price,preparation_time,category,restaurantId,dishId]);

return res.status(200).json({message:"Dish information updated successfully"});


    }catch(err)
    {
        console.error("Error:",err);
        return res.status(500).json({error:"Internal server error"});   
    }
}

const changeDishAvailability=async(req,res)=>
{
    try
    {
const restaurantId=req.user.restaurantProfileId;
const {dishId,is_available}=req.body;

await data.query("UPDATE dishes SET is_available = $1 WHERE restaurant_id = $2 AND id = $3", [is_available,restaurantId,dishId]);

return res.status(200).json({message:"Dish availability updated successfully"});


    }
    catch(err)
    {
        console.error("Error:",err);
        return res.status(500).json({error:"Internal server error"});   
    }
}

const delelteDish=async(req,res)=>
{
    try
    {
const restaurantId=req.user.restaurantProfileId;
const {dishId}=req.body;
await data.query("DELETE FROM dishes WHERE restaurant_id = $1 AND id = $2", [restaurantId,dishId]);

return res.status(200).json({message:"Dish deleted successfully"});
}
catch(err)
{
    console.error("Error:",err);
    return res.status(500).json({error:"Internal server error"});   
}
};

module.exports={addDishesForRestaurant,changeResturantDish,changeDishAvailability,delelteDish,getAllResDishes, getAllDishesForRestaurantVendor,getAllDishesForRestaurantExplore};
