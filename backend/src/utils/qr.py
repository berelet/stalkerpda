"""
QR Code generation utilities for player looting system
"""
import qrcode
import qrcode.image.svg
import io


def generate_qr_code(player_id: str) -> str:
    """
    Generate QR code for player looting (SVG format - no Pillow needed)
    
    Args:
        player_id: Player UUID
        
    Returns:
        SVG data URI string
    """
    # QR data format
    qr_data = f"STALKER_LOOT:{player_id}"
    
    # Generate QR code with SVG factory (no Pillow required)
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    # Create SVG image
    factory = qrcode.image.svg.SvgImage
    img = qr.make_image(image_factory=factory)
    
    # Convert to string
    buffer = io.BytesIO()
    img.save(buffer)
    svg_str = buffer.getvalue().decode('utf-8')
    
    # Return as data URI
    import base64
    svg_base64 = base64.b64encode(svg_str.encode()).decode()
    return f"data:image/svg+xml;base64,{svg_base64}"


def parse_qr_code(qr_code: str) -> str:
    """
    Parse QR code and extract player ID
    
    Args:
        qr_code: QR code string (format: "STALKER_LOOT:uuid")
        
    Returns:
        Player ID or None if invalid
    """
    if not qr_code or not qr_code.startswith('STALKER_LOOT:'):
        return None
    
    try:
        player_id = qr_code.split(':', 1)[1]
        return player_id
    except:
        return None
