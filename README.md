# DevPulse

FastAPI-based website monitoring and observability system with PostgreSQL persistence, asynchronous health checks, metrics aggregation, service logs, and realtime WebSocket alerts.

## Project Description

DevPulse is a lightweight monitoring platform that continuously checks a list of configured services, records the outcome of each check, tracks latency and uptime, and pushes live status changes to connected clients over WebSockets.

The system is intentionally simple in architecture, but it uses the same core patterns you would expect in a production backend:

- async I/O for external health checks
- ORM-backed persistence with SQLAlchemy
- versioned schema management with Alembic
- event-driven realtime updates through WebSockets
- clear separation between routes, services, schemas, models, and infrastructure code

The frontend is a React dashboard that consumes the REST API and listens to the WebSocket stream for live updates.

## Features

- Add monitored services by URL
- Periodic asynchronous health checks
- Uptime and latency tracking
- Failure threshold logic before marking a service as down
- Realtime WebSocket status updates
- Event-driven alert broadcasting
- Aggregated metrics endpoint
- Service-level monitoring logs
- PostgreSQL persistence
- Alembic migrations for schema evolution
- REST API for dashboard integration
- React frontend for operational visibility

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Backend API | FastAPI, Pydantic |
| Async networking | asyncio, httpx |
| Persistence | PostgreSQL, SQLAlchemy |
| Migrations | Alembic |
| Realtime | FastAPI WebSockets |
| Frontend | React, Vite, WebSocket client |

## System Architecture

DevPulse is organized around one background monitoring loop and one API layer.

```mermaid
flowchart LR
    A[User adds service] --> B[POST /services]
    B --> C[Validate URL with httpx]
    C --> D[Persist Service row]

    E[Background monitor_services loop] --> F[Load all services]
    F --> G[asyncio.gather per-service checks]
    G --> H[check_url via httpx.AsyncClient]
    H --> I[Store Log row]
    H --> J[Update Service row]
    H --> K[Broadcast STATUS_UPDATE]
    J --> L{Failure threshold reached?}
    L -- Yes --> M[Create Alert row]
    M --> N[Broadcast ALERT]

    O[Frontend dashboard] <-->|REST| P[GET /services, /metrics, /services/{id}/logs]
    O <-->|WebSocket /ws| N
    O <-->|WebSocket /ws| K
```

### Why the architecture looks like this

- The monitoring workload is I/O bound, so async checks are a better fit than threaded or sequential checks.
- The system stores every check as a log entry so the dashboard can show historical failures, response times, and success rates.
- WebSocket events are emitted only when something changes, which keeps the UI responsive without polling.
- Alembic is used so schema changes are traceable and repeatable across environments.

## Folder Structure

```text
DevPUlse/
├── backend/
│   ├── main.py
│   ├── run.py
│   ├── database.py
│   ├── core/
│   │   ├── config.py
│   │   └── database.py
│   ├── models/
│   │   ├── alert.py
│   │   ├── logs.py
│   │   └── services.py
│   ├── routes/
│   │   └── monitor.py
│   ├── schemas/
│   │   ├── response.py
│   │   └── service.py
│   ├── services/
│   │   ├── checker.py
│   │   ├── cleanup.py
│   │   ├── monitor.py
│   │   └── validator.py
│   ├── websocket/
│   │   └── manager.py
│   └── alembic/
│       ├── env.py
│       └── versions/
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── hooks/
    │   ├── pages/
    │   ├── services/
    │   └── utils/
    ├── index.html
    └── vite.config.js
```

## Monitoring Flow Explanation

1. When the FastAPI app starts, the lifespan handler launches `monitor_services()` as a background task.
2. The monitoring loop loads all services from the database.
3. Each service is checked concurrently using `asyncio.gather()`.
4. `check_url()` performs a non-blocking HTTP GET request with `httpx.AsyncClient`.
5. The result is stored as a `Log` record, and the corresponding `Service` row is updated with the latest state.
6. If a service succeeds, its failure counter is reset to zero.
7. If a service fails, its failure counter increments.
8. When the failure threshold is reached, the service is marked down and an `Alert` row is created.
9. The loop broadcasts realtime WebSocket events so the dashboard reflects the change immediately.

### Why `asyncio.gather()` is used

The health checks are network I/O bound. Running them sequentially would make the entire monitoring cycle wait on each service one after another. `asyncio.gather()` lets the backend check all services concurrently and finish in roughly the time of the slowest request instead of the sum of all requests.

### Why UTC timestamps are used

Monitoring data should be independent of the machine’s local timezone. Storing timestamps in UTC avoids ambiguity, keeps logs consistent across deployments, and makes metrics windows easier to calculate. The frontend can then render the same timestamp in the user’s preferred timezone or as a relative time label.

## WebSocket Flow Explanation

The frontend connects to `GET /ws` and keeps the socket open for live events.

The backend broadcasts two event types:

- `STATUS_UPDATE` when a service check completes
- `ALERT` when a service crosses the failure threshold and is marked down

This is event-driven instead of poll-based because the dashboard only needs to react when something changes. That reduces unnecessary requests, avoids stale UI state, and makes the operational view feel realtime.

## API Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Basic application status message |
| `POST` | `/services` | Add a new monitored service |
| `GET` | `/services` | List all monitored services |
| `GET` | `/metrics?hours=24` | Return aggregated metrics for the requested time window |
| `GET` | `/services/{service_id}/logs?limit=5&offset=0` | Return logs for a specific service |
| `WS` | `/ws` | Realtime monitoring updates |

### Endpoint Details

#### `POST /services`

Creates a monitored service after validating that the URL is reachable.

Request body:

```json
{
  "url": "https://example.com"
}
```

#### `GET /services`

Returns the current service list as `ServiceResponse` objects.

#### `GET /metrics`

Returns aggregated counts for services and logs, along with latency and uptime summary values.

#### `GET /services/{service_id}/logs`

Returns the latest logs for a specific service, ordered by newest first.

## Database Models

### `services`

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | Integer | Primary key |
| `url` | String | Unique monitored URL |
| `is_up` | Boolean | Current service status |
| `description` | String | Optional service description |
| `last_latency` | Float | Most recent latency in ms |
| `last_status_code` | Integer | Most recent HTTP status code |
| `failure_count` | Integer | Consecutive failure counter |
| `last_checked` | String | Last check timestamp |
| `created_at` | DateTime | Row creation time |

### `logs`

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | Integer | Primary key |
| `service_id` | Integer | Foreign key to `services.id` |
| `status_code` | Integer | HTTP status returned by the check |
| `latency` | Float | Request latency in ms |
| `success` | Boolean | Whether the check succeeded |
| `error` | String | Error text if the request failed |
| `created_at` | DateTime | Log timestamp |

### `alerts`

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | Integer | Primary key |
| `service_id` | Integer | Foreign key to `services.id` |
| `message` | String | Human-readable alert message |
| `created_at` | DateTime | Alert timestamp |

## Installation

### Prerequisites

- Python 3.10+ recommended
- PostgreSQL 13+ recommended
- Node.js 18+ recommended for the frontend

### Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend setup

```bash
cd frontend
npm install
```

## Environment Variables

Create a `.env` file in the backend directory.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by SQLAlchemy and Alembic |

Example:

```env
DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/devpulse
```

For the frontend, you can optionally set the API base URL:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Running Backend

1. Make sure PostgreSQL is running and `DATABASE_URL` is valid.
2. Apply migrations.
3. Start the FastAPI server.

```bash
cd backend
alembic upgrade head
python run.py
```

The backend will start on `http://localhost:8000`.

## Running Frontend

```bash
cd frontend
npm run dev
```

If `VITE_API_BASE_URL` is not set, the frontend will talk to `http://127.0.0.1:8000` by default.

## Docker Setup

The project can also be run using Docker Compose.

### Start Services

```bash
docker compose up --build
```

This starts:

- FastAPI backend container
- PostgreSQL container
- Shared Docker network
- Persistent PostgreSQL volume

### Apply Migrations

```bash
docker compose exec backend alembic upgrade head
```

### Stop Services

```bash
docker compose down
```

### Stop Services and Remove Database Volume

```bash
docker compose down -v
```

### Docker Architecture

```text
Docker Network
├── backend
└── postgres
```

The backend communicates with PostgreSQL using the service name:

```env
DATABASE_URL=postgresql+psycopg2://postgres:password@postgres:5432/devpulse
```

Inside Docker, `localhost` refers to the container itself, so service-to-service communication uses Docker service names instead.

## Alembic Migration Commands

Common migration commands used in this project:

```bash
cd backend
alembic revision --autogenerate -m "describe change"
alembic upgrade head
alembic downgrade -1
alembic history
```

### Why Alembic is used

Monitoring systems are schema-driven: logs, alerts, and service state need to stay consistent over time. Alembic gives versioned migrations, repeatable upgrades, and a clear history of database changes, which is safer than editing tables manually.

## Example API Requests

### Add a service

```bash
curl -X POST http://localhost:8000/services \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://example.com\"}"
```

### Fetch services

```bash
curl http://localhost:8000/services
```

### Fetch metrics

```bash
curl "http://localhost:8000/metrics?hours=24"
```

### Fetch logs for a service

```bash
curl "http://localhost:8000/services/1/logs?limit=20&offset=0"
```

## Example WebSocket Events

### Status update

```json
{
  "type": "STATUS_UPDATE",
  "service": "https://google.com",
  "is_up": true,
  "latency": 120,
  "status_code": 200,
  "failure_count": 0
}
```

### Alert

```json
{
  "type": "ALERT",
  "service": "https://example.com",
  "message": "Service DOWN"
}
```

## Future Improvements

- Add authenticated access for the dashboard and API
- Add service edit/delete endpoints
- Expose alert history through a REST endpoint
- Add websocket heartbeat and richer reconnect handling
- Add configurable monitoring intervals via environment variables
- Containerize backend, frontend, and PostgreSQL with Docker Compose
- Add tests for the monitoring loop and API routes
- Add richer service metadata and per-service status history

## Backend Concepts Learned

- Async background processing in FastAPI
- I/O-bound concurrency with `asyncio.gather()`
- WebSocket broadcasting for event-driven UI updates
- SQLAlchemy ORM modeling
- Separation of routes, services, schemas, and infrastructure code
- Database migration management with Alembic
- UTC-based timestamp handling for consistent monitoring data
- Failure-threshold-based health status transitions
- Aggregation of operational metrics from log data

## Screenshots

Add screenshots here once the dashboard is finalized.

```text
[Dashboard screenshot placeholder]
[Logs panel screenshot placeholder]
[Metrics screenshot placeholder]
```

## License

No license file is currently included in this repository.

If you plan to publish or distribute the project, add a license file before doing so.
