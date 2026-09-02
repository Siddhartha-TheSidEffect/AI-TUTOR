import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()
DID_API_KEY = os.getenv("DID_API_KEY")

def generate_avatar_video(text_script: str):
    print("--- D-ID ENGINE TRIGGERED ---")
    print(f"API Key loaded? {bool(DID_API_KEY)}")
    
    if not DID_API_KEY:
        print("D-ID Error: DID_API_KEY is missing from environment variables!")
        return None

    url = "https://api.d-id.com/talks"
    
    avatar_image_url = "https://randomuser.me/api/portraits/women/68.jpg"
    voice_id = "en-US-JennyNeural"
    
    payload = {
        "script": {
            "type": "text",
            "input": text_script,
            "provider": {
                "type": "microsoft",
                "voice_id": voice_id
            }
        },
        "source_url": avatar_image_url,
        "config": {
            "fluent": False,
            "pad_audio": "0.0"
        }
    }
    
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "authorization": f"Basic {DID_API_KEY}"
    }

    try:
        print("Sending request to D-ID API...")
        response = requests.post(url, json=payload, headers=headers)
        print(f"D-ID Response Status Code: {response.status_code}")
        print(f"D-ID Response Body: {response.text}")
        
        response_data = response.json()
        
        if "id" not in response_data:
            print("D-ID Error: 'id' not found in response data!")
            return None
            
        video_id = response_data["id"]
        print(f"Video processing started successfully. ID: {video_id}")
        
        get_url = f"{url}/{video_id}"
        
        while True:
            time.sleep(5)
            print("Checking video status...")
            status_response = requests.get(get_url, headers=headers)
            status_data = status_response.json()
            
            status = status_data.get("status")
            print(f"Current status: {status}")
            
            if status == "done":
                result_url = status_data.get("result_url")
                print(f"Video successfully generated! URL: {result_url}")
                return result_url
            elif status == "error":
                print(f"Error in generating video. Details: {status_data}")
                return None

    except Exception as e:
        print(f"Video Generation Exception Occurred: {e}")
        return None