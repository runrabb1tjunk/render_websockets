const WebSocket = require('ws');
const PORT = process.env.PORT || 10000;

const server = new WebSocket.Server({ port: PORT });

// Ключ — ID комнаты, значение — Set с активными WebSocket-соединениями
const rooms = new Map();

server.on('connection', (ws) => {
    let currentRoom = null;
    console.log('[Connection] New client connected.');

ws.on('message', (message) => {
    const messageStr = message.toString().trim();
    console.log('[DEBUG] Raw message received:', messageStr); // <--- Вот это покажет ВСЁ, что дошло до сервера

    try {
        const data = JSON.parse(messageStr);
        
        if (data.type === 'join') {
            currentRoom = data.room;
            if (!rooms.has(currentRoom)) {
                rooms.set(currentRoom, new Set());
            }
            rooms.get(currentRoom).add(ws);
            console.log(`[Room ${currentRoom}] Client joined. Total in room: ${rooms.get(currentRoom).size}`);
            return;
        }

        // Ретрансляция
        if (currentRoom && rooms.has(currentRoom)) {
            let recipientCount = 0;
            for (const client of rooms.get(currentRoom)) {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(messageStr);
                    recipientCount++;
                }
            }
            console.log(`[Room ${currentRoom}] Relayed message to ${recipientCount} peer(s).`);
        } else {
            console.log(`[Warning] Client not in any room! (currentRoom: ${currentRoom})`);
        }
    } catch (e) {
        console.error('Invalid JSON format received:', messageStr, 'Error:', e.message);
    }
});