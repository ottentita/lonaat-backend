FROM prom/alertmanager:latest

# Ensure we run as root to install packages
USER root

# Install envsubst (gettext) for template rendering. Use apt if available.
RUN set -eux; \
    if command -v apk >/dev/null 2>&1; then \
        apk add --no-cache gettext; \
    elif command -v apt-get >/dev/null 2>&1; then \
        apt-get update && apt-get install -y --no-install-recommends gettext-base && rm -rf /var/lib/apt/lists/*; \
    elif command -v yum >/dev/null 2>&1; then \
        yum install -y gettext && yum clean all; \
    else \
        echo "No known package manager to install gettext. Please build with a base image that supports package installation." >&2; exit 1; \
    fi

# Revert to original user (if necessary)
USER 65534

# Default entrypoint renders template if present and launches alertmanager.
ENTRYPOINT ["/bin/sh", "-c"]
CMD ["if [ -f /etc/alertmanager/config.yml.tmpl ]; then envsubst < /etc/alertmanager/config.yml.tmpl > /etc/alertmanager/config.yml; fi && exec /bin/alertmanager --config.file=/etc/alertmanager/config.yml"]
