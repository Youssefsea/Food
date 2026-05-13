// chatRouter.js
// ✅ معدّل ليستخدم Pusher بدل Socket.IO
// sendMessage اتنقلت من chatSocket.js لهنا كـ HTTP endpoint

const data = require('../data/data');
const { pusher } = require('./chatSocket');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /chat/rooms
// جلب غرف الشات للكاستومر
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const getChatRoomsForCustomer = async (req, res) => {
    try {
        const customerId = req.user.id;

        const { rows: rooms } = await data.query(
            `SELECT cr.id, cr.order_id, cr.created_at,
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /chat/rooms/restaurant
// جلب غرف الشات للمطعم
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const getChatRoomsForRestaurant = async (req, res) => {
    try {
        const restaurantUserId = req.user.id;

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
            [restaurantUserId]
        );

        return res.status(200).json({ rooms });

    } catch (err) {
        console.error('Error getting chat rooms:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /chat/room/:roomId/messages
// جلب رسائل غرفة معينة (بيحل محل joinRoom في Socket.IO)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const getChatMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { roomId } = req.params;

        const { rows: roomRows } = await data.query(
            'SELECT * FROM chat_rooms WHERE id = $1',
            [roomId]
        );

        if (roomRows.length === 0) {
            return res.status(404).json({ error: 'Chat room not found' });
        }

        const room = roomRows[0];

        const hasAccess = checkRoomAccess(room, userId, userRole);

        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this chat room' });
        }

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /chat/room/order/:orderId
// جلب غرفة الشات بناءً على orderId
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const getChatRoomByOrderId = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { orderId } = req.params;

        const { rows: roomRows } = await data.query(
            'SELECT * FROM chat_rooms WHERE order_id = $1',
            [orderId]
        );

        if (roomRows.length === 0) {
            return res.status(404).json({ error: 'Chat room not found for this order' });
        }

        const room = roomRows[0];

        const hasAccess = checkRoomAccess(room, userId, userRole);

        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this chat room' });
        }

        return res.status(200).json({ room });

    } catch (err) {
        console.error('Error getting chat room:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /chat/room/:roomId/message
// ✅ جديد - بيحل محل sendMessage في Socket.IO
// بيحفظ الرسالة في DB وبيبعتها عبر Pusher
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const sendMessage = async (req, res) => {
    try {
        const senderId = req.user.id;
        const senderRole = req.user.role;
        const senderName = req.user.name;
        const { roomId } = req.params;
        const { message } = req.body;

        console.log('=== SEND MESSAGE ===');
        console.log('Sender ID:', senderId, '| Role:', senderRole, '| Room:', roomId);

        if (!message || message.trim() === '') {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        // التحقق من وجود الغرفة
        const { rows: roomRows } = await data.query(
            'SELECT * FROM chat_rooms WHERE id = $1',
            [roomId]
        );

        if (roomRows.length === 0) {
            return res.status(404).json({ error: 'Chat room not found' });
        }

        const room = roomRows[0];

        // التحقق من صلاحية الإرسال
        let hasAccess = false;

        if (senderRole === 'customer' && Number(room.customer_id) === Number(senderId)) {
            hasAccess = true;
        } else if (senderRole === 'restaurant') {
            if (Number(room.restaurant_id) === Number(senderId)) {
                hasAccess = true;
            } else {
                // fallback: نشوف لو الـ restaurant_id هو restaurant_profiles.id
                const { rows: restaurantProfile } = await data.query(
                    'SELECT id FROM restaurant_profiles WHERE user_id = $1',
                    [senderId]
                );
                if (
                    restaurantProfile.length > 0 &&
                    Number(restaurantProfile[0].id) === Number(room.restaurant_id)
                ) {
                    hasAccess = true;
                }
            }
        }

        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to send message in this room' });
        }

        // حفظ الرسالة في الداتا بيز
        const result = await data.query(
            'INSERT INTO chat_messages (room_id, sender_id, message) VALUES ($1, $2, $3) RETURNING id, created_at',
            [roomId, senderId, message.trim()]
        );

        const newMessage = {
            id: result.rows[0].id,
            room_id: Number(roomId),
            sender_id: senderId,
            sender_name: senderName,
            sender_role: senderRole,
            message: message.trim(),
            created_at: result.rows[0].created_at
        };

        // ✅ بعت الرسالة عبر Pusher لكل المتصلين بالغرفة
        // channel name: room-{roomId}
        // event name: new-message
        await pusher.trigger(`room-${roomId}`, 'new-message', newMessage);

        console.log('✅ Message saved & pushed | ID:', newMessage.id);

        return res.status(201).json({ message: newMessage });

    } catch (err) {
        console.error('Error sending message:', err);
        return res.status(500).json({ error: 'Failed to send message' });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /chat/pusher/auth
// ✅ جديد - مطلوب لو هتستخدم Private channels في Pusher
// لو بتستخدم Public channels مش محتاجه
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const pusherAuth = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { socket_id, channel_name } = req.body;

        // channel_name بيكون شكله: private-room-{roomId}
        const roomId = channel_name.replace('private-room-', '');

        // التحقق من صلاحية الوصول للغرفة
        const { rows: roomRows } = await data.query(
            'SELECT * FROM chat_rooms WHERE id = $1',
            [roomId]
        );

        if (roomRows.length === 0) {
            return res.status(404).json({ error: 'Chat room not found' });
        }

        const room = roomRows[0];
        const hasAccess = checkRoomAccess(room, userId, userRole);

        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // توليد Pusher auth token
        const authResponse = pusher.authorizeChannel(socket_id, channel_name, {
            user_id: String(userId),
            user_info: { name: req.user.name, role: userRole }
        });

        return res.status(200).json(authResponse);

    } catch (err) {
        console.error('Pusher auth error:', err);
        return res.status(500).json({ error: 'Auth failed' });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helper: التحقق من صلاحية الوصول للغرفة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const checkRoomAccess = (room, userId, userRole) => {
    if (userRole === 'customer') {
        return Number(room.customer_id) === Number(userId);
    }
    if (userRole === 'restaurant') {
        return Number(room.restaurant_id) === Number(userId);
    }
    return false;
};

module.exports = {
    getChatRoomsForCustomer,
    getChatRoomsForRestaurant,
    getChatMessages,
    getChatRoomByOrderId,
    sendMessage,     // ✅ جديد
    pusherAuth       // ✅ جديد (اختياري لو بتستخدم Private channels)
};