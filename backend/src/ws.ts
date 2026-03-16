/**
 * WebSocket broadcast module for real-time notifications.
 * Maintains a set of connected clients and broadcasts messages to all.
 */

const clients = new Set<any>();

export function addClient(ws: any) {
  clients.add(ws);
  console.log(`  🔌 WS client connected (total: ${clients.size})`);
}

export function removeClient(ws: any) {
  clients.delete(ws);
  console.log(`  🔌 WS client disconnected (total: ${clients.size})`);
}

export function broadcast(event: {
  type: string;
  data: any;
}) {
  const message = JSON.stringify(event);
  for (const client of clients) {
    try {
      client.send(message);
    } catch {
      clients.delete(client);
    }
  }
}
