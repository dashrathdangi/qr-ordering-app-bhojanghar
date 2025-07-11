// server.js
import dotenv from 'dotenv';
dotenv.config();
const PORT = process.env.PORT || 8080;
console.log("✅ server.js started...");
import { Server } from "socket.io";
import readline from "readline";
import express from "express";
import next from "next";
import http from "http";
import bodyParser from "body-parser";
import { query } from "./lib/db/index.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { verifyToken } from './lib/auth.js';

// ✅ ADD DEBUG LOGS HERE
console.log("🟢 Starting server.js");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "✔️ Set" : "❌ Missing");
console.log("PORT:", process.env.PORT);
console.log("🧪 TEST LINE: This is the REAL server.js");

const dev = process.env.NODE_ENV !== "production";

const allowedOrigin = (origin, callback) => {
  console.log("🌐 Incoming CORS origin:", origin);

  if (
  !origin ||
  origin.includes("localhost") ||
  origin.includes("vercel.app") ||
  origin.includes("stonezon.com") // ✅ allow your domain
) {
  callback(null, true);
} else {
  callback(new Error("❌ CORS not allowed from this origin"));
}
};

const app = next({
  dev: false,
  dir: path.resolve("./"), // absolute path to current project root
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  console.log("✅ Next.js app prepared from:", app._dir);
  const expressApp = express();
  const server = http.createServer(expressApp);

  server.on('upgrade', (req, socket, head) => {
  console.log("⚙️  Raw upgrade request headers:", req.headers);
});

  const io = new Server(server, {
    path: "/api/socket",
    cors: {
      origin: allowedOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket"],
    allowEIO3: true,
    pingInterval: 25000,
  });

  global.io = io;

  const adminSockets = new Set();
  global.adminSockets = adminSockets; 
 io.on("connection", (socket) => {
  console.log("🔧 Inside io.on(connection) for socket:", socket.id);
  console.log(`📡 WebSocket connected: ${socket.id}`);
  console.log("🔧 START setting up handlers for:", socket.id);

  const rawCookies = socket.handshake.headers?.cookie || 'no cookie';
  console.log("🍪 Raw cookie string:", rawCookies);

  socket.on("test-debug", (data) => {
    console.log("🐞 test-debug received from socket:", socket.id, data);
    socket.emit("debug-ack", {
      msg: "✅ Server received your test-debug",
      received: data,
      socketId: socket.id,
    });
  });

  socket.onAny((event, ...args) => {
    console.log(`📥 socket.onAny => Received event: "${event}"`, args);
  });

  // ✅ MOVE THIS BLOCK *INSIDE* io.on("connection")
  socket.on("adminConnected", () => {
    const cookieHeader = socket.handshake.headers?.cookie || "";
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      console.warn("⛔ No token cookie sent by client");
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.adminId) {
      console.warn("⛔ Invalid or expired token:", token);
      return;
    }

    adminSockets.add(socket);
    console.log("✅ Authenticated Admin added:", socket.id, "Admin ID:", decoded.adminId);
    console.log("🧮 Total authenticated admin sockets:", adminSockets.size);
  });

  // ✅ Disconnect cleanup
  socket.on("disconnect", (reason) => {
    if (adminSockets.has(socket)) {
      adminSockets.delete(socket);
      console.log("🗑️ Admin removed:", socket.id);
    }
    console.log(`❌ WebSocket disconnected: ${reason}`);
  });

  // ✅ Ping heartbeat
  const heartbeat = setInterval(() => {
    socket.emit("ping", { status: "alive" });
  }, 30000);

  socket.on("disconnect", () => clearInterval(heartbeat));
});

  // 🛒 Handle order POST requests
  expressApp.post("/outlet/:slug", bodyParser.json(), async (req, res) => {
    console.log("🛎️ Real order POST hit for:", req.params.slug);
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
      console.log("✅ Real order inserted:", orderData);
      console.log("📢 Emitting WebSocket newOrder for:", orderData.id);
      console.log("🧑‍💻 Currently connected admin sockets:");
adminSockets.forEach(s => console.log("➡️", s.id));

      console.log("📢 Emitting to total admins:", adminSockets.size);
      console.log("📢 Preparing to emit real order via socket:", orderData);
console.log("📡 Total adminSockets:", adminSockets.size);
 adminSockets.forEach((adminSocket) => {
  console.log("➡️ Emitting to admin:", adminSocket.id);
  adminSocket.emit("newOrder", {
    ...orderData,
    cart,
  });
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
        id: Math.floor(Math.random() * 1000), // or pick any test number
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
   res.status(200).send("App is running")
 });

  // ✅ Let Next.js handle all remaining routes (including /outlet/[slug], etc.)
  expressApp.use((req, res) => {
    return handle(req, res);
  });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🟢 Server running at http://0.0.0.0:${PORT}`);
});

  }).catch((err) => {
    console.error("❌ Error during Next.js app preparation:", err);
    process.exit(1);
  });
