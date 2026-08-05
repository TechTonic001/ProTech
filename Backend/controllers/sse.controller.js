const {
  addClient,
  removeClient,
  addTenantClient,
  removeTenantClient,
} = require("../utils/sseManager");

const sseConnect = (req, res) => {
  const userId = req.user?.user_id;
  const role = req.user?.role;

  if (!userId || !role) {
    return res.status(401).json({ error: "Invalid user context" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  res.write(
    `event: connected\ndata: ${JSON.stringify({ status: "ok", userId, role })}\n\n`,
  );

  if (role === "landlord") {
    addClient(userId, res);
  } else if (role === "tenant") {
    addTenantClient(userId, res);
  }

  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch (err) {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    if (role === "landlord") removeClient(userId, res);
    else if (role === "tenant") removeTenantClient(userId, res);
    console.log(`[SSE] Client disconnected — ${role} ${userId}`);
  });
};

module.exports = { sseConnect };
