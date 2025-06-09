// server.js

const { Server } = require("socket.io");
const readline = require("readline");
const express = require("express");
const next = require("next");
const http = require("http");
const bodyParser = require("body-parser");
const { query } = require("./lib/db");
const { v4: uuidv4 } = require("uuid");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const expressApp = express();
  const server = http.createServer(expressApp);

  const allowedOrigin = dev
  ? "http://localhost:3001"
  : "http://qr-ordering-env.eba-yjydr8ih.ap-south-1.elasticbeanstalk.com";

  const io = new Server(server, {
    path: "/api/socket",
    cors: {
      origin: allowedOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket"],
    allowEIO3: true,
  });

  global.io = io;

  io.on("connection", (socket) => {
    console.log(`📡 WebSocket connected: ${socket.id}`);

    const heartbeat = setInterval(() => {
      socket.emit("ping", { status: "alive" });
    }, 30000);

    socket.on("disconnect", (reason) => {
      clearInterval(heartbeat);
      console.log(`❌ WebSocket disconnected: ${reason}`);
    });
  });

  // 🛒 Handle order POST requests
  expressApp.post("/outlet/:slug", bodyParser.json(), async (req, res) => {
    try {
      const { slug } = req.params;
      const { customer_name, table_number, is_package, cart } = req.body;

      if (!customer_name || !table_number || !cart || cart.length === 0) {
        return res.status(400).json({ message: "Missing order details" });
      }

      const outletResult = await query("SELECT id FROM outlets WHERE slug = $1", [slug]);
      if (outletResult.rows.length === 0) {
        return res.status(404).json({ message: "Outlet not found" });
      }

      const outlet_id = outletResult.rows[0].id;
      const session_id = uuidv4();
      const total_amount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const insertedOrder = await query(
        `INSERT INTO orders (customer_name, table_number, is_package, session_id, cart, total_amount, outlet_id, outlet_slug, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())
         RETURNING *`,
        [customer_name, table_number, is_package, session_id, JSON.stringify(cart), total_amount, outlet_id, slug]
      );

      const orderData = insertedOrder.rows[0];

      io.emit("newOrder", {
        ...orderData,
        cart,
      });

      console.log(`📦 New order emitted for ${slug}:`, orderData);
      res.status(201).json({ message: "Order placed successfully", order: orderData });
    } catch (err) {
      console.error("❌ Error handling new order:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // 🧪 Fake order via terminal
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("💬 Type 'order' to emit a fake order event:");
  rl.on("line", (input) => {
    if (input.trim().toLowerCase() === "order") {
      const fakeOrder = {
        id: Date.now(),
        customer_name: "John Test",
        table_number: "5",
        is_package: false,
        cart: [
          { name: "Pizza", quantity: 1, price: 250 },
          { name: "Soda", quantity: 2, price: 125 },
        ],
        total_amount: 500,
        outlet_slug: "demo-outlet",
        outlet_id: 1,
        status: "pending",
        created_at: new Date().toISOString(),
      };

      console.log("📦 Emitting fake order:");
      io.emit("newOrder", fakeOrder);
    }
  });

 expressApp.get("/", (req, res) => {
  res.send("App is running");
 });

  // ✅ Let Next.js handle all remaining routes (including /outlet/[slug], etc.)
  expressApp.use((req, res) => {
    return handle(req, res);
  });

    const PORT = process.env.PORT || 8081;
server.listen(PORT, () => {
  console.log(`🚀 Custom server running on port ${PORT}`);
});
  }).catch((err) => {
    console.error("❌ Error during Next.js app preparation:", err);
    process.exit(1);
  });
