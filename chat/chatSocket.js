const jwt = require('jsonwebtoken');
const data = require('../data/data');

/**
 * Setup Socket.IO for real-time chat
 * @param {import('socket.io').Server} io 
 */
const setupChatSocket = (io) => {
    // Middleware للتحقق من التوكن
 // Middleware للتحقق من التوكن
// في setupChatSocket 
io.use((socket, next) => {
    try {
        let token = socket.handshake.auth?.token || 
                    socket.handshake.headers?.authorization?.split(' ')[1];
        
        // Parse cookie if no token yet
        if (!token && socket.handshake.headers.cookie) {
            const cookies = socket.handshake.headers.cookie.split(';');
            for (const cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'token') {
                    token = value;
                    break;
                }
            }
        }
        
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (err) {
        console.error('Socket authentication error:', err.message);
        return next(new Error('Authentication error: Invalid token'));
    }
});

    io.on('connection', (socket) => {
        console.log('=== SOCKET CONNECTION ===');
        console.log(`User connected: ID=${socket.user.id}, Role=${socket.user.role}, Name=${socket.user.name}`);
        console.log('Full user object:', JSON.stringify(socket.user));
        console.log('=========================');

        // الانضمام لغرفة الشات
        socket.on('joinRoom', async (roomId) => {
            try {
                const userId = socket.user.id;
                const userRole = socket.user.role;

                // التحقق من أن الغرفة موجودة
                const { rows: roomRows } = await data.query(
                    'SELECT * FROM chat_rooms WHERE id = $1',
                    [roomId]
                );

                if (roomRows.length === 0) {
                    socket.emit('error', { message: 'Chat room not found' });
                    return;
                }

                const room = roomRows[0];

                // التحقق من صلاحية المستخدم للانضمام
                let hasAccess = false;

                if (userRole === 'customer' && Number(room.customer_id) === Number(userId)) {
                    hasAccess = true;
                } 
                
              // ✅ صح - يقارن users.id مع users.id (زي ما confirmPayment بيخزن)
if (userRole === 'restaurant') {
    if (Number(room.restaurant_id) === Number(userId)) {
        hasAccess = true;
    }
}

                if (!hasAccess) {
                    socket.emit('error', { message: 'Access denied to this chat room' });
                    return;
                }

                // الانضمام للغرفة
                socket.join(`room_${roomId}`);
                console.log(`User ${userId} joined room_${roomId}`);

                // جلب الرسائل السابقة
                const { rows: messages } = await data.query(
                    `SELECT cm.*, u.name as sender_name 
                     FROM chat_messages cm 
                     LEFT JOIN users u ON cm.sender_id = u.id 
                     WHERE cm.room_id = $1 
                     ORDER BY cm.created_at ASC`,
                    [roomId]
                );

                socket.emit('previousMessages', messages);
                socket.emit('joinedRoom', { roomId, message: 'Successfully joined the room' });

            } catch (err) {
                console.error('Error joining room:', err);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });





        // إرسال رسالة
        socket.on('sendMessage', async ({ roomId, message }) => {
            try {
                const senderId = socket.user.id;
                const senderRole = socket.user.role;

                console.log('=== SEND MESSAGE DEBUG ===');
                console.log('Sender ID:', senderId);
                console.log('Sender Role:', senderRole);
                console.log('Sender Name:', socket.user.name);
                console.log('Room ID:', roomId);
                console.log('Message:', message);
                console.log('========================');

                if (!message || message.trim() === '') {
                    socket.emit('error', { message: 'Message cannot be empty' });
                    return;
                }

                // التحقق من أن الغرفة موجودة و المستخدم له صلاحية
                const { rows: roomRows } = await data.query(
                    'SELECT * FROM chat_rooms WHERE id = $1',
                    [roomId]
                );

                if (roomRows.length === 0) {
                    socket.emit('error', { message: 'Chat room not found' });
                    return;
                }

                const room = roomRows[0];

                // التحقق من صلاحية الإرسال
                let hasAccess = false;

                console.log('=== ACCESS CHECK DEBUG ===');
                console.log('Sender ID:', senderId);
                console.log('Sender Role:', senderRole);
                console.log('Room customer_id:', room.customer_id);
                console.log('Room restaurant_id:', room.restaurant_id);

                if (senderRole === 'customer' && Number(room.customer_id) === Number(senderId)) {
                    console.log('✅ Customer access granted');
                    hasAccess = true;
                } 
              else if (senderRole === 'restaurant') {
    // إذا كان room.restaurant_id = user.id
    if (Number(room.restaurant_id) === Number(senderId)) {
        hasAccess = true;
    }
    // أو إذا كان room.restaurant_id = restaurant_profiles.id
    else {
        const { rows: restaurantProfile } = await data.query(
            'SELECT id FROM restaurant_profiles WHERE user_id = $1',
            [senderId]
        );
        if (restaurantProfile.length > 0 && Number(restaurantProfile[0].id) === Number(room.restaurant_id)) {
            hasAccess = true;
        }
    }
}
                console.log('Final hasAccess:', hasAccess);
                console.log('==========================');

                if (!hasAccess) {
                    socket.emit('error', { message: 'Access denied to send message in this room' });
                    return;
                }

                // حفظ الرسالة في الداتا بيز
                const result = await data.query(
                    'INSERT INTO chat_messages (room_id, sender_id, message) VALUES ($1, $2, $3) RETURNING id',
                    [roomId, senderId, message.trim()]
                );

                const newMessage = {
                    id: result.rows[0].id,
                    room_id: roomId,
                    sender_id: senderId,
                    sender_name: socket.user.name,
                    sender_role: senderRole,
                    message: message.trim(),
                    created_at: new Date()
                };

                console.log('=== NEW MESSAGE SAVED ===');
                console.log('Saved sender_id:', senderId);
                console.log('Saved sender_role:', senderRole);
                console.log('Full message object:', JSON.stringify(newMessage));
                console.log('=========================');

                // إرسال الرسالة لكل المستخدمين في الغرفة
                io.to(`room_${roomId}`).emit('newMessage', newMessage);

            } catch (err) {
                console.error('Error sending message:', err);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // مغادرة الغرفة
        socket.on('leaveRoom', (roomId) => {
            socket.leave(`room_${roomId}`);
            console.log(`User ${socket.user.id} left room_${roomId}`);
        });

        // قطع الاتصال
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.user.id}`);
        });
    });
};

module.exports = { setupChatSocket };
