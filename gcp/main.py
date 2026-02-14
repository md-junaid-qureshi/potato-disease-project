from fastapi import FastAPI, File, UploadFile
import uvicorn
import numpy as np
from PIL import Image
import tensorflow as tf
import os
import io

app = FastAPI()

# Model load (compile=False is necessary for older h5 models)
MODEL = tf.keras.models.load_model("./potatoes.h5", compile=False)
CLASS_NAMES = ["Early Blight", "Late Blight", "Healthy"]

@app.get("/ping")
async def ping():
    return "Hello, Server is Running!"

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # 1. Image read aur resize
    image_data = await file.read()
    image = Image.open(io.BytesIO(image_data)).convert("RGB").resize((256, 256))
    
    # 2. Preprocess (Scaling)
    img_array = np.array(image) / 255.0
    img_array = np.expand_dims(img_array, 0)

    # 3. Prediction
    predictions = MODEL.predict(img_array)
    
    # Sabse zaroori: .tolist() ya float() use karna taaki JSON error na aaye
    predicted_class = CLASS_NAMES[np.argmax(predictions[0])]
    confidence = float(np.max(predictions[0])) # numpy.float32 ko Python float banaya

    return {
        "class": predicted_class,
        "confidence": round(confidence * 100, 2)
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host='0.0.0.0', port=port)