from flask import Flask, request, jsonify
import re
from phi.assistant import Assistant
from phi.tools.pubmed import PubmedTools
from phi.llm.groq import Groq
import os
from flask_cors import CORS
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)
load_dotenv(".env.local")

groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    raise ValueError("Error: GROQ_API_KEY is not set in environment variables!")

os.environ["GROQ_API_KEY"] = groq_api_key

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
        "Provide a one liner summary in about 10 words in the following format: SUMMARY: _________"
    ],
    show_tool_calls=True,
)

@app.route('/')
def home():
    return "Welcome to the Diagnosis API. Please POST your data to /chat."

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    if not data or "message" not in data:
        return jsonify({"error": "No message provided"}), 400

    user_input = data["message"].strip()
    if not user_input:
        return jsonify({"error": "Empty message provided"}), 400

    user_history = data.get("history", [])
    conversation_history = []
    if user_history and isinstance(user_history, list):
        conversation_history = [f"**User:** {msg.get('content', '').strip()}" for msg in user_history if msg.get('content')]
    else:
        conversation_history.append(f"**User:** {user_input}")

    context = "\n".join(conversation_history)

    prompt = (
        "Analyze the following conversation history and provide a structured Markdown-formatted diagnosis."
        "\n\n"
        "If your confidence is below 80%, ask clarifying questions. Once confidence is above 80%, provide a structured prescription with medications and dosage."
        "\n\n" + context
    )

    try:
        response_gen = assistant.chat(prompt)
        output = "".join(response_gen).strip()
    except Exception as e:
        print("Error during assistant.chat:", e)
        return jsonify({"error": str(e)}), 500

    conversation_history.append(f"**Assistant:** {output}")

    confidence_match = re.search(r"Confidence:\s*(\d+)%", output)
    confidence = int(confidence_match.group(1)) if confidence_match else None

    formatted_output = f"###**Diagnosis**\n\n{output}"

    return jsonify({"response": formatted_output, "confidence": confidence})

if __name__ == '__main__':
    app.run(debug=True, port=7000)
