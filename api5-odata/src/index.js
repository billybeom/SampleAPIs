const express = require("express");
const cors    = require("cors");
const morgan  = require("morgan");

const productRoutes  = require("./routes/products");
const categoryRoutes = require("./routes/categories");
const { generateMetadata, generateServiceDocument } = require("./odata/metadata");

const app  = express();
const PORT = process.env.PORT || 3003;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// OData 4.0 Version Headers
app.use((req, res, next) => {
  res.setHeader("OData-Version", "4.0");
  res.setHeader("OData-MaxVersion", "4.0");
  next();
});

// ── OData service root ───────────────────────────────────────
// Returns the OData service document (entity set listing)
app.get("/", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.json(generateServiceDocument(baseUrl));
});

// ── OData $metadata document ─────────────────────────────────
// Returns the CSDL (Common Schema Definition Language) XML
app.get("/$metadata", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.type("application/xml").send(generateMetadata(baseUrl));
});

// ── Health check ────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── OData Entity Set routes ──────────────────────────────────
app.use("/Products",   productRoutes);
app.use("/Categories", categoryRoutes);

// ── 404 handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: {
      code:    "NotFound",
      message: "Route not found",
      path:    req.originalUrl,
    },
  });
});

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({
    error: { code: "InternalServerError", message: "Internal server error" },
  });
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🛍️  OData Product Catalog API running on http://localhost:${PORT}`);
  console.log(`   Service document : http://localhost:${PORT}/`);
  console.log(`   Metadata         : http://localhost:${PORT}/$metadata`);
  console.log(`   Health           : http://localhost:${PORT}/health`);
  console.log(`   Products         : http://localhost:${PORT}/Products`);
  console.log(`   Categories       : http://localhost:${PORT}/Categories`);
});
