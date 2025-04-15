
from flask import Flask, request, jsonify
import requests
import os
import re
import logging
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(".env.local")
app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.DEBUG, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
BLAND_AI_API_KEY    = os.getenv("BLAND_AI_API_KEY")

def normalize_phone_number(number):
    digits = re.sub(r'\D', '', number or '')
    if digits.startswith('91'):
        digits = digits[2:]
    elif digits.startswith('0'):
        digits = digits[1:]
    return f'+91{digits}'

@app.route('/')
def home():
    return "Welcome to the ambulance API."

@app.route('/nearby-ambulance-services', methods=['POST'])
def get_nearby_ambulance_services():
    data = request.get_json() or {}
    lat   = data.get('lat')
    lng   = data.get('lng')
    text  = data.get('text')
    print(lng, lat)
    logger.debug(f"Input received → lat={lat} lng={lng} text={text}")
    if text:
        url = (
            f'https://maps.googleapis.com/maps/api/place/textsearch/json'
            f'?query=ambulance+services+in+{text}'
            f'&key={GOOGLE_MAPS_API_KEY}'
        )
    elif lat is not None and lng is not None:
        url = (
            f'https://maps.googleapis.com/maps/api/place/nearbysearch/json'
            f'?location={lat},{lng}'
            f'&radius=10000'
            f'&keyword=ambulance'
            f'&key={GOOGLE_MAPS_API_KEY}'
        )
    else:
        logger.error("Invalid input: provide lat/lng or text")
        return jsonify({'error': 'Invalid input: provide lat/lng or text'}), 400

    logger.debug(f"Google Places request URL: {url}")
    resp   = requests.get(url)
    places = resp.json()
    status = places.get("status")
    logger.debug(f"Google Places response status={status} details={places}")
    if status == "ZERO_RESULTS":
        return jsonify({'ambulance_services': []}), 200
    if status != "OK":
        logger.error(f"Google Places API error: {status}")
        return jsonify({'error': f'Google API error: {status}', 'details': places}), 500

    services = []
    for place in places.get("results", [])[:40]:
        pid = place.get("place_id")
        if not pid:
            continue

        details_url = (
            f'https://maps.googleapis.com/maps/api/place/details/json'
            f'?place_id={pid}'
            f'&fields=name,formatted_phone_number,opening_hours'
            f'&key={GOOGLE_MAPS_API_KEY}'
        )
        logger.debug(f"Place details request URL: {details_url}")
        dresp   = requests.get(details_url)
        detail  = dresp.json()
        dstatus = detail.get("status")
        logger.debug(f"Place details response status={dstatus} details={detail}")
        if dstatus != "OK":
            continue

        r     = detail.get("result", {})
        phone = r.get("formatted_phone_number")
        if not phone:
            continue

        services.append({
            'name':         r.get("name"),
            'open_now':     r.get("opening_hours", {}).get("open_now", False),
            'phone_number': normalize_phone_number(phone)
        })

    logger.debug(f"Found {len(services)} services")
    return jsonify({'ambulance_services': services}), 200

@app.route('/call-ambulance', methods=['POST'])
def call_ambulance():
    data     = request.get_json() or {}
    name     = data.get("name")
    orig     = data.get("phone_number")
    override = data.get("override_phone_number")
    confirm  = data.get("confirm", False)
    lat      = data.get("lat")
    lng      = data.get("lng")
    logger.debug(f"Call request received → name={name} orig={orig} override={override} confirm={confirm} lat={lat} lng={lng}")

    if not orig:
        logger.error("No phone number provided")
        return jsonify({'error': 'No phone number provided'}), 400

    normalized_orig = normalize_phone_number(orig)
    if not confirm:
        return jsonify({
            'message':      'Please confirm before placing the call',
            'service_name': name,
            'phone_number': normalized_orig
        }), 200

    call_number = normalize_phone_number(override) if override else normalized_orig
    logger.debug(f"Calling number: {call_number}")

    location_str = "your current location"
    if lat is not None and lng is not None:
        geo_url = (
            f"https://maps.googleapis.com/maps/api/geocode/json"
            f"?latlng={lat},{lng}"
            f"&key={GOOGLE_MAPS_API_KEY}"
        )
        logger.debug(f"Geocode request URL: {geo_url}")
        gresp   = requests.get(geo_url).json()
        gstatus = gresp.get("status")
        logger.debug(f"Geocode response status={gstatus} details={gresp}")
        if gstatus == "OK" and gresp.get("results"):
            location_str = gresp["results"][0].get("formatted_address", location_str)
        logger.debug(f"Resolved location: {location_str}")

    task = (
        f"You're Kartik, a health assistant at AetherCare. You're calling the ambulance service “{name}” "
        f"at {call_number} to ask if an ambulance can be arranged for {location_str} as soon as possible. "
        "Ask them if they can arrange the ambulance. There is a person in need of urgent care. "
        "If they cannot arrange, thank them for their time and end the call.\n\n"
        "If there is a long pause, please repeat what you said.\n"
        "Here’s an example dialogue:\n"
        "Person: Hello?\n"
        "You: Hey, this is Kartik from AetherCare. Could you let me know if there is an ambulance available "
        f"which could reach {location_str} asap? There is a person in need of urgent care\n"
        "Person: Yes absolutely!\n"
        "You: That is great! How long would it take to reach here? Also could you let me know the name of the driver?\n"
        "Person: It would take about 10 mins. The name of the driver isn't available at the moment. I will let you know shortly.\n"
        "Person: I just realised, we won't be able to send an ambulance. We are sorry.\n"
        "You: Okay. Thank you for your time.\n"
        "Person: Ok, thank you!\n"
        "You: Of course, have a great day! Goodbye."
    )
    logger.debug(f"Task prepared: {task}")

    try:
        headers = {
            "Content-Type":  "application/json",
            "authorization":  BLAND_AI_API_KEY
        }
        body = {
            "phone_number": call_number,
            "task":         task
        }
        r  = requests.post("https://api.bland.ai/v1/calls", headers=headers, json=body)
        jr = r.json()
        logger.debug(f"Bland AI response: {jr}")
        if r.status_code not in (200, 201):
            logger.error(f"Bland AI API error: {jr}")
            return jsonify({'error': 'Bland AI API error', 'details': jr}), r.status_code

        return jsonify({
            'message':      'Call initiated',
            'call_details': jr
        }), 200

    except Exception as e:
        logger.exception("Exception during Bland AI call")
        return jsonify({'error': 'Exception occurred', 'details': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=3002)
