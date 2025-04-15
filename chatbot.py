from flask import Flask, request, jsonify
import re
from phi.assistant import Assistant
from phi.tools.pubmed import PubmedTools
from phi.llm.groq import Groq
import os
from flask_cors import CORS
from dotenv import load_dotenv
from PIL import Image
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array
import json

app = Flask(__name__)
CORS(app)
load_dotenv(".env.local")

groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    raise ValueError("GROQ_API_KEY is not set in environment variables!")
os.environ["GROQ_API_KEY"] = groq_api_key

try:
    skin_model = load_model("skin_disease_model.h5")
    print("Model loaded successfully.")
except Exception as e:
    raise RuntimeError(f"Failed to load model: {e}")

class_labels = [
    "Acne and Rosacea Photos",
    "Actinic Keratosis Basal Cell Carcinoma and other Malignant Lesions",
    "Atopic Dermatitis Photos",
    "Bullous Disease Photos",
    "Cellulitis Impetigo and other Bacterial Infections",
    "Eczema Photos",
    "Exanthems and Drug Eruptions",
    "Hair Loss Photos Alopecia and other Hair Diseases",
    "Herpes HPV and other STDs Photos",
    "Light Diseases and Disorders of Pigmentation Photos",
    "Lupus and other Connective Tissue diseases",
    "Melanoma Skin Cancer Nevi and Moles",
    "Nail Fungus and other Nail Disease",
    "Poison Ivy Photos and other Contact Dermatitis",
    "Psoriasis pictures Lichen Planus and related diseases",
    "Scabies Lyme Disease and other Infestations and Bites",
    "Seborrheic Keratoses and other Benign Tumors",
    "Systemic Disease",
    "Tinea Ringworm Candidiasis and other Fungal Infections",
    "Urticaria Hives",
    "Vascular Tumors",
    "Vasculitis Photos",
    "Warts Molluscum and other Viral Infections"
]

assistant = Assistant(
    llm=Groq(model="llama-3.3-70b-versatile"),
    tools=[PubmedTools()],
    add_history_to_messages=True,
    num_history_responses=3,
    instructions=[
        "Based on the given symptoms, determine the most probable disease. Include a confidence rating in your answer in the format 'Confidence: XX%'.",
        "If your confidence is below 80%, ask clarifying questions.",
        "Provide the diagnosis in a very neat and structured manner. Format responses with **Markdown** where necessary.",
        "Use **bold text** and underlines for key terms like disease names, medications, and important instructions. Add proper spacing and bullet points as and when needed.",
        "Include a proper **prescription format** if confidence is above 80%.",
        "Ensure a structured and readable response using Markdown syntax.",
        "Advice a medicine that would be suitable for pregnant women, old people and children",
        "Also ask what associated diseases someone might have before suggesting a medicine eg: diabetes, epilepsy, asthama, tuberculosis",
        "Make the response polite and upbeat please.",
        "Provide a one liner summary in about 10 words in the following format: SUMMARY: _________",
        "Provide the response in the same language as the language of the user's input",
        "take all the diseases that match the symptoms into consideration before making a conclusion"
    ],
    show_tool_calls=True,
)

def process_image(file):
    try:
        image = Image.open(file)
        print(f"Original image mode: {image.mode}")
        if image.mode != "RGB":
            image = image.convert("RGB")
        image = image.resize((224, 224))
        image_array = img_to_array(image)
        image_array = image_array.astype("float32") / 255.0
        image_array = np.expand_dims(image_array, axis=0)
        print(f"Image processed for prediction: shape={image_array.shape}")
        predictions = skin_model.predict(image_array)
        print(f"Raw predictions: {predictions}")
        if predictions.shape[1] == 1:
            class_id = int(predictions[0][0] > 0.5)
            confidence = float(predictions[0][0]) * 100
        else:
            class_id = int(np.argmax(predictions[0]))
            confidence = float(np.max(predictions[0])) * 100
        class_name = class_labels[class_id] if class_id < len(class_labels) else "Unknown"
        return class_id, class_name, confidence
    except Exception as e:
        print("Image classification error:", e)
        raise e

@app.route('/')
def home():
    return "Welcome to the Diagnosis API. Please POST your data to /chat or /classify."

@app.route('/chat', methods=['POST'])
def chat():
    print("📨 Received request to /chat")
    message = request.form.get("message") or (request.json.get("message") if request.is_json else None)
    print(message)
    if not message:
        return jsonify({"error": "No message provided"}), 400
    message = message.strip()
    if not message:
        return jsonify({"error": "Empty message provided"}), 400
    user_history = request.form.get("history")
    conversation_history = []
    if user_history:
        try:
            history_list = json.loads(user_history)
            if isinstance(history_list, list):
                conversation_history = [f"**User:** {msg.get('content', '').strip()}" for msg in history_list if msg.get('content')]
        except Exception as e:
            print("History parsing error:", e)
    else:
        conversation_history.append(f"**User:** {message}")
    context = "\n".join(conversation_history)
    image_diagnosis_info = ""
    classification_result = None
    confidence_score = None
    class_name = None
    if 'file' in request.files:
        print("File detected in request")
        try:
            classification_result, class_name, confidence_score = process_image(request.files['file'])
            print(f"Image classified: class_id={classification_result}, class_name={class_name}, confidence={confidence_score:.2f}%")
            if confidence_score >= 80:
                image_diagnosis_info = (
                    f"\n\nImage-based classification:\n"
                    f"- Class ID: {classification_result}\n"
                    f"- Class Name: {class_name}\n"
                    f"- Confidence: {confidence_score:.2f}%\n"
                    "Use this info along with the symptoms to form a diagnosis.\n"
                )
        except Exception as e:
            return jsonify({"error": f"Image processing error: {str(e)}"}), 500
    prompt = (
        "Analyze the following patient conversation and diagnosis input (including any image classification). "
        "Provide a structured Markdown-formatted diagnosis with medicines and confidence score.\n\n"
        f"{context}{image_diagnosis_info}"
    )
    try:
        response_gen = assistant.chat(prompt)
        output = "".join(response_gen).strip()
        print("Assistant response generated.")
    except Exception as e:
        print("Error during assistant.chat:", e)
        return jsonify({"error": str(e)}), 500
    confidence_match = re.search(r"Confidence:\s*(\d+)%", output)
    diagnosis_confidence = int(confidence_match.group(1)) if confidence_match else None
    formatted_output = f"**Diagnosis**\n\n{output}"
    return jsonify({
        "response": formatted_output,
        "confidence": diagnosis_confidence,
        "image_classification": {
            "class_id": classification_result,
            "class_name": class_name,
            "confidence": confidence_score
        }
    })

@app.route('/classify', methods=['POST'])
def classify_endpoint():
    print("📨 Received request to /classify")
    message = request.form.get("message") or (request.json.get("message") if request.is_json else "")
    message = message.strip() if message else ""
    user_history = request.form.get("history")
    conversation_history = []
    if user_history:
        try:
            history_list = json.loads(user_history)
            if isinstance(history_list, list):
                conversation_history = [f"**User:** {msg.get('content', '').strip()}" for msg in history_list if msg.get('content')]
        except Exception as e:
            print("History parsing error:", e)
    if message :
        conversation_history.append(f"**User:** {message}")
    context = "\n".join(conversation_history)
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    try:
        classification_result, class_name, confidence_score = process_image(request.files['file'])
        print(f"Image classified: class_id={classification_result}, class_name={class_name}, confidence={confidence_score:.2f}%")
    except Exception as e:
        return jsonify({"error": f"Image processing error: {str(e)}"}), 500
    image_diagnosis_info = ""
    if confidence_score >= 80:
        image_diagnosis_info = (
            f"\n\nImage-based classification:\n"
            f"- Class ID: {classification_result}\n"
            f"- Class Name: {class_name}\n"
            f"- Confidence: {confidence_score:.2f}%\n"
            "Use this info along with the symptoms to form a diagnosis.\n"
        )
    else:
        image_diagnosis_info = ""
    prompt = (
        "Analyze the following patient conversation and diagnosis input (including any image classification). "
        "Provide a structured Markdown-formatted diagnosis with medicines and confidence score.\n\n"
        f"{context}{image_diagnosis_info}"
    )
    try:
        response_gen = assistant.chat(prompt)
        output = "".join(response_gen).strip()
        print("Assistant response generated from /classify.")
    except Exception as e:
        print("Error during assistant.chat:", e)
        return jsonify({"error": str(e)}), 500
    confidence_match = re.search(r"Confidence:\s*(\d+)%", output)
    diagnosis_confidence = int(confidence_match.group(1)) if confidence_match else None
    formatted_output = f"**Diagnosis**\n\n{output}"
    return jsonify({
        "response": formatted_output,
        "confidence": diagnosis_confidence,
        "image_classification": {
            "class_id": classification_result,
            "class_name": class_name,
            "confidence": confidence_score
        }
    })

if __name__ == '__main__':
    app.run(debug=True, port=3001)
