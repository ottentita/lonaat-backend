# Prometheus metrics for render worker
from prometheus_client import Counter, Gauge, Histogram, start_http_server

render_success_total = Counter('render_success_total', 'Total successful renders')
render_failure_total = Counter('render_failure_total', 'Total failed renders')
render_queue_length = Gauge('render_queue_length', 'Current length of render queue')
render_duration_seconds = Histogram('render_duration_seconds', 'Render duration in seconds')

# To be imported and used in render_worker.py
