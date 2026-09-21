const express = require("express");
const router  = express.Router();
const db = require("../data/store");
const { applyODataQuery } = require("../odata/queryParser");

// ── Helper: build @odata.context URL ────────────────────────────────────────
function odataCtx(req, suffix) {
  const base = `${req.protocol}://${req.get("host")}`;
  return `${base}/$metadata#${suffix}`;
}

// ── Helper: build @odata.id for a single product ────────────────────────────
function productId(req, id) {
  return `${req.protocol}://${req.get("host")}/Products(${id})`;
}

/**
 * GET /Products
 * OData query options: $filter, $select, $orderby, $top, $skip, $count, $expand
 */
router.get("/", (req, res) => {
  const expandMap = {
    Category: (p) => db.categories.find((c) => c.id === p.categoryId) || null,
  };

  const odataResult = applyODataQuery(db.products, req.query, expandMap);

  const response = {
    "@odata.context": odataCtx(req, "Products"),
    ...odataResult,
  };

  res.json(response);
});

/**
 * GET /Products(:id)
 * OData canonical key syntax — e.g. /Products(1)
 * Also accepts /Products/1 for convenience
 */
router.get(["/:key(\\d+)", "\\(:key(\\d+)\\)"], (req, res) => {
  const id = parseInt(req.params.key);
  const product = db.products.find((p) => p.id === id);
  if (!product) {
    return res.status(404).json({
      error: {
        code:    "ResourceNotFound",
        message: `No Product with id ${id}`,
        target:  `Products(${id})`,
      },
    });
  }

  // $expand support for single entity
  let result = { ...product };
  if (req.query.$expand && req.query.$expand.includes("Category")) {
    result.Category = db.categories.find((c) => c.id === product.categoryId) || null;
  }

  // $select support
  if (req.query.$select) {
    const fields = req.query.$select.split(",").map((s) => s.trim());
    const projected = {};
    for (const f of fields) {
      if (f in result) projected[f] = result[f];
    }
    result = projected;
  }

  res.json({
    "@odata.context": odataCtx(req, `Products/$entity`),
    "@odata.id":      productId(req, id),
    ...result,
  });
});

/**
 * POST /Products
 * Create a new product.
 */
router.post("/", (req, res) => {
  const { name, description, price, stock = 0, rating, categoryId, discontinued = false } = req.body;

  if (!name || price === undefined || !categoryId) {
    return res.status(400).json({
      error: {
        code:    "BadRequest",
        message: "name, price, and categoryId are required fields",
      },
    });
  }

  const category = db.categories.find((c) => c.id === categoryId);
  if (!category) {
    return res.status(404).json({
      error: {
        code:    "ResourceNotFound",
        message: `No Category with id ${categoryId}`,
        target:  `Categories(${categoryId})`,
      },
    });
  }

  const newProduct = {
    id:           db.nextProductId,
    name,
    description:  description || "",
    price:        parseFloat(price),
    stock:        parseInt(stock),
    rating:       rating !== undefined ? parseFloat(rating) : null,
    categoryId:   parseInt(categoryId),
    createdAt:    new Date().toISOString(),
    discontinued: Boolean(discontinued),
  };

  db.products.push(newProduct);
  db.incrementProductId();

  res.status(201)
    .set("Location", productId(req, newProduct.id))
    .json({
      "@odata.context": odataCtx(req, "Products/$entity"),
      "@odata.id":      productId(req, newProduct.id),
      ...newProduct,
    });
});

/**
 * PATCH /Products(:id)
 * Partial update (OData PATCH semantics).
 */
router.patch("/:key(\\d+)", (req, res) => {
  const id  = parseInt(req.params.key);
  const idx = db.products.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({
      error: { code: "ResourceNotFound", message: `No Product with id ${id}` },
    });
  }

  // Disallow changing the key
  if (req.body.id !== undefined && req.body.id !== id) {
    return res.status(400).json({
      error: { code: "BadRequest", message: "Cannot modify the entity key (id)" },
    });
  }

  db.products[idx] = { ...db.products[idx], ...req.body, id };
  res.status(204).end();
});

/**
 * PUT /Products(:id)
 * Full update (OData upsert-style PUT semantics).
 */
router.put("/:key(\\d+)", (req, res) => {
  const id  = parseInt(req.params.key);
  const idx = db.products.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({
      error: { code: "ResourceNotFound", message: `No Product with id ${id}` },
    });
  }

  const { name, description, price, stock, rating, categoryId, discontinued } = req.body;
  if (!name || price === undefined || !categoryId) {
    return res.status(400).json({
      error: { code: "BadRequest", message: "name, price, and categoryId are required" },
    });
  }

  db.products[idx] = {
    id,
    name,
    description:  description || "",
    price:        parseFloat(price),
    stock:        stock !== undefined ? parseInt(stock) : db.products[idx].stock,
    rating:       rating !== undefined ? parseFloat(rating) : db.products[idx].rating,
    categoryId:   parseInt(categoryId),
    createdAt:    db.products[idx].createdAt,
    discontinued: discontinued !== undefined ? Boolean(discontinued) : db.products[idx].discontinued,
  };

  res.status(204).end();
});

/**
 * DELETE /Products(:id)
 */
router.delete("/:key(\\d+)", (req, res) => {
  const id  = parseInt(req.params.key);
  const idx = db.products.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({
      error: { code: "ResourceNotFound", message: `No Product with id ${id}` },
    });
  }

  db.products.splice(idx, 1);
  res.status(204).end();
});

/**
 * GET /Products/$count
 * Returns the raw integer count of the entity set (with optional $filter).
 */
router.get("/\\$count", (req, res) => {
  const { $filter } = req.query;
  const count = db.products.filter(parseFilter($filter)).length;
  res.type("text/plain").send(String(count));
});

module.exports = router;
