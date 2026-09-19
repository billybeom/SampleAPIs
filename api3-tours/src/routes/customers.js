const express = require("express");
const router = express.Router();
const db = require("../data/store");

/**
 * GET /customers
 * Returns all customers.
 */
router.get("/", (req, res) => {
  res.json({ total: db.customers.length, data: db.customers });
});

/**
 * POST /customers
 * Body: { emailAddress, firstName, lastName, phone, address }
 * Returns 409 if emailAddress already exists.
 */
router.post("/", (req, res) => {
  const { emailAddress, firstName, lastName, phone, address } = req.body;

  if (!emailAddress || !firstName || !lastName) {
    return res.status(400).json({
      error: "emailAddress, firstName, and lastName are required fields",
    });
  }

  const duplicate = db.customers.find((c) => c.emailAddress === emailAddress);
  if (duplicate) {
    return res.status(409).json({
      error: "A customer with this email address already exists",
      emailAddress,
    });
  }

  const newCustomer = {
    emailAddress,
    firstName,
    lastName,
    phone: phone || null,
    address: address || {},
    createdAt: new Date().toISOString(),
  };

  db.customers.push(newCustomer);
  res.status(201).json(newCustomer);
});

/**
 * GET /customers/:id
 * Path param: id = emailAddress
 */
router.get("/:id", (req, res) => {
  const customer = db.customers.find(
    (c) => c.emailAddress === req.params.id
  );
  if (!customer) {
    return res
      .status(404)
      .json({ error: "Customer not found", emailAddress: req.params.id });
  }
  res.json(customer);
});

/**
 * PUT /customers/:id  – full update
 * Path param: id = emailAddress
 */
router.put("/:id", (req, res) => {
  const idx = db.customers.findIndex((c) => c.emailAddress === req.params.id);
  if (idx === -1) {
    return res
      .status(404)
      .json({ error: "Customer not found", emailAddress: req.params.id });
  }

  const { firstName, lastName, phone, address } = req.body;
  const existing = db.customers[idx];

  db.customers[idx] = {
    ...existing,
    firstName: firstName ?? existing.firstName,
    lastName: lastName ?? existing.lastName,
    phone: phone ?? existing.phone,
    address: address ?? existing.address,
  };

  res.json(db.customers[idx]);
});

/**
 * DELETE /customers/:id
 * Path param: id = emailAddress
 * Returns 409 if the customer has existing bookings.
 */
router.delete("/:id", (req, res) => {
  const idx = db.customers.findIndex((c) => c.emailAddress === req.params.id);
  if (idx === -1) {
    return res
      .status(404)
      .json({ error: "Customer not found", emailAddress: req.params.id });
  }

  const activeBookings = db.bookings.filter(
    (b) => b.customerID === req.params.id
  );
  if (activeBookings.length > 0) {
    return res.status(409).json({
      error: "Cannot delete customer with existing bookings",
      bookings: activeBookings.length,
    });
  }

  const [deleted] = db.customers.splice(idx, 1);
  res.json({ message: "Customer deleted successfully", customer: deleted });
});

module.exports = router;
