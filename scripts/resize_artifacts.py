#!/usr/bin/env python3
"""
Resize existing artifact images in S3 if they are larger than 400x400
"""
import boto3
import os
from io import BytesIO
from PIL import Image

BUCKET = 'pda-zone-artifacts-dev-707694916945'
MAX_SIZE = 400
REGION = 'eu-north-1'

s3 = boto3.client('s3', region_name=REGION)

def resize_image(image_bytes, max_size=MAX_SIZE):
    """Resize image to max_size x max_size if larger"""
    img = Image.open(BytesIO(image_bytes))
    
    original_size = img.size
    
    # Convert RGBA to RGB if needed
    if img.mode == 'RGBA':
        background = Image.new('RGB', img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[3])
        img = background
    
    # Check if resize needed
    needs_resize = img.width > max_size or img.height > max_size
    
    if needs_resize:
        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    
    # Save to bytes
    output = BytesIO()
    img.save(output, format='JPEG', quality=85, optimize=True)
    
    return output.getvalue(), needs_resize, original_size, img.size

def main():
    print(f"Checking images in s3://{BUCKET}/artifacts/")
    
    # List all objects in artifacts/ folder
    response = s3.list_objects_v2(Bucket=BUCKET, Prefix='artifacts/')
    
    if 'Contents' not in response:
        print("No images found")
        return
    
    total = 0
    resized = 0
    
    for obj in response['Contents']:
        key = obj['Key']
        size = obj['Size']
        
        # Skip if not an image
        if not key.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            continue
        
        total += 1
        print(f"\n{total}. {key} ({size} bytes)")
        
        # Download image
        response = s3.get_object(Bucket=BUCKET, Key=key)
        image_bytes = response['Body'].read()
        
        # Resize if needed
        resized_bytes, needs_resize, original_size, new_size = resize_image(image_bytes)
        
        if needs_resize:
            print(f"   Resizing: {original_size} → {new_size}")
            
            # Upload resized image
            s3.put_object(
                Bucket=BUCKET,
                Key=key,
                Body=resized_bytes,
                ContentType='image/jpeg'
            )
            
            resized += 1
            print(f"   ✓ Resized and uploaded ({len(resized_bytes)} bytes)")
        else:
            print(f"   ✓ Already optimal size: {original_size}")
    
    print(f"\n{'='*50}")
    print(f"Total images: {total}")
    print(f"Resized: {resized}")
    print(f"Skipped: {total - resized}")

if __name__ == '__main__':
    main()
