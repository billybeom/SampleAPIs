const express = require("express");
const router  = express.Router();
const db = require("../data/store");
const { applyODataQuery, parseFilter } = require("../odata/queryParser");

// ── Helper: build @odata.context URL ────────────────────────────────────────
function odataCtx(req, suffix) {
  const base = `${req.protocol}://${req.get("host")}`;
  return `${base}/$metadata#${suffix}`;
}

function categoryOdataId(req, id) {
  return `${req.protocol}://${req.get("host")}/Categories(${id})`;
}

/**
 * GET /Categories
 * OData query options: $filter, $select, $orderby, $top, $skip, $count, $expand
 */
router.get("/", (req, res) => {
  const expandMap = {
    Products: (c) => db.products.filter((p) => p.categoryId === c.id),
  };

  const odataResult = applyODataQuery(db.categories, req.query, expandMap);

  res.json({
    "@odata.context": odataCtx(req, "Categories"),
    ...odataResult,
  });
});

/**
 * GET /Categories(:id)
 */
router.get("/:key(\\d+)", (req, res) => {
  const id = parseInt(req.params.key);
  const category = db.categories.find((c) => c.id === id);
  if (!category) {
    return res.status(404).json({
      error: {
        code:    "ResourceNotFound",
        message: `No Category with id ${id}`,
        target:  `Categories(${id})`,
      },
    });
  }

  let result = { ...category };

  // $expand=Products
  if (req.query.$expand && req.query.$expand.includes("Products")) {
    result.Products = db.products.filter((p) => p.categoryId === id);
  }

  // $select
  if (req.query.$select) {
    const fields = req.query.$select.split(",").map((s) => s.trim());
    const projected = {};
    for (const f of fields) {
      if (f in result) projected[f] = result[f];
    }
    result = projected;
  }

  res.json({
    "@odata.context": odataCtx(req, "Categories/$entity"),
    "@odata.id":      categoryOdataId(req, id),
    ...result,
  });
});

/**
 * GET /Categories(:id)/Products
 * Navigation property — list products belonging to a category
 */
router.get("/:key(\\d+)/Products", (req, res) => {
  const id = parseInt(req.params.key);
  const category = db.categories.find((c) => c.id === id);
  if (!category) {
    return res.status(404).json({
      error: { code: "ResourceNotFound", message: `No Category with id ${id}` },
    });
  }

  const categoryProducts = db.products.filter((p) => p.categoryId === id);
  const odataResult = applyODataQuery(categoryProducts, req.query);

  res.json({
    "@odata.context": odataCtx(req, `Categories(${id})/Products`),
    ...odataResult,
  });
});

/**
 * POST /Categories
 */
router.post("/", (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({
      error: { code: "BadRequest", message: "name is a required field" },
    });
  }

  const duplicate = db.categories.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    return res.status(409).json({
      error: { code: "Conflict", message: "A Category with this name already exists", name },
    });
  }

  const newCategory = {
    id:          db.nextCategoryId,
    name,
    description: description || "",
  };

  db.categories.push(newCategory);
  db.incrementCategoryId();

  res.status(201)
    .set("Location", categoryOdataId(req, newCategory.id))
    .json({
      "@odata.context": odataCtx(req, "Categories/$entity"),
      "@odata.id":      categoryOdataId(req, newCategory.id),
      ...newCategory,
    });
});

/**
 * PATCH /Categories(:id)
 */
router.patch("/:key(\\d+)", (req, res) => {
  const id  = parseInt(req.params.key);
  const idx = db.categories.findIndex((c) => c.id === id);
  if (idx === -1) {
    return res.status(404).json({
      error: { code: "ResourceNotFound", message: `No Category with id ${id}` },
    });
  }

  if (req.body.id !== undefined && req.body.id !== id) {
    return res.status(400).json({
      error: { code: "BadRequest", message: "Cannot modify the entity key (id)" },
    });
  }

  db.categories[idx] = { ...db.categories[idx], ...req.body, id };
  res.status(204).end();
});

/**
 * DELETE /Categories(:id)
 * Blocked if category has associated products.
 */
router.delete("/:key(\\d+)", (req, res) => {
  const id  = parseInt(req.params.key);
  const idx = db.categories.findIndex((c) => c.id === id);
  if (idx === -1) {
    return res.status(404).json({
      error: { code: "ResourceNotFound", message: `No Category with id ${id}` },
    });
  }

  const linkedProducts = db.products.filter((p) => p.categoryId === id).length;
  if (linkedProducts > 0) {
    return res.status(409).json({
      error: {
        code:            "Conflict",
        message:         "Cannot delete a Category that has associated Products",
        linkedProducts,
      },
    });
  }

  db.categories.splice(idx, 1);
  res.status(204).end();
});

/**
 * GET /Categories/$count
 */
router.get("/\\$count", (req, res) => {
  const { $filter } = req.query;
  const count = db.categories.filter(parseFilter($filter)).length;
  res.type("text/plain").send(String(count));
});

module.exports = router;
