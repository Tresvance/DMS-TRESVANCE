"""
Razorpay Integration Utilities for Clinic Payments
"""
import razorpay
import hmac
import hashlib
from django.conf import settings


def get_razorpay_client():
    """Get configured Razorpay client"""
    return razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )


def create_order(amount, currency='INR', receipt=None, notes=None):
    """
    Create a Razorpay order for payment
    
    Args:
        amount: Amount in INR (will be converted to paise)
        currency: Currency code (default INR)
        receipt: Optional receipt ID
        notes: Optional dict of notes
    
    Returns:
        dict: Razorpay order data
    """
    client = get_razorpay_client()
    
    # Razorpay expects amount in paise (smallest currency unit)
    amount_in_paise = int(float(amount) * 100)
    
    order_data = {
        'amount': amount_in_paise,
        'currency': currency,
        'payment_capture': 1,  # Auto capture payment
    }
    
    if receipt:
        order_data['receipt'] = receipt
    
    if notes:
        order_data['notes'] = notes
    
    return client.order.create(data=order_data)


def verify_payment_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
    """
    Verify the payment signature from Razorpay
    
    Args:
        razorpay_order_id: Order ID from Razorpay
        razorpay_payment_id: Payment ID from Razorpay
        razorpay_signature: Signature from Razorpay
    
    Returns:
        bool: True if signature is valid
    """
    client = get_razorpay_client()
    
    params_dict = {
        'razorpay_order_id': razorpay_order_id,
        'razorpay_payment_id': razorpay_payment_id,
        'razorpay_signature': razorpay_signature
    }
    
    try:
        client.utility.verify_payment_signature(params_dict)
        return True
    except razorpay.errors.SignatureVerificationError:
        return False


def verify_signature_manual(razorpay_order_id, razorpay_payment_id, razorpay_signature):
    """
    Manually verify signature (alternative method)
    """
    key_secret = settings.RAZORPAY_KEY_SECRET
    
    # Generate expected signature
    msg = f'{razorpay_order_id}|{razorpay_payment_id}'
    generated_signature = hmac.new(
        key_secret.encode(),
        msg.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(generated_signature, razorpay_signature)


def fetch_payment(payment_id):
    """Fetch payment details from Razorpay"""
    client = get_razorpay_client()
    return client.payment.fetch(payment_id)


def fetch_order(order_id):
    """Fetch order details from Razorpay"""
    client = get_razorpay_client()
    return client.order.fetch(order_id)
