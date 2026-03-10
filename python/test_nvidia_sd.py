import requests
import os
import json

# API Key hardcoded for testing
API_KEY = "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"

endpoints = [
    "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-5-large",
    "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-5-large-turbo",
    "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium"
]

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json",
    "Content-Type": "application/json"
}

payload = {
    "prompt": "A futuristic city with flying cars, cyberpunk style",
    "cfg_scale": 5,
    "aspect_ratio": "16:9",
    "output_format": "jpeg"
}

for url in endpoints:
    print(f"Testing NVIDIA API at: {url}")
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=5)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print(f"SUCCESS with URL: {url}")
            break
        elif response.status_code != 404:
            print(f"Response: {response.text[:200]}")
    except Exception as e:
        print(f"Exception: {e}")
    print("-" * 30)
