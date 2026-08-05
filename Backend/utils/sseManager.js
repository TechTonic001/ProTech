const clients = new Map();
const tenantClients = new Map();

const addClient = (landlordId, res) => {
  const id = String(landlordId);
  if (!clients.has(id)) clients.set(id, new Set());
  clients.get(id).add(res);
  console.log(`[SSE] Client connected — landlord ${id} (${clients.get(id).size} connections)`);
};

const removeClient = (landlordId, res) => {
  const id = String(landlordId);
  if (!clients.has(id)) return;
  clients.get(id).delete(res);
  if (clients.get(id).size === 0) clients.delete(id);
};

const addTenantClient = (tenantId, res) => {
  const id = String(tenantId);
  if (!tenantClients.has(id)) tenantClients.set(id, new Set());
  tenantClients.get(id).add(res);
};

const removeTenantClient = (tenantId, res) => {
  const id = String(tenantId);
  if (!tenantClients.has(id)) return;
  tenantClients.get(id).delete(res);
  if (tenantClients.get(id).size === 0) tenantClients.delete(id);
};

const notifyLandlord = (landlordId, eventType, data) => {
  const id = String(landlordId);
  const connections = clients.get(id);
  if (!connections || connections.size === 0) {
    console.log(`[SSE] No active connections for landlord ${id}`);
    return;
  }

  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of Array.from(connections)) {
    try {
      res.write(message);
    } catch (err) {
      connections.delete(res);
    }
  }
  console.log(`[SSE] Pushed ${eventType} to landlord ${id}`);
};

const notifyTenant = (tenantId, eventType, data) => {
  const id = String(tenantId);
  const connections = tenantClients.get(id);
  if (!connections || connections.size === 0) return;

  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of Array.from(connections)) {
    try {
      res.write(message);
    } catch (err) {
      connections.delete(res);
    }
  }
};

module.exports = {
  addClient,
  removeClient,
  addTenantClient,
  removeTenantClient,
  notifyLandlord,
  notifyTenant,
};
