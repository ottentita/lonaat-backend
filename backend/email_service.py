"""
Email Notification Service for Lonaat
Supports SMTP providers: Brevo (SendinBlue), Mailgun, SendGrid
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app
import logging

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, message: str, html: bool = True) -> bool:
    """
    Send email notification via SMTP
    
    Args:
        to: Recipient email address
        subject: Email subject line
        message: Email body (HTML or plain text)
        html: Whether message is HTML (default True)
    
    Returns:
        bool: True if sent successfully, False otherwise
    """
    if not current_app.config.get('EMAIL_ENABLED'):
        logger.warning(f"📧 Email disabled - Would send to {to}: {subject}")
        return False
    
    try:
        host = current_app.config['EMAIL_HOST']
        port = current_app.config['EMAIL_PORT']
        user = current_app.config['EMAIL_USER']
        password = current_app.config['EMAIL_PASS']
        sender = current_app.config['EMAIL_SENDER']
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = sender
        msg['To'] = to
        
        if html:
            msg.attach(MIMEText(message, 'html'))
        else:
            msg.attach(MIMEText(message, 'plain'))
        
        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)
        
        logger.info(f"✅ Email sent to {to}: {subject}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Email send failed to {to}: {str(e)}")
        return False


def send_welcome_email(user_email: str, user_name: str) -> bool:
    """Send welcome email to new user"""
    subject = "Welcome to Lonaat - Start Earning with Affiliate Marketing"
    message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #4F46E5;">Welcome to Lonaat, {user_name}! 🎉</h2>
        <p>Thank you for joining Lonaat, the AI-powered affiliate marketing platform.</p>
        
        <h3>What's Next?</h3>
        <ul>
            <li>Connect your favorite affiliate networks (Amazon, ShareASale, CJ, Impact, and more)</li>
            <li>Import products or let our AI find winning offers</li>
            <li>Generate AI-powered ad copy and descriptions</li>
            <li>Post to social media and track your earnings</li>
            <li>Withdraw your commissions via direct bank transfer</li>
        </ul>
        
        <p><strong>Your referral code:</strong> Check your dashboard to invite friends and earn bonuses!</p>
        
        <p>If you have any questions, contact us at {current_app.config['ADMIN_EMAIL']}</p>
        
        <p>Happy marketing!<br>
        The Lonaat Team</p>
    </body>
    </html>
    """
    return send_email(user_email, subject, message)


def send_commission_approved_email(user_email: str, user_name: str, amount: float, product_name: str) -> bool:
    """Send email when commission is approved"""
    subject = f"Commission Approved - XAF {amount:,.2f}"
    message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #10B981;">Commission Approved! 💰</h2>
        <p>Hi {user_name},</p>
        
        <p>Great news! Your commission has been approved and added to your balance.</p>
        
        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Product:</strong> {product_name}</p>
            <p><strong>Commission Amount:</strong> XAF {amount:,.2f}</p>
        </div>
        
        <p>Your new balance is ready for withdrawal once you reach the minimum threshold.</p>
        
        <p>Keep up the great work!<br>
        The Lonaat Team</p>
    </body>
    </html>
    """
    return send_email(user_email, subject, message)


def send_withdrawal_approved_email(user_email: str, user_name: str, amount: float, bank_name: str, account_number: str) -> bool:
    """Send email when withdrawal is approved and paid"""
    masked_account = account_number[-4:].rjust(len(account_number), '*')
    subject = f"Withdrawal Processed - XAF {amount:,.2f}"
    message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #10B981;">Withdrawal Successful! 💸</h2>
        <p>Hi {user_name},</p>
        
        <p>Your withdrawal request has been approved and the funds have been transferred to your bank account.</p>
        
        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Amount:</strong> XAF {amount:,.2f}</p>
            <p><strong>Bank:</strong> {bank_name}</p>
            <p><strong>Account:</strong> {masked_account}</p>
        </div>
        
        <p>Please allow 1-3 business days for the transfer to appear in your account.</p>
        
        <p>Thank you for using Lonaat!<br>
        The Lonaat Team</p>
    </body>
    </html>
    """
    return send_email(user_email, subject, message)


def send_withdrawal_requested_email(user_email: str, user_name: str, amount: float) -> bool:
    """Send email confirming withdrawal request received"""
    subject = f"Withdrawal Request Received - XAF {amount:,.2f}"
    message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #4F46E5;">Withdrawal Request Received ⏳</h2>
        <p>Hi {user_name},</p>
        
        <p>We've received your withdrawal request for <strong>XAF {amount:,.2f}</strong>.</p>
        
        <p>Our team will review your request and process the payment within 1-3 business days.</p>
        
        <p>You'll receive another email once the payment has been transferred to your bank account.</p>
        
        <p>Best regards,<br>
        The Lonaat Team</p>
    </body>
    </html>
    """
    return send_email(user_email, subject, message)


def send_fraud_alert_email(user_email: str, user_name: str, reason: str, admin_copy: bool = True) -> bool:
    """Send fraud alert to user and admin"""
    subject = "Security Review Required - Account Activity"
    message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #EF4444;">Security Review Required ⚠️</h2>
        <p>Hi {user_name},</p>
        
        <p>We've detected unusual activity on your account that requires review:</p>
        
        <div style="background-color: #FEF2F2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;">
            <p><strong>Reason:</strong> {reason}</p>
        </div>
        
        <p>Your account access may be temporarily limited while we review this activity.</p>
        
        <p>If you believe this is a mistake, please contact us at {current_app.config['ADMIN_EMAIL']}</p>
        
        <p>Best regards,<br>
        The Lonaat Security Team</p>
    </body>
    </html>
    """
    
    success = send_email(user_email, subject, message)
    
    if admin_copy and success:
        admin_subject = f"FRAUD ALERT: {user_name} ({user_email})"
        admin_message = f"""
        <html>
        <body>
            <h2>Fraud Alert</h2>
            <p><strong>User:</strong> {user_name} ({user_email})</p>
            <p><strong>Reason:</strong> {reason}</p>
            <p>Review required in Admin Fraud Center.</p>
        </body>
        </html>
        """
        send_email(current_app.config['ADMIN_EMAIL'], admin_subject, admin_message)
    
    return success
