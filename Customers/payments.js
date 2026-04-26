const data = require('../data/data');
const { Readable } = require('stream');
const cloudinary = require('../data/cloudTheImg');

/**
 * @param {number} customerId
 * @param {number} amount
 * @param {string} paymentMethod
 * @param {number} order_id
 * @param {object} imgPay
 * @returns {object}
 */
const processPayment = async (customerId, amount, paymentMethod, order_id, imgPay) => {
   const client = await data.connect();

    try {
        await client.query('BEGIN');
        const { rows } = await client.query('SELECT * FROM payments WHERE order_id = $1', [order_id]);
        if (rows.length > 0) {
            await client.query('ROLLBACK');
            return { success: false, message: 'Payment already exists for this order', data: rows[0] };
        }

        if (!imgPay || imgPay.length === 0) {
            await client.query('ROLLBACK');
            return { success: false, message: 'Payment proof image is required' };
        }

        if (!['vodafone_cash', 'instapay'].includes(paymentMethod)) {
            await client.query('ROLLBACK');
            return { success: false, message: "Invalid payment method. Use 'vodafone_cash' or 'instapay'" };
        }

        const file = Array.isArray(imgPay) ? imgPay[0] : imgPay;

        if(!file||!file.buffer)
        {
            await client.query('ROLLBACK');
            return { success: false, message: 'Invalid payment proof image' };
        }

        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: "payimg" },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            Readable.from(file.buffer).pipe(stream);
        });
        const imgPayUrl = uploadResult.secure_url;


        const addToPayment = await client.query(
            "INSERT INTO payments (order_id, amount, payment_method, payment_proof, status) VALUES ($1, $2, $3, $4, 'pending') RETURNING id",
            [order_id, amount, paymentMethod, imgPayUrl]
        );

        const paymentId = addToPayment.rows[0].id;

        await client.query("UPDATE orders SET payment_id = $1 WHERE id = $2", [paymentId, order_id]);
        await client.query('COMMIT');
        return {
            success: true,
            message: 'Payment proof uploaded successfully. Waiting for confirmation.',
            data: {
                paymentId,
                order_id,
                amount,
                paymentMethod,
                payment_proof: imgPayUrl,
                status: 'pending'
            }
        };


    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error processing payment:", err.message);
        return { success: false, message: err.message };
    }
    finally {
        client.release();
    }
};



const uploadPaymentProof = async (req, res) => {
    try {

        const customerId = req.user.id;
        const { orderId, payment_method } = req.body;

        const imgpayment=req.files;
        const { rows: orderRows } = await data.query(
            "SELECT id, status, total_amount FROM orders WHERE id = $1 AND user_id = $2",
            [orderId, customerId]
        );

        if (orderRows.length === 0) {
            return res.status(404).json({ error: "Order not found" });
        }

        const order = orderRows[0];


        if (order.status !== 'pending') {
            return res.status(400).json({ error: "Payment already submitted or order is not in pending status" });
        }


        const result = await processPayment(
            customerId,
            order.total_amount,
            payment_method,
            orderId,
            imgpayment
        );

        if (result.success) {

            return res.status(201).json(result);
        } else {

            return res.status(400).json({ error: result.message });
        }


    } catch (err) {

        console.error("Error uploading payment proof:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const confirmPayment = async (req, res) => {
  const client = await data.connect();
  try {
    await client.query('BEGIN');
    const { paymentId } = req.body;

    const { rows: paymentRows } = await client.query(
      "SELECT * FROM payments WHERE id = $1",
      [paymentId]
    );

    if(paymentRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Payment not found" });
    }

    const payment = paymentRows[0];

    if(payment.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Payment already processed" });
    }

    await client.query(
      "UPDATE payments SET status = 'confirmed' WHERE id = $1",
      [paymentId]
    );



    const { rows: userRows } = await client.query(
      "SELECT user_id FROM orders WHERE id = $1",
      [payment.order_id]
    );
    const userId = userRows[0].user_id;

    const { rows: walletRows } = await client.query(
      "SELECT * FROM wallets WHERE user_id = $1",
      [userId]
    );

    if(walletRows.length === 0){
      await client.query(
        "INSERT INTO wallets (user_id, balance) VALUES ($1, $2)",
        [userId, payment.amount]
      );
    } else {
      await client.query(
        "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2",
        [payment.amount, userId]
      );
    }

    const { rows: walletRowsAfterUpdate } = await client.query(
      "SELECT balance FROM wallets WHERE user_id = $1",
      [userId]
    );
    const wallet = walletRowsAfterUpdate[0];

const { rows: orderRows } = await client.query(
  `SELECT u.id AS restaurantUserId
   FROM orders o
   INNER JOIN restaurant_profiles rp ON o.restaurant_id = rp.id
   INNER JOIN users u ON rp.user_id = u.id
   WHERE o.id = $1`,
  [payment.order_id]
);

const restaurantId = orderRows[0].restaurantUserId;


    await client.query(
      "INSERT INTO chat_rooms (customer_id, restaurant_id, order_id) VALUES ($1, $2, $3)",
      [userId, restaurantId, payment.order_id]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      message: "Payment confirmed successfully and order marked as paid, wallet updated, and chat room created",
      orderId: payment.order_id,
      newStatus: 'paid',
      userId,
      Wallet: wallet.balance
    });

  } catch(err) {
    await client.query('ROLLBACK');
    console.error("Error confirming payment:", err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};





const rejectPayment = async (req, res) => {
    const client = await data.connect();
    try {
        await client.query('BEGIN');
        const { paymentId } = req.body;

        const { rows: paymentRows } = await client.query("SELECT * FROM payments WHERE id = $1", [paymentId]);

        if (paymentRows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Payment not found" });
        }

        const payment = paymentRows[0];

        if (payment.status !== 'pending') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: "Payment already processed" });
        }

        await client.query("UPDATE payments SET status = 'rejected' WHERE id = $1", [paymentId]);
        await client.query("UPDATE orders SET payment_id = NULL WHERE id = $1", [payment.order_id]);
        await client.query('COMMIT');
        return res.status(200).json({
            message:"Payment rejected",
            reason:"Payment proof was not valid",
            orderId: payment.order_id
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error rejecting payment:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
    finally {
        client.release();
    }
};



const getPaymentStatus = async (req, res) => {
    try {
        const customerId = req.user.id;
        const { orderId } = req.body;

        const { rows: orderRows } = await data.query(
            `SELECT o.id, o.status as order_status, o.total_amount,
                    p.id as payment_id, p.status as payment_status, p.payment_method, p.created_at as payment_date
             FROM orders o
             LEFT JOIN payments p ON o.payment_id = p.id
             WHERE o.id = $1 AND o.user_id = $2`,
            [orderId, customerId]
        );

        if (orderRows.length === 0) {
            return res.status(404).json({ error: "Order not found" });
        }

        const order = orderRows[0];

        return res.status(200).json({
            orderId: order.id,
            totalAmount: order.total_amount,
            orderStatus: order.order_status,
            payment: order.payment_id ? {
                id: order.payment_id,
                status: order.payment_status,
                method: order.payment_method,
                date: order.payment_date
            } : null
        });

    } catch (err) {
        console.error("Error getting payment status:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const getPaymentStatusForOrder = async (req, res) =>
{
    try
    {
        const {orderId}=req.body;
        const { rows }=await data.query("SELECT p.status FROM payments p JOIN orders o ON p.id = o.payment_id WHERE o.id = $1", [orderId]);
        if(rows.length===0)
        {
            return res.status(404).json({error:"No payment found for this order"});
        }
        return res.status(200).json({paymentStatus:rows[0].status});
    }
    catch(err)
    {
        console.error("Error getting payment status for order:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}


const getAllOrderPaymentProofs=async(req,res)=>
{
    try
    {
const { rows: paymentProofs }=await data.query(`SELECT p.id as payment_id, p.amount, p.payment_method, p.payment_proof, p.created_at,u.name as customer_name, u.phone as customer_phone
FROM payments p JOIN orders o ON p.order_id = o.id JOIN users u ON o.user_id = u.id WHERE p.payment_proof IS NOT NULL ORDER BY p.created_at DESC`);
return res.status(200).json({paymentProofs});

    }catch(err)
    {
        console.error("Error getting payment proofs for restaurant orders:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}

const getPendingPayments = async (req, res) => {
    try {
        const { rows: payments } = await data.query(
            `SELECT p.id as payment_id, p.amount, p.payment_method, p.payment_proof, p.created_at,
                    o.id as order_id, o.location, o.is_reservation, o.reservation_date,
                    u.name as customer_name, u.phone as customer_phone
             FROM payments p
             JOIN orders o ON p.order_id = o.id
             JOIN users u ON o.user_id = u.id
             WHERE p.status = 'pending'
             ORDER BY p.created_at ASC`
        );

        return res.status(200).json({
            count: payments.length,
            pendingPayments: payments
        });

    } catch (err) {
        console.error("Error getting pending payments:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};


const getBalanceAtWallet=async(req,res)=>
{
    try
    {
const userId=req.user.id;
const { rows: walletRows }=await data.query("SELECT balance FROM wallets WHERE user_id = $1", [userId]);
if(walletRows.length===0)
{
    return res.status(404).json({error:"Wallet not found for this user"});
}
return res.status(200).json({balance:walletRows[0].balance});

    }
    catch(err)
    {
        console.error("Error getting balance at wallet:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    processPayment,
    uploadPaymentProof,
    confirmPayment,
    rejectPayment,
    getPaymentStatus,
    getPendingPayments,
    getPaymentStatusForOrder,
    getBalanceAtWallet,
    getAllOrderPaymentProofs
};
