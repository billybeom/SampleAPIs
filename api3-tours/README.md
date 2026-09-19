# Tours Management API

Sample REST API for **IBM API Connect** demonstrations.  
Based on the open-source [nodetours](https://github.com/przemekulik/nodetours) project, refactored to pure in-memory REST (no MongoDB, no GraphQL).

## Overview

| Item | Value |
|---|---|
| Runtime | Node.js 20 + Express 4 |
| Port | 3002 |
| Auth | None (demo) |
| Storage | In-memory (resets on restart) |
| OpenAPI | `openapi.yaml` (OAS 3.0.3) |

### Resources

| Resource | Base Path | Methods |
|---|---|---|
| Cruises | `/cruises` | GET, GET /:id |
| Customers | `/customers` | GET, POST, GET /:id, PUT /:id, DELETE /:id |
| Bookings | `/bookings` | GET, POST, GET /:id, PUT /:id, DELETE /:id |

---

## Quick Start

```bash
# Clone / enter the directory
cd api3-tours

# Install dependencies
npm install

# Start the server
npm start
# 🚢 Tours Management API running on http://localhost:3002
```

### Verify it's working

```bash
curl http://localhost:3002/health
# {"status":"ok","timestamp":"..."}

curl http://localhost:3002/cruises
# {"total":3,"data":[...]}
```

See [EXAMPLES.md](EXAMPLES.md) for full curl, Python, and JavaScript examples.

---

## Endpoints

### System

| Method | Path | Description |
|---|---|---|
| GET | `/` | API info |
| GET | `/health` | Health check |

### Cruises (read-only)

| Method | Path | Description |
|---|---|---|
| GET | `/cruises` | List cruises (filter: `?startDate`, `?endDate`, `?startPort`, `?numDays`) |
| GET | `/cruises/:id` | Get a cruise by `cruiseID` |

### Customers

| Method | Path | Description |
|---|---|---|
| GET | `/customers` | List all customers |
| POST | `/customers` | Create a customer (409 on duplicate email) |
| GET | `/customers/:id` | Get customer by `emailAddress` |
| PUT | `/customers/:id` | Full update |
| DELETE | `/customers/:id` | Delete (409 if bookings exist) |

### Bookings

| Method | Path | Description |
|---|---|---|
| GET | `/bookings` | List bookings (filter: `?cruiseID`, `?customerID`) |
| POST | `/bookings` | Create booking (validates cruise + customer exist) |
| GET | `/bookings/:id` | Get booking by `bookingID` (integer) |
| PUT | `/bookings/:id` | Update room or status |
| DELETE | `/bookings/:id` | Delete booking |

---

## Seed Data

The server starts with the following in-memory data:

### Cruises

| ID | Title | Port | Days |
|---|---|---|---|
| CRUISE-001 | Mediterranean Discovery | Barcelona | 14 |
| CRUISE-002 | Caribbean Paradise | Miami | 7 |
| CRUISE-003 | Northern Europe Fjords | Copenhagen | 11 |

Each cruise has three room types: **Interior (INT)**, **Balcony (BAL)**, **Suite (STE)**.

### Customers

| Email | Name |
|---|---|
| alice@tours.com | Alice Smith |
| bob@tours.com | Bob Johnson |
| carol@tours.com | Carol Williams |

### Bookings

| ID | Cruise | Customer | Room |
|---|---|---|---|
| 1001 | CRUISE-001 | alice@tours.com | BAL |
| 1002 | CRUISE-003 | bob@tours.com | STE |

---

## Deployment

### Scenario A — OpenShift

#### Prerequisites
- OpenShift CLI (`oc`) logged in
- A container image pushed to an accessible registry

#### Steps

```bash
# 1. Create namespace (project)
oc new-project sample-apis

# 2. Apply ImageStream
oc apply -f openshift/imagestream.yaml

# 3. Build and push the image
# (using OpenShift BuildConfig or external CI — see .github/workflows/ci-tours-api.yml)

# 4. Apply Deployment, Service, Route
oc apply -f openshift/deployment.yaml
oc apply -f openshift/service.yaml
oc apply -f openshift/route.yaml

# 5. Verify
oc get pods -l app=tours-api
oc get route tours-api
curl https://$(oc get route tours-api -o jsonpath='{.spec.host}')/health
```

#### Image Configuration

Edit [`openshift/deployment.yaml`](openshift/deployment.yaml) and replace the `image` value:

```yaml
# Before:
image: image-registry.openshift-image-registry.svc:5000/sample-apis/tours-api:latest

# After (example with GHCR):
image: ghcr.io/your-org/tours-api:latest
```

---

### Scenario B — Kubernetes

#### Prerequisites
- `kubectl` configured and targeting your cluster
- nginx Ingress Controller installed
- Image accessible from cluster nodes

#### Steps

```bash
# 1. Create namespace
kubectl apply -f kubernetes/namespace.yaml

# 2. Deploy application
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml
kubectl apply -f kubernetes/ingress.yaml

# 3. Verify
kubectl get pods -n sample-apis -l app=tours-api
kubectl get ingress -n sample-apis

# 4. Test (after DNS/hosts entry configured)
curl http://tours-api.your-cluster.example.com/health
```

#### Image Configuration

Edit [`kubernetes/deployment.yaml`](kubernetes/deployment.yaml):

```yaml
image: your-registry.example.com/sample-apis/tours-api:latest
```

#### TLS (optional)

Uncomment the `tls:` section in [`kubernetes/ingress.yaml`](kubernetes/ingress.yaml) and configure a TLS Secret or cert-manager annotation.

---

### Scenario C — Linux VM (systemd)

#### Prerequisites
- RHEL 8/9, Rocky Linux 8/9, or Ubuntu 22.04 LTS
- `sudo` or `root` access
- Git (to clone the repository)

#### Steps

```bash
# 1. Clone the repository on the target server
git clone https://github.com/your-org/sample-apis.git /opt/sample-apis-src
cd /opt/sample-apis-src/api3-tours

# 2. Run the install script
sudo bash deploy/vm/install.sh
```

The script performs these actions automatically:

| Step | Action |
|---|---|
| 1 | Installs Node.js 20 LTS (if missing) |
| 2 | Creates `svcapi` system user |
| 3 | Copies app files to `/opt/sample-apis/api3-tours` and runs `npm ci` |
| 4 | Creates `/etc/sample-apis/tours-api.env` |
| 5 | Installs and enables `tours-api.service` systemd unit |
| 6 | Prints service status |

#### Manage the service

```bash
# Status
systemctl status tours-api

# View logs (live)
journalctl -u tours-api -f

# Restart
systemctl restart tours-api

# Stop
systemctl stop tours-api
```

#### Customize port or environment

Edit `/etc/sample-apis/tours-api.env`:

```ini
PORT=3002
NODE_ENV=production
```

Then restart: `systemctl restart tours-api`

---

## Docker

### Build

```bash
docker build -t tours-api:latest .
```

### Run

```bash
docker run -p 3002:3002 tours-api:latest
```

### docker-compose (with other sample APIs)

See [`local-dev/`](../local-dev/) at the repository root for a full compose setup.

---

## Development

```bash
# Hot-reload with nodemon
npm run dev

# Run tests
npm test
```

---

## OpenAPI Specification

The full API spec is in [`openapi.yaml`](openapi.yaml) (OpenAPI 3.0.3).

### Lint with Spectral

```bash
# From repository root
npx @stoplight/spectral-cli lint api3-tours/openapi.yaml --ruleset .spectral.yaml
```

### Import into API Connect

```
IBM API Connect → APIs → Add → From OpenAPI Definition → Upload openapi.yaml
```

---

## License

Apache 2.0 — see [LICENSE](../LICENSE) at the repository root.
