from fastapi import FastAPI, File, UploadFile
import uvicorn
import numpy as np
from PIL import Image
import tensorflow as tf
import os

app = FastAPI()

# Model loading logic (Direct from folder, no bucket needed)
# MODEL = tf.keras.models.load_model("./potatoes.h5")      #old line thi ye rendor pe error ari thi niche wali new dal di hai
MODEL = tf.keras.models.load_model("./potatoes.h5", compile=False)
CLASS_NAMES = ["Early Blight", "Late Blight", "Healthy"]

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Image processing logic as per tutorial
    image = np.array(Image.open(file.file).convert("RGB").resize((256, 256)))
    image = image / 255.0
    img_array = tf.expand_dims(image, 0)
    
    predictions = MODEL.predict(img_array)
    predicted_class = CLASS_NAMES[np.argmax(predictions[0])]
    confidence = round(100 * (np.max(predictions[0])), 2)

    return {"class": predicted_class, "confidence": confidence}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host='0.0.0.0', port=port)