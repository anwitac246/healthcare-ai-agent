from flask import Flask, request, jsonify
import requests
import os
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(".env.local")

app = Flask(__name__)
CORS(app)

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
BLAND_AI_API_KEY    = os.getenv("BLAND_AI_API_KEY")


@app.route('/')
def home():
    return "Welcome to the ambulance API."


@app.route('/nearby-ambulance-services', methods=['POST'])
def get_nearby_ambulance_services():
    data = request.get_json()
    lat, lng, text = data.get('lat'), data.get('lng'), data.get('text')

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
            f'&radius=5000'
            f'&keyword=ambulance'
            f'&key={GOOGLE_MAPS_API_KEY}'
        )
    else:
        return jsonify({'error': 'Invalid input: provide lat/lng or text'}), 400

    resp = requests.get(url)
    places = resp.json()
    if places.get("status") != "OK":
        return jsonify({'error': 'Google API error', 'details': places}), 500

    services = []
    for place in places.get("results", [])[:20]:
        pid = place.get("place_id")
        if not pid:
            continue

        details_url = (
            f'https://maps.googleapis.com/maps/api/place/details/json'
            f'?place_id={pid}'
            f'&fields=name,formatted_phone_number,opening_hours'
            f'&key={GOOGLE_MAPS_API_KEY}'
        )
        dresp = requests.get(details_url)
        detail = dresp.json()
        if detail.get("status") != "OK":
            continue

        r = detail["result"]
        phone = r.get("formatted_phone_number")
        if not phone:
           
            continue

        services.append({
            'name':         r.get("name"),
            'open_now':     r.get("opening_hours", {}).get("open_now", False),
            'phone_number': phone
        })

    return jsonify({'ambulance_services': services}), 200


@app.route('/call-ambulance', methods=['POST'])
def call_ambulance():
    """
    Expects JSON:
      {
        "name": "Service Name",
        "phone_number": "+1234567890",
        "confirm": false|true,
        "override_phone_number": "+..."
      }
    """
    data    = request.get_json()
    name    = data.get("name")
    orig    = data.get("phone_number")
    confirm = data.get("confirm", False)
    override= data.get("override_phone_number")

    if not orig:
        return jsonify({'error': 'No phone number provided'}), 400


    if not confirm:
        return jsonify({
            'message':      'Please confirm before placing the call',
            'service_name': name,
            'phone_number': orig
        }), 200

    
    call_number = override or orig
    task = (
        f"You're Kartik, a health assistant at AetherCare. You're calling the ambulance service “{name}” "
        f"at {call_number} to ask if an ambulance can be arranged for IIIT Naya Raipur as soon as possible. "
        "Ask them if they can arrange the ambulance. There is a person in need of urgent care. "
        "If they cannot arrange, thank them for their time and end the call.\n\n"
        "Here’s an example dialogue:\n"
        "Person: Hello?\n"
        "You: Hey, this is Kartik from AetherCare. Could you let me know if there is an ambulance available "
        "which could reach IIIT Naya Raipur asap? There is a person in need of urgent care\n"
        "Person: Yes absolutely!\n"
        "You: That is great! How long would it take to reach here? Also could you let me know the name of the driver?\n"
        "Person: It would take about 10 mins. The name of the driver isn't available at the moment. I will let you know shortly.\n"
        "Person: I just realised, we won't be able to send an ambulance. We are sorry.\n"
        "You: Okay. Thank you for your time.\n"
        "Person: Ok, thank you!\n"
        "You: Of course, have a great day! Goodbye."
    )

    try:
        headers = {
            "Content-Type":  "application/json",
            "authorization":  BLAND_AI_API_KEY
        }
        body = {
            "phone_number": call_number,
            "task":         task
        }
        r = requests.post("https://api.bland.ai/v1/calls", headers=headers, json=body)
        jr = r.json()
        if r.status_code not in (200, 201):
            return jsonify({'error': 'Bland AI API error', 'details': jr}), r.status_code

        return jsonify({
            'message':      'Call initiated',
            'call_details': jr
        }), 200

    except Exception as e:
        return jsonify({'error': 'Exception occurred', 'details': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=7000)
