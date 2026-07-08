# Installation Guide

Everything runs in Docker, so you don't need Python, Node, or PostgreSQL installed on your machine. Just Docker.

## Before you start

Make sure you have:

- Docker and Docker Compose. Docker Desktop comes with both; on Linux you need Docker Engine 20.10 or newer and the compose plugin.
- Ports 5173, 8000, and 5432 free.
- About 1 GB of free disk space for the recipe data.

## Steps

1. Clone the repository and move into it:

   ```bash
   git clone https://github.com/Tejas1305/13_Tejas.D-diet-recommender.git
   cd 13_Tejas.D-diet-recommender
   ```

2. Build and start everything:

   ```bash
   docker compose up
   ```

   The first run takes a few minutes. It builds the images and loads the recipe data into the backend. The backend waits for the database to report healthy before it starts, so you don't have to worry about the order things come up in.

3. Open http://localhost:5173 in your browser.

## Checking it worked

Once it's running, these are the addresses:

| Service | Address |
|---|---|
| Web app | http://localhost:5173 |
| API | http://localhost:8000 |
| API docs | http://localhost:8000/docs |
| Health check | http://localhost:8000/health |

To confirm the backend can reach the database, hit the health check:

```bash
curl http://localhost:8000/health
# {"api":"ok","db":"up"}
```

If `db` shows `up`, everything is wired correctly.

## Settings (optional)

The app runs with sensible defaults and needs no configuration. If you want to change the database name and password or the login secret, copy the example file and edit it:

```bash
cp .env.example .env
```

The value worth changing for a real deployment is `JWT_SECRET`. The default is fine on your own machine but should not be used anywhere public, since it's what signs login tokens.

## Stopping

```bash
docker compose down      # stop and remove the containers
docker compose down -v   # also wipe the database for a clean start
```
