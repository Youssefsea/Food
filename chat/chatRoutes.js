const data = require('../data/data');


const getChatRoomsForCustomer = async (req, res) => {
    try {
        const customerId = req.user.id;

        const { rows: rooms } = await data.query(
            `SELECT cr.id, cr.order_id,cr.created_at,
                    u.name as restaurant_name,
                    o.status as order_status,
                    (SELECT message FROM chat_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message,
                    (SELECT created_at FROM chat_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message_time
             FROM chat_rooms cr
             INNER JOIN restaurant_profiles rp ON cr.restaurant_id = rp.id
             INNER JOIN users u ON rp.user_id = u.id
             INNER JOIN orders o ON cr.order_id = o.id
             WHERE cr.customer_id = $1
                ORDER BY cr.created_at DESC`,
            [customerId]
        );


        return res.status(200).json({ rooms });

    } catch (err) {
        console.error('Error getting chat rooms:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * الحصول على غرف الشات للمطعم
 */
const getChatRoomsForRestaurant = async (req, res) => {
    try {
       // ✅ صح - استخدم users.id لأن chat_rooms.restaurant_id بيخزن users.id
const restaurantProfileId = req.user.id;

        const { rows: rooms } = await data.query(
            `SELECT cr.id, cr.order_id, cr.created_at,
                    u.name as customer_name,
                    o.status as order_status,
                    (SELECT message FROM chat_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message,
                    (SELECT created_at FROM chat_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message_time
             FROM chat_rooms cr
             INNER JOIN users u ON cr.customer_id = u.id
             INNER JOIN orders o ON cr.order_id = o.id
             WHERE cr.restaurant_id = $1
             ORDER BY cr.created_at DESC`,
            [restaurantProfileId]
        );

        return res.status(200).json({ rooms });

    } catch (err) {
        console.error('Error getting chat rooms:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * الحصول على رسائل غرفة معينة
 */
const getChatMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { roomId } = req.params;

        // التحقق من وجود الغرفة
        const { rows: roomRows } = await data.query(
            'SELECT * FROM chat_rooms WHERE id = $1',
            [roomId]
        );

        if (roomRows.length === 0) {
            return res.status(404).json({ error: 'Chat room not found' });
        }

        const room = roomRows[0];

        // التحقق من صلاحية الوصول
        let hasAccess = false;

        if (userRole === 'customer' && Number(room.customer_id) === Number(userId)) {
            hasAccess = true;
        } else if (userRole === 'restaurant') {
            const restaurantProfileId =userId;
            
            if (restaurantProfileId && Number(restaurantProfileId) === Number(room.restaurant_id)) {
                hasAccess = true;
            }
        }

        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this chat room' });
        }

        // جلب الرسائل
        const { rows: messages } = await data.query(
            `SELECT cm.*, u.name as sender_name, u.role as sender_role
             FROM chat_messages cm 
             LEFT JOIN users u ON cm.sender_id = u.id 
             WHERE cm.room_id = $1 
             ORDER BY cm.created_at ASC`,
            [roomId]
        );

        return res.status(200).json({ 
            room: {
                id: room.id,
                order_id: room.order_id,
                customer_id: room.customer_id,
                restaurant_id: room.restaurant_id
            },
            messages 
        });

    } catch (err) {
        console.error('Error getting messages:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * الحصول على غرفة الشات بناءً على order_id
 */
const getChatRoomByOrderId = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { orderId } = req.params;

        // البحث عن الغرفة
        const { rows: roomRows } = await data.query(
            'SELECT * FROM chat_rooms WHERE order_id = $1',
            [orderId]
        );

        if (roomRows.length === 0) {
            return res.status(404).json({ error: 'Chat room not found for this order' });
        }

        const room = roomRows[0];

        // التحقق من صلاحية الوصول
        let hasAccess = false;
console.log('User role:', userRole);
        if (userRole === 'customer' && Number(room.customer_id) === Number(userId)) {
            hasAccess = true;
        } else if (userRole === 'restaurant') {
            const restaurantProfileID =userId;
            console.log('Restaurant profile:', restaurantProfileID);
            console.log('Room restaurant ID:', room.restaurant_id);
            if (restaurantProfileID  && restaurantProfileID === Number(room.restaurant_id)) {
                hasAccess = true;
            }
        }

        if (hasAccess==false) {
            return res.status(403).json({ error: 'Access denied to this chat room' });
        }

        return res.status(200).json({ room });

    } catch (err) {
        console.error('Error getting chat room:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getChatRoomsForCustomer,
    getChatRoomsForRestaurant,
    getChatMessages,
    getChatRoomByOrderId
};
