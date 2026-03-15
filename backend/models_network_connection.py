from models import db
from datetime import datetime


class NetworkConnection(db.Model):
    """Affiliate network connection with user-specific affiliate IDs"""
    __tablename__ = 'network_connections'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    network_id = db.Column(db.String(50), nullable=False, index=True)
    affiliate_id = db.Column(db.String(255), nullable=False)
    api_key = db.Column(db.Text, nullable=True)
    api_secret = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    user = db.relationship('User', backref='network_connections')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'network_id': self.network_id,
            'affiliate_id': self.affiliate_id,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<NetworkConnection User:{self.user_id} Network:{self.network_id}>'
