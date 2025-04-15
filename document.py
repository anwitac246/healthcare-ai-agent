import os
import json
import logging
import tempfile
import pdfplumber
import pytesseract
from PIL import Image
import docx
import spacy
import re
from typing import List, Dict, Any
from flask import Flask, request, jsonify
from flask_cors import CORS
from crewai import Agent, Task, Crew, LLM
from dotenv import load_dotenv



load_dotenv(".env.local")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
os.environ["LANGCHAIN_TRACING_V2"] = "false"
app = Flask(__name__)
CORS(app, resources={r"/diagnosis": {"origins": "http://localhost:3000"}})
groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    logger.error("GROQ_API_KEY environment variable not set")
    raise ValueError("GROQ_API_KEY is required")
llm = LLM(
    model="groq/llama-3.3-70b-versatile",
    api_key=groq_api_key,
    temperature=0.5,
    max_completion_tokens=1500
)
nlp = spacy.load("en_core_web_sm")

class DocumentProcessor:
    def __init__(self):
        self.nlp = nlp
    def extract_text(self, file_path: str) -> str:
        try:
            if file_path.endswith('.pdf'):
                with pdfplumber.open(file_path) as pdf:
                    text = ' '.join(page.extract_text() or '' for page in pdf.pages)
                    logger.info(f"Extracted text from PDF: {len(text)} characters")
                    return text
            elif file_path.endswith(('.png', '.jpg', '.jpeg')):
                text = pytesseract.image_to_string(Image.open(file_path))
                logger.info(f"Extracted text from image: {len(text)} characters")
                return text
            elif file_path.endswith('.docx'):
                doc = docx.Document(file_path)
                text = ' '.join(paragraph.text for paragraph in doc.paragraphs)
                logger.info(f"Extracted text from DOCX: {len(text)} characters")
                return text
            elif file_path.endswith('.txt'):
                with open(file_path, 'r', encoding='utf-8') as f:
                    text = f.read()
                    logger.info(f"Extracted text from TXT: {len(text)} characters")
                    return text
            logger.warning(f"Unsupported file type: {file_path}")
            return ""
        except Exception as e:
            logger.error(f"Error extracting text from {file_path}: {str(e)}")
            return ""
    def preprocess_text(self, text: str) -> str:
        try:
            text = re.sub(r'\s+', ' ', text.strip())
            text = re.sub(r'[^\w\s.,-]', '', text)
            logger.info(f"Preprocessed text: {len(text)} characters")
            return text
        except Exception as e:
            logger.error(f"Error preprocessing text: {str(e)}")
            return text

def rule_based_extraction(text: str) -> Dict[str, List[str]]:
    entities = {
        'symptoms': [],
        'conditions': [],
        'medications': [],
        'tests': [],
        'dates': [],
        'numerical_results': [],
        'patient_info': []
    }
    symptom_patterns = [r'\b(pain|fever|cough|fatigue|nausea|vomiting|diarrhea|headache|rash)\b', r'\b(\w+\s*(pain|discomfort))\b']
    condition_patterns = [r'\b(diabetes|hypertension|asthma|cancer|infection|arthritis|bronchitis)\b']
    medication_patterns = [r'\b(\w+\s*(?:-|\s)\w*)\s*(mg|ml|tablet|capsule)?\b']
    test_patterns = [r'\b(blood\s*test|x\s*ray|mri|ct\s*scan|ultrasound|biopsy)\b']
    date_patterns = [r'\b(\d{1,2}/\d{1,2}/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4})\b']
    numerical_patterns = [r'\b(\d+\.?\d*\s*(?:mg/dl|mmHg|%))\b']
    patient_patterns = [r'\b(patient|name):?\s*([A-Za-z\s]+)\b', r'\b(age):?\s*(\d+)\b', r'\b(gender|sex):?\s*(male|female)\b']
    for pattern in symptom_patterns:
        entities['symptoms'].extend(re.findall(pattern, text.lower(), re.IGNORECASE))
    for pattern in condition_patterns:
        entities['conditions'].extend(re.findall(pattern, text.lower(), re.IGNORECASE))
    for pattern in medication_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        entities['medications'].extend([match[0] for match in matches])
    for pattern in test_patterns:
        entities['tests'].extend(re.findall(pattern, text.lower(), re.IGNORECASE))
    for pattern in date_patterns:
        entities['dates'].extend(re.findall(pattern, text))
    for pattern in numerical_patterns:
        entities['numerical_results'].extend(re.findall(pattern, text))
    for pattern in patient_patterns:
        entities['patient_info'].extend(re.findall(pattern, text, re.IGNORECASE))
    for key in entities:
        entities[key] = list(set([str(item).strip() for item in entities[key] if item]))
    logger.info(f"Rule-based extraction: {entities}")
    return entities

multimodal_agent = Agent(
    role='Multimodal Medical Analyst',
    goal='Extract all meaningful medical information from documents. Focus on values or cases where there are abnormalities such as a high or a lower value or a mass found etc. These observation may be written in bold',
    backstory='Expert in processing diverse medical documents',
    llm=llm,
    verbose=True
)
summary_agent = Agent(
    role='Medical Summarizer',
    goal='Generate concise summaries from medical analyses',
    backstory='Skilled in distilling complex medical data',
    llm=llm,
    verbose=True
)

def create_analysis_task(text: str) -> Task:
    return Task(
        description=f"""
        Analyze the medical document text:
        {text[:2000]}
        Identify:
        - Symptoms (e.g., fever, cough)
        - Conditions (e.g., diabetes, bronchitis)
        - Medications (e.g., ibuprofen)
        - Tests (e.g., blood test)
        - Dates (e.g., 01/01/2023)
        - Numerical results (e.g., 120 mg/dL)
        - Patient information (e.g., name, age, gender)
        Return a JSON object with these fields and a 'diagnosis' summary.
        Ensure valid JSON output.
        """,
        agent=multimodal_agent,
        expected_output="A valid JSON object"
    )

def create_summary_task(analysis_output: Dict[str, Any]) -> Task:
    diagnosis = analysis_output.get('diagnosis', 'No diagnosis provided')
    return Task(
        description=f"""
        Summarize the medical analysis:
        Diagnosis: {diagnosis}
        Key Findings: {json.dumps(analysis_output, indent=2)}
        Provide a 2-3 sentence clinical summary.
        """,
        agent=summary_agent,
        expected_output="A brief summary string"
    )

@app.route('/diagnosis', methods=['POST'])
def process_diagnosis():
    tmp_path = None
    try:
        logger.info("Received request at /diagnosis")
        if 'file' not in request.files:
            logger.error("No file provided")
            return jsonify({"error": "No file provided"}), 400
        file = request.files['file']
        if file.filename == '':
            logger.error("No file selected")
            return jsonify({"error": "No file selected"}), 400
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name
            logger.info(f"Saved temporary file: {tmp_path}")
        processor = DocumentProcessor()
        raw_text = processor.extract_text(tmp_path)
        if not raw_text:
            logger.error("Failed to extract text")
            return jsonify({"error": "Unable to extract text from document"}), 400
        processed_text = processor.preprocess_text(raw_text)
        rule_entities = rule_based_extraction(processed_text)
        analysis_output = {
            "symptoms": rule_entities['symptoms'],
            "conditions": rule_entities['conditions'],
            "medications": rule_entities['medications'],
            "tests": rule_entities['tests'],
            "dates": rule_entities['dates'],
            "numerical_results": rule_entities['numerical_results'],
            "patient_info": rule_entities['patient_info'],
            "diagnosis": "Generated from rule-based extraction."
        }
        try:
            analysis_task = create_analysis_task(processed_text)
            analysis_crew = Crew(agents=[multimodal_agent], tasks=[analysis_task], verbose=True)
            analysis_result = analysis_crew.kickoff()
            llm_output = analysis_result
            if llm_output:
                try:
                    if isinstance(llm_output, str):
                        llm_output = json.loads(llm_output)
                    for key in ['symptoms', 'conditions', 'medications', 'tests', 'dates', 'numerical_results', 'patient_info']:
                        llm_output[key] = list(set(llm_output.get(key, []) + rule_entities.get(key, [])))
                    analysis_output = llm_output
                    logger.info(f"LLM analysis successful: {json.dumps(analysis_output, indent=2)}")
                except json.JSONDecodeError as e:
                    logger.error(f"JSON parse error in LLM output: {str(e)}")
                    logger.info("Falling back to rule-based extraction")
            else:
                logger.warning("No LLM output received, using rule-based extraction")
        except Exception as e:
            logger.error(f"LLM analysis failed: {str(e)}")
            logger.info("Falling back to rule-based extraction")
        summary_output = "No summary generated."
        try:
            summary_task = create_summary_task(analysis_output)
            summary_crew = Crew(agents=[summary_agent], tasks=[summary_task], verbose=True)
            summary_result = summary_crew.kickoff()
            logger.info(f"Summary result type: {type(summary_result)}")
            logger.info(f"Summary result content: {summary_result}")
            if isinstance(summary_result, str):
                summary_output = summary_result
            elif hasattr(summary_result, 'raw'):
                summary_output = summary_result.raw
            elif isinstance(summary_result, dict) and 'output' in summary_result:
                summary_output = summary_result['output']
            else:
                logger.warning("Unexpected summary result format, using default output")
            logger.info(f"Summary Agent Response: {summary_output}")
        except Exception as e:
            logger.error(f"Summary task failed: {str(e)}")
            summary_output = "Failed to generate summary due to an error."
        response = {"summary": summary_output}
        logger.info("Request processed successfully")
        return jsonify(response)
    except Exception as e:
        logger.error(f"Error processing diagnosis: {str(e)}", exc_info=True)
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
                logger.info(f"Deleted temporary file: {tmp_path}")
            except Exception as e:
                logger.error(f"Error deleting temporary file {tmp_path}: {str(e)}")

@app.route('/test', methods=['GET'])
def test():
    logger.info("Test endpoint accessed")
    return jsonify({"message": "Backend is running"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3003, debug=True)
