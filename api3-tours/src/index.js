const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const cruiseRoutes = require("./routes/cruises");
const customerRoutes = require("./routes/customers");
const bookingRoutes = require("./routes/bookings");

const app = express();
const PORT = process.env.PORT || 3002;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ── Health check ────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── API Info ────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    name: "Tours Management API",
    version: "1.0.0",
    description: "Sample REST API for IBM API Connect demonstration — based on nodetours",
    endpoints: {
      cruises: {
        "GET /cruises": "List all cruises (supports ?startDate, ?endDate, ?startPort, ?numDays)",
        "GET /cruises/:id": "Get a single cruise by cruiseID",
      },
      customers: {
        "GET /customers": "List all customers",
        "POST /customers": "Create a new customer",
        "GET /customers/:id": "Get a single customer by emailAddress",
        "PUT /customers/:id": "Update a customer (full)",
        "DELETE /customers/:id": "Delete a customer",
      },
      bookings: {
        "GET /bookings": "List all bookings (supports ?cruiseID, ?customerID)",
        "POST /bookings": "Create a new booking",
        "GET /bookings/:id": "Get a single booking by bookingID",
        "PUT /bookings/:id": "Update a booking",
        "DELETE /bookings/:id": "Cancel/delete a booking",
      },
    },
  });
});

// ── Routes ───────────────────────────────────────────────────
app.use("/cruises", cruiseRoutes);
app.use("/customers", customerRoutes);
app.use("/bookings", bookingRoutes);

// ── 404 handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found", path: req.originalUrl });
});

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚢 Tours Management API running on http://localhost:${PORT}`);
  console.log(`   API Info : http://localhost:${PORT}/`);
  console.log(`   Health   : http://localhost:${PORT}/health`);
});
