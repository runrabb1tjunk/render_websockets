const WebSocket = require('ws');
const PORT = process.env.PORT || 10000;

const server = new WebSocket.Server({ port: PORT });

// Ключ — ID комнаты, значение — Set с активными WebSocket-соединениями
const rooms = new Map();

server.on('connection', (ws) => {
    let currentRoom = null;

    ws.on('message', (message) => {
        try {
            // Ожидаем JSON-сообщение от клиента
            const data = JSON.parse(message);
            
            // Если клиент шлет запрос на присоединение к комнате
            if (data.type === 'join') {
                currentRoom = data.room;
                if (!rooms.has(currentRoom)) {
                    rooms.set(currentRoom, new Set());
                }
                rooms.get(currentRoom).add(ws);
                console.log(`[Room ${currentRoom}] Client joined.`);
                return;
            }

            // Ретранслируем игровые данные (позиции и т.д.) всем остальным в этой же комнате
            if (currentRoom && rooms.has(currentRoom)) {
                for (const client of rooms.get(currentRoom)) {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(message);
                    }
                }
            }
        } catch (e) {
            console.error('Invalid message format', e);
        }
    });

    ws.on('close', () => {
        if (currentRoom && rooms.has(currentRoom)) {
            rooms.get(currentRoom).delete(ws);
            if (rooms.get(currentRoom).size === 0) {
                rooms.delete(currentRoom);
            }
            console.log(`[Room ${currentRoom}] Client left.`);
        }
    });
});

console.log(`[WebSocket Relay] Server running on port ${PORT}`);