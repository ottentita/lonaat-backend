Local alert testing

Prerequisites: `docker compose` available and the stack started (`docker compose up -d`).

1) Start services (defaults will configure MailHog as the SMTP provider):

```bash
docker compose up -d redis backend-api phase9-worker prometheus grafana alertmanager mailhog webhook-receiver
```

2) Verify Alertmanager UI is reachable:

- Alertmanager: http://localhost:9093
- MailHog UI (captures email): http://localhost:8025
- Webhook receiver (echo): http://localhost:5001

3) Send a test alert directly to Alertmanager (bypasses Prometheus):

```bash
curl -XPOST -H "Content-Type: application/json" \
  -d '[{"labels":{"alertname":"TestAlert","severity":"critical"},"annotations":{"summary":"test","description":"This is a test"}}]' \
  http://localhost:9093/api/v1/alerts
```

This should cause Alertmanager to deliver to the `email` receiver (MailHog) and `webhook` receiver. Check MailHog UI at http://localhost:8025 and the webhook output (the webhook-receiver logs or HTTP response at http://localhost:5001).

Environment variables

- You can override the alert email and SMTP settings by setting the following environment variables before starting the stack (or by editing `docker-compose.yml`):

  - `ALERT_EMAIL` — recipient address (default `alerts@example.com`)
  - `SMTP_HOST` — SMTP host (default `mailhog`)
  - `SMTP_PORT` — SMTP port (default `1025`)
  - `SMTP_USER` — SMTP username (default empty)
  - `SMTP_PASSWORD` — SMTP password (default empty)

Example (bash):

```bash
ALERT_EMAIL=you@example.com SMTP_HOST=smtp.example.com SMTP_PORT=587 docker compose up -d alertmanager mailhog
```

4) Test Prometheus-driven alert (simulate DLQ):

Push an item to Redis DLQ to trigger `HighDeadLetterQueue`:

```bash
docker compose exec redis redis-cli LPUSH event_dead_letter_queue '{"id":"test-alert"}'
```

Prometheus evaluates rules every 5s and `HighDeadLetterQueue` has `for: 5m` in production; to test quickly you can temporarily edit `monitoring/prometheus/alerts.yml` reducing `for` to `10s`, then reload Prometheus:

```bash
# reload Prometheus config
docker compose kill -s HUP lonaat-prometheus
```

After reducing `for`, the alert should fire and be delivered by Alertmanager.

5) Test heartbeat alert:

Delete the heartbeat key so `worker_heartbeat_age_seconds` becomes large:

```bash
docker compose exec redis redis-cli DEL worker:last_heartbeat
```

Again, adjust the `for` duration for quicker testing or wait for the configured window.

Notes:
- For production, replace MailHog with a real SMTP smarthost in `monitoring/alertmanager/config.yml` and set real recipients.
- To inspect Alertmanager delivery logs, view the `alertmanager` container logs:

```bash
docker compose logs -f alertmanager
```
