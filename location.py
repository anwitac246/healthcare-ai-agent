from flask import Flask, request, jsonify
import requests
import os
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(".env.local")
app = Flask(__name__)
CORS(app)

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

@app.route('/')
def home():
    return "Welcome to the location API."

@app.route('/nearby-doctors', methods=['POST'])
def get_nearby_doctors():
    data = request.get_json() or {}
    lat = data.get('lat')
    lng = data.get('lng')
    text = data.get('text')
    specialisation = data.get('specialisation')

    try:
        if text:
            if specialisation:
                query = f"{specialisation}+in+{text}"
            else:
                query = f"doctors+and+hospitals+in+{text}"
            url = (
                f"https://maps.googleapis.com/maps/api/place/textsearch/json"
                f"?query={query}"
                f"&key={GOOGLE_MAPS_API_KEY}"
            )
        elif lat is not None and lng is not None:
            if specialisation:
                url = (
                    f"https://maps.googleapis.com/maps/api/place/nearbysearch/json"
                    f"?location={lat},{lng}"
                    f"&radius=10000"
                    f"&keyword={specialisation}"
                    f"&key={GOOGLE_MAPS_API_KEY}"
                )
            else:
                url = (
                    f"https://maps.googleapis.com/maps/api/place/nearbysearch/json"
                    f"?location={lat},{lng}"
                    f"&radius=10000"
                    f"&type=doctor"
                    f"&key={GOOGLE_MAPS_API_KEY}"
                )
        else:
            return jsonify({'error': 'Invalid input'}), 400

        response = requests.get(url)
        result = response.json()

        if result.get("status") != "OK":
            return jsonify({'error': 'Google API error', 'details': result}), 500

        doctors = []
        for place in result.get("results", []):
            doctors.append({
                'name':      place.get('name'),
                'address':   place.get('vicinity') or place.get('formatted_address'),
                'location':  place.get('geometry', {}).get('location'),
                'rating':    place.get('rating'),
                'open_now':  place.get('opening_hours', {}).get('open_now', False)
            })

        return jsonify({'doctors': doctors}), 200

    except Exception as e:
        return jsonify({'error': 'Exception occurred', 'details': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
