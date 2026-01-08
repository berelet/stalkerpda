"""
Email utility for sending password reset emails via Google SMTP
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

def send_password_reset_email(to_email: str, reset_link: str, expiry_time: str):
    """Send password reset email via Google SMTP"""
    
    smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))
    smtp_user = os.environ['SMTP_USER']
    smtp_password = os.environ['SMTP_PASSWORD']
    
    subject = "[PDA ZONE] Security Override Protocol - Password Reset"
    
    body = f"""STALKER,

A password reset request was initiated for your PDA account.

If you did not request this, ignore this transmission. Your current access codes remain secure.

To establish new security credentials, access the following coordinates within 1 hour:

{reset_link}

This link expires at: {expiry_time} UTC

WARNING: After expiration, you must request a new recovery protocol.

---
S.T.A.L.K.E.R. PDA Network
Zone Security Division
"""
    
    msg = MIMEMultipart()
    msg['From'] = smtp_user
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))
    
    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
