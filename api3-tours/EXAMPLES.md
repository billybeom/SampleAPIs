# Tours Management API — Usage Examples

This document shows complete usage examples for every endpoint.

- [Prerequisites](#prerequisites)
- [curl Examples](#curl-examples)
- [Python requests Examples](#python-requests-examples)
- [JavaScript fetch Examples](#javascript-fetch-examples)
- [Error Case Examples](#error-case-examples)
- [Postman Usage](#postman-usage)

---

## Prerequisites

Start the server locally:

```bash
cd api3-tours
npm install
npm start
# 🚢 Tours Management API running on http://localhost:3002
```

All examples below assume `BASE_URL=http://localhost:3002`.

---

## curl Examples

### System

#### Health check

```bash
curl http://localhost:3002/health
```

```json
{ "status": "ok", "timestamp": "2025-01-15T10:00:00.000Z" }
```

#### API info

```bash
curl http://localhost:3002/
```

---

### Cruises

#### List all cruises

```bash
curl http://localhost:3002/cruises
```

```json
{
  "total": 3,
  "data": [
    {
      "cruiseID": "CRUISE-001",
      "title": "Mediterranean Discovery",
      "startDate": "2025-06-01",
      "endDate": "2025-06-15",
      "startPort": "Barcelona",
      "numDays": 14,
      "roomTypes": [...]
    },
    ...
  ]
}
```

#### Filter by departure port

```bash
curl "http://localhost:3002/cruises?startPort=Miami"
```

#### Filter by date range

```bash
curl "http://localhost:3002/cruises?startDate=2025-08-01&endDate=2025-09-30"
```

#### Filter by duration

```bash
curl "http://localhost:3002/cruises?numDays=7"
```

#### Combine filters

```bash
curl "http://localhost:3002/cruises?startPort=Copenhagen&numDays=11"
```

#### Get a single cruise

```bash
curl http://localhost:3002/cruises/CRUISE-001
```

```json
{
  "cruiseID": "CRUISE-001",
  "title": "Mediterranean Discovery",
  "description": "Experience the breathtaking beauty of the Mediterranean...",
  "startDate": "2025-06-01",
  "endDate": "2025-06-15",
  "startPort": "Barcelona",
  "numDays": 14,
  "roomTypes": [
    {
      "roomID": "INT",
      "name": "Interior Cabin",
      "description": "Comfortable interior cabin with all amenities",
      "maxOccupancy": 2,
      "pricePerNight": 120,
      "currency": "USD"
    },
    {
      "roomID": "BAL",
      "name": "Balcony Cabin",
      "description": "Spacious cabin with private balcony and sea view",
      "maxOccupancy": 2,
      "pricePerNight": 220,
      "currency": "USD"
    },
    {
      "roomID": "STE",
      "name": "Suite",
      "description": "Luxurious suite with panoramic ocean views and butler service",
      "maxOccupancy": 4,
      "pricePerNight": 550,
      "currency": "USD"
    }
  ]
}
```

---

### Customers

#### List all customers

```bash
curl http://localhost:3002/customers
```

```json
{
  "total": 3,
  "data": [
    { "emailAddress": "alice@tours.com", "firstName": "Alice", "lastName": "Smith", ... },
    { "emailAddress": "bob@tours.com",   "firstName": "Bob",   "lastName": "Johnson", ... },
    { "emailAddress": "carol@tours.com", "firstName": "Carol", "lastName": "Williams", ... }
  ]
}
```

#### Get a customer by email

```bash
curl http://localhost:3002/customers/alice@tours.com
```

#### Create a new customer (minimal)

```bash
curl -s -X POST http://localhost:3002/customers \
  -H "Content-Type: application/json" \
  -d '{
    "emailAddress": "dave@tours.com",
    "firstName": "Dave",
    "lastName": "Brown"
  }'
```

```json
{
  "emailAddress": "dave@tours.com",
  "firstName": "Dave",
  "lastName": "Brown",
  "phone": null,
  "address": {},
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

#### Create a new customer (full)

```bash
curl -s -X POST http://localhost:3002/customers \
  -H "Content-Type: application/json" \
  -d '{
    "emailAddress": "eva@tours.com",
    "firstName": "Eva",
    "lastName": "Martinez",
    "phone": "+34-91-000-0001",
    "address": {
      "street": "1 Gran Via",
      "city": "Madrid",
      "state": "",
      "postalCode": "28001",
      "country": "Spain"
    }
  }'
```

#### Update a customer

```bash
curl -s -X PUT http://localhost:3002/customers/dave@tours.com \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "David",
    "lastName": "Brown-Jr",
    "phone": "+1-555-0199"
  }'
```

#### Delete a customer

```bash
curl -s -X DELETE http://localhost:3002/customers/dave@tours.com
```

```json
{ "message": "Customer deleted successfully", "customer": { ... } }
```

---

### Bookings

#### List all bookings

```bash
curl http://localhost:3002/bookings
```

#### Filter bookings by cruise

```bash
curl "http://localhost:3002/bookings?cruiseID=CRUISE-001"
```

#### Filter bookings by customer

```bash
curl "http://localhost:3002/bookings?customerID=alice@tours.com"
```

#### Get a single booking

```bash
curl http://localhost:3002/bookings/1001
```

```json
{
  "bookingID": 1001,
  "cruiseID": "CRUISE-001",
  "customerID": "alice@tours.com",
  "room": { "roomID": "BAL", "numRooms": 1 },
  "status": "confirmed",
  "bookedAt": "2024-11-01T08:00:00.000Z"
}
```

#### Create a booking

```bash
curl -s -X POST http://localhost:3002/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "cruiseID": "CRUISE-002",
    "customerID": "carol@tours.com",
    "room": { "roomID": "BAL", "numRooms": 1 }
  }'
```

```json
{
  "bookingID": 1003,
  "cruiseID": "CRUISE-002",
  "customerID": "carol@tours.com",
  "room": { "roomID": "BAL", "numRooms": 1 },
  "status": "confirmed",
  "bookedAt": "2025-01-15T10:00:00.000Z"
}
```

#### Update a booking (room upgrade)

```bash
curl -s -X PUT http://localhost:3002/bookings/1003 \
  -H "Content-Type: application/json" \
  -d '{
    "room": { "roomID": "STE", "numRooms": 1 }
  }'
```

#### Cancel a booking

```bash
curl -s -X PUT http://localhost:3002/bookings/1003 \
  -H "Content-Type: application/json" \
  -d '{ "status": "cancelled" }'
```

#### Delete a booking

```bash
curl -s -X DELETE http://localhost:3002/bookings/1003
```

---

### Complete end-to-end scenario (curl)

```bash
BASE=http://localhost:3002

# 1. Create a new customer
curl -s -X POST $BASE/customers \
  -H "Content-Type: application/json" \
  -d '{"emailAddress":"frank@tours.com","firstName":"Frank","lastName":"Lee"}' | jq .

# 2. Browse available cruises
curl -s "$BASE/cruises?numDays=7" | jq .

# 3. Book a cruise
curl -s -X POST $BASE/bookings \
  -H "Content-Type: application/json" \
  -d '{"cruiseID":"CRUISE-002","customerID":"frank@tours.com","room":{"roomID":"INT","numRooms":1}}' | jq .
# Returns bookingID (e.g. 1003)

# 4. View the booking
curl -s $BASE/bookings/1003 | jq .

# 5. Upgrade to Balcony Cabin
curl -s -X PUT $BASE/bookings/1003 \
  -H "Content-Type: application/json" \
  -d '{"room":{"roomID":"BAL","numRooms":1}}' | jq .

# 6. Delete the booking
curl -s -X DELETE $BASE/bookings/1003 | jq .

# 7. Delete the customer (no bookings remain)
curl -s -X DELETE $BASE/customers/frank@tours.com | jq .
```

---

## Python requests Examples

```python
import requests

BASE = "http://localhost:3002"

# ── Health check ──────────────────────────────────────────────
r = requests.get(f"{BASE}/health")
print(r.json())  # {'status': 'ok', 'timestamp': '...'}

# ── List all cruises ──────────────────────────────────────────
r = requests.get(f"{BASE}/cruises")
data = r.json()
print(f"Total cruises: {data['total']}")
for cruise in data['data']:
    print(f"  {cruise['cruiseID']}: {cruise['title']} ({cruise['numDays']} days from {cruise['startPort']})")

# ── Filter cruises ────────────────────────────────────────────
r = requests.get(f"{BASE}/cruises", params={"startPort": "Miami"})
print(r.json())

# ── Get a single cruise ───────────────────────────────────────
r = requests.get(f"{BASE}/cruises/CRUISE-001")
cruise = r.json()
print(f"Room types: {[rt['name'] for rt in cruise['roomTypes']]}")

# ── Create a customer ─────────────────────────────────────────
payload = {
    "emailAddress": "python_user@tours.com",
    "firstName": "Python",
    "lastName": "Tester",
    "phone": "+1-555-0200",
    "address": {"city": "Boston", "country": "USA"}
}
r = requests.post(f"{BASE}/customers", json=payload)
print(r.status_code)  # 201
customer = r.json()
print(customer)

# ── Create a booking ──────────────────────────────────────────
booking_payload = {
    "cruiseID": "CRUISE-003",
    "customerID": "python_user@tours.com",
    "room": {"roomID": "BAL", "numRooms": 1}
}
r = requests.post(f"{BASE}/bookings", json=booking_payload)
booking = r.json()
booking_id = booking["bookingID"]
print(f"Booking ID: {booking_id}")

# ── Update a booking ──────────────────────────────────────────
r = requests.put(f"{BASE}/bookings/{booking_id}",
                 json={"room": {"roomID": "STE", "numRooms": 1}})
print(r.json())

# ── Delete booking and customer ───────────────────────────────
requests.delete(f"{BASE}/bookings/{booking_id}")
requests.delete(f"{BASE}/customers/python_user@tours.com")
```

---

## JavaScript fetch Examples

```javascript
const BASE = 'http://localhost:3002';

// ── Health check ──────────────────────────────────────────────
const health = await fetch(`${BASE}/health`).then(r => r.json());
console.log(health); // { status: 'ok', timestamp: '...' }

// ── List all cruises ──────────────────────────────────────────
const cruises = await fetch(`${BASE}/cruises`).then(r => r.json());
console.log(`Total cruises: ${cruises.total}`);

// ── Filter cruises by port ────────────────────────────────────
const params = new URLSearchParams({ startPort: 'Barcelona' });
const filtered = await fetch(`${BASE}/cruises?${params}`).then(r => r.json());
console.log(filtered);

// ── Create a customer ─────────────────────────────────────────
const newCustomer = await fetch(`${BASE}/customers`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emailAddress: 'js_user@tours.com',
    firstName: 'JavaScript',
    lastName: 'Tester'
  })
}).then(r => r.json());
console.log(newCustomer); // { emailAddress: 'js_user@tours.com', ... }

// ── Create a booking ──────────────────────────────────────────
const booking = await fetch(`${BASE}/bookings`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cruiseID: 'CRUISE-002',
    customerID: 'js_user@tours.com',
    room: { roomID: 'INT', numRooms: 1 }
  })
}).then(r => r.json());
const bookingId = booking.bookingID;
console.log(`Booking created: #${bookingId}`);

// ── Update booking ────────────────────────────────────────────
const updated = await fetch(`${BASE}/bookings/${bookingId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ room: { roomID: 'BAL', numRooms: 1 } })
}).then(r => r.json());
console.log(updated);

// ── Cleanup ───────────────────────────────────────────────────
await fetch(`${BASE}/bookings/${bookingId}`, { method: 'DELETE' });
await fetch(`${BASE}/customers/js_user@tours.com`, { method: 'DELETE' });
```

---

## Error Case Examples

### 404 — Cruise not found

```bash
curl -i http://localhost:3002/cruises/CRUISE-999
```

```
HTTP/1.1 404 Not Found
Content-Type: application/json

{"error":"Cruise not found","cruiseID":"CRUISE-999"}
```

### 404 — Customer not found

```bash
curl -i http://localhost:3002/customers/nobody@tours.com
```

```
HTTP/1.1 404 Not Found

{"error":"Customer not found","emailAddress":"nobody@tours.com"}
```

### 409 — Duplicate email on customer creation

```bash
curl -i -X POST http://localhost:3002/customers \
  -H "Content-Type: application/json" \
  -d '{"emailAddress":"alice@tours.com","firstName":"Alice","lastName":"X"}'
```

```
HTTP/1.1 409 Conflict

{"error":"A customer with this email address already exists","emailAddress":"alice@tours.com"}
```

### 409 — Delete customer with active bookings

```bash
curl -i -X DELETE http://localhost:3002/customers/alice@tours.com
```

```
HTTP/1.1 409 Conflict

{"error":"Cannot delete customer with existing bookings","bookings":1}
```

### 400 — Missing required field on booking

```bash
curl -i -X POST http://localhost:3002/bookings \
  -H "Content-Type: application/json" \
  -d '{"cruiseID":"CRUISE-001"}'
```

```
HTTP/1.1 400 Bad Request

{"error":"cruiseID, customerID, and room.roomID are required fields"}
```

### 404 — Booking not found

```bash
curl -i http://localhost:3002/bookings/9999
```

```
HTTP/1.1 404 Not Found

{"error":"Booking not found","bookingID":9999}
```

### 400 — Invalid roomID for cruise

```bash
curl -i -X POST http://localhost:3002/bookings \
  -H "Content-Type: application/json" \
  -d '{"cruiseID":"CRUISE-001","customerID":"alice@tours.com","room":{"roomID":"INVALID","numRooms":1}}'
```

```
HTTP/1.1 400 Bad Request

{
  "error": "Invalid roomID for this cruise",
  "roomID": "INVALID",
  "availableRooms": ["INT", "BAL", "STE"]
}
```

---

## Postman Usage

### Import the collection

1. Open Postman
2. Click **Import** → select `postman/IBM-API-Connect-SampleAPIs.postman_collection.json`
3. The collection includes a **📍 API 3 — Tours Management** folder

### Environment variables

The collection uses a `TOURS_URL` variable (default: `http://localhost:3002`).  
To override for a different environment, create a Postman Environment with:

| Variable | Value |
|---|---|
| `TOURS_URL` | `http://localhost:3002` |

### Folder structure

```
📁 API 3 — Tours Management
  📁 System
    ✅ Health Check
    ✅ API Info
  📁 Cruises
    ✅ List All Cruises
    ✅ Get Cruise by ID
    ✅ Filter by Port
    ✅ Filter by Duration
  📁 Customers
    ✅ List All Customers
    ✅ Create Customer
    ✅ Get Customer
    ✅ Update Customer
    ✅ Delete Customer
  📁 Bookings
    ✅ List All Bookings
    ✅ Create Booking
    ✅ Get Booking
    ✅ Update Booking (Upgrade Room)
    ✅ Delete Booking
  📁 Error Cases
    ✅ 404 Cruise Not Found
    ✅ 409 Duplicate Customer
    ✅ 409 Delete Customer with Bookings
    ✅ 400 Missing Fields
```

Each request includes Postman test scripts that validate status codes and response structure.
