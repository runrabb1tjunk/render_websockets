const WebSocket = require('ws');
const PORT = process.env.PORT || 10000;

const server = new WebSocket.Server({ port: PORT });

// Ключ — ID комнаты, значение — Set с активными WebSocket-соединениями
const rooms = new Map();

server.on('connection', (ws) => {
    let currentRoom = null;
    console.log('[Connection] New client connected.');

    ws.on('message', (message) => {
        try {
            // Превращаем полученное сообщение в строку для парсинга и логирования
            const messageStr = message.toString();
            const data = JSON.parse(messageStr);
            
            // Если клиент шлет запрос на присоединение к комнате
            if (data.type === 'join') {
                currentRoom = data.room;
                if (!rooms.has(currentRoom)) {
                    rooms.set(currentRoom, new Set());
                }
                rooms.get(currentRoom).add(ws);
                console.log(`[Room ${currentRoom}] Client joined. Total in room: ${rooms.get(currentRoom).size}`);
                return;
            }

            // Ретранслируем игровые данные (позиции и т.д.) всем остальным в этой же комнате
            if (currentRoom && rooms.has(currentRoom)) {
                let recipientCount = 0;
                for (const client of rooms.get(currentRoom)) {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(messageStr);
                        recipientCount++;
                    }
                }
                // Раскомментируй строчку ниже, если захочешь проверить в логах Render, что пакеты летают
                // console.log(`[Room ${currentRoom}] Relayed message to ${recipientCount} peer(s).`);
            } else {
                console.log(`[Warning] Message received from client, but client is not in any room! (currentRoom: ${currentRoom})`);
            }
        } catch (e) {
            console.error('Invalid message format:', message.toString(), e);
        }
    });

    ws.on('close', () => {
        if (currentRoom && rooms.has(currentRoom)) {
            rooms.get(currentRoom).delete(ws);
            console.log(`[Room ${currentRoom}] Client left. Remaining in room: ${rooms.get(currentRoom).size}`);
            
            if (rooms.get(currentRoom).size === 0) {
                rooms.delete(currentRoom);
                console.log(`[Room ${currentRoom}] Room is empty and deleted.`);
            }
        } else {
            console.log('[Connection] Unassigned client disconnected.');
        }
    });

    ws.on('error', (error) => {
        console.error('[WebSocket Error]', error);
    });
});

console.log(`[WebSocket Relay] Server running on port ${PORT}`);