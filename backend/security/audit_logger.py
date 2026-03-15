"""
Audit Logger
Logs security events for auditing.
"""
import logging

class AuditLogger:
    def __init__(self):
        self.logger = logging.getLogger('audit')
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)

    def log_event(self, event, details=None):
        self.logger.info(f'Audit event: {event} | Details: {details}')
