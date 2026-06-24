import os
import json
import base64
import io

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import numpy as np
from PIL import Image
import tensorflow as tf

tf.get_logger().setLevel("ERROR")

from google import genai
from google.genai import types


# Module-level singletons — loaded once on cold start, reused on warm invocations
_MODEL_PATH = os.path.join(os.path.dirname(__file__), "mri_dementia_cnn2.keras")
MODEL = tf.keras.models.load_model(_MODEL_PATH)

CLASS_NAMES = ["MildDemented", "ModerateDemented", "NonDemented", "VeryMildDemented"]

_GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
_GEMINI_MODEL   = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash")
GEMINI = genai.Client(api_key=_GEMINI_API_KEY)

SECRET_TOKEN = os.environ.get("MRI_INFERENCE_SECRET", "")


# Helpers
def _check_is_brain_mri(image_bytes: bytes, mime_type: str) -> bool:
    """Ask Gemini whether the image is a brain MRI scan."""
    response = GEMINI.models.generate_content(
        model=_GEMINI_MODEL,
        contents=[
            "Is this image a brain MRI scan? Reply with ONLY 'yes' or 'no'.",
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
        ],
    )
    return response.text.strip().lower().startswith("yes")


def _classify(image_bytes: bytes) -> dict:
    """Preprocess image and run CNN inference. Returns prediction dict."""
    img = Image.open(io.BytesIO(image_bytes)).convert("L").resize((180, 180), Image.BILINEAR)
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = arr.reshape(1, 180, 180, 1)
    probs = MODEL.predict(arr, verbose=0)[0]
    predicted_idx = int(np.argmax(probs))
    return {
        "predictedClass": CLASS_NAMES[predicted_idx],
        "confidence": round(float(probs[predicted_idx]), 4),
        "probabilities": {CLASS_NAMES[i]: round(float(probs[i]), 4) for i in range(4)},
    }



# Lambda entry point
def handler(event, context):
    # --- Auth ---
    headers = event.get("headers") or {}
    auth_header = headers.get("authorization") or headers.get("Authorization") or ""
    token = auth_header.removeprefix("Bearer ").strip()
    if not SECRET_TOKEN or token != SECRET_TOKEN:
        return {
            "statusCode": 401,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"message": "Unauthorized."}),
        }

    # --- Parse body ---
    try:
        raw = event.get("body") or "{}"
        if event.get("isBase64Encoded"):
            raw = base64.b64decode(raw).decode("utf-8")
        payload = json.loads(raw)
        filename  = payload["filename"]
        image_b64 = payload["data"]
        mime_type = payload.get("mimeType", "image/jpeg")
    except Exception:
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"message": "Invalid request body. Expected { filename, data, mimeType }."}),
        }

    try:
        image_bytes = base64.b64decode(image_b64)
    except Exception:
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"message": "Invalid base64 image data."}),
        }

    # --- Process ---
    try:
        is_mri = _check_is_brain_mri(image_bytes, mime_type)
        if not is_mri:
            return {
                "statusCode": 200,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({
                    "filename": filename,
                    "rejected": True,
                    "reason": "Not a brain MRI scan",
                }),
            }

        result = _classify(image_bytes)
        result["filename"] = filename
        result["rejected"] = False
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(result),
        }

    except Exception as e:
        print(f"Error processing {filename}: {e}")
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"message": "Internal error during classification."}),
        }
