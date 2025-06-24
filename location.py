from flask import Flask, request, jsonify
import requests
import os
from flask_cors import CORS
from dotenv import load_dotenv
import time
import math

load_dotenv(".env.local")
app = Flask(__name__)
CORS(app)

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

def calculate_distance(lat1, lng1, lat2, lng2):
    """Calculate distance between two points using Haversine formula"""
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    
    a = (math.sin(delta_lat / 2) ** 2 + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * 
         math.sin(delta_lng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def get_place_details(place_id):
    """Get detailed information about a place"""
    try:
        details_url = (
            f"https://maps.googleapis.com/maps/api/place/details/json"
            f"?place_id={place_id}"
            f"&fields=formatted_phone_number,website,opening_hours,price_level,reviews"
            f"&key={GOOGLE_MAPS_API_KEY}"
        )
        response = requests.get(details_url)
        result = response.json()
        
        if result.get("status") == "OK":
            return result.get("result", {})
        return {}
    except:
        return {}

def sort_doctors(doctors, sort_by, user_lat=None, user_lng=None):
    """Sort doctors based on the specified criteria"""
    if sort_by == "rating":
        # Sort by open status first, then by rating
        return sorted(doctors, key=lambda x: (
            not x.get('open_now', False),  # Open places first
            -(x.get('rating') or 0)        # Higher rating first
        ))
    elif sort_by == "distance" and user_lat and user_lng:
        # Sort by distance from user
        for doctor in doctors:
            if doctor.get('location'):
                doctor['distance'] = calculate_distance(
                    user_lat, user_lng,
                    doctor['location']['lat'],
                    doctor['location']['lng']
                )
            else:
                doctor['distance'] = float('inf')
        return sorted(doctors, key=lambda x: x.get('distance', float('inf')))
    elif sort_by == "open":
        # Sort by open status, then by rating
        return sorted(doctors, key=lambda x: (
            not x.get('open_now', False),
            -(x.get('rating') or 0)
        ))
    else:
        # Default sorting (rating)
        return sorted(doctors, key=lambda x: (
            not x.get('open_now', False),
            -(x.get('rating') or 0)
        ))

@app.route('/')
def home():
    return jsonify({
        "message": "Welcome to the AetherCare Doctor Finder API",
        "version": "2.0",
        "endpoints": {
            "/nearby-doctors": "POST - Find doctors near a location",
            "/specializations": "GET - Get list of available specializations"
        }
    })

@app.route('/specializations', methods=['GET'])
def get_specializations():
    """Return list of medical specializations"""
    specializations = [
        "General Practitioner",
        "Cardiologist", 
        "Dermatologist",
        "Dentist",
        "Pediatrician",
        "Orthopedic",
        "Neurologist",
        "Gynecologist",
        "Psychiatrist",
        "Ophthalmologist",
        "ENT Specialist",
        "Urologist",
        "Oncologist",
        "Radiologist",
        "Anesthesiologist",
        "Emergency Medicine",
        "Family Medicine",
        "Internal Medicine",
        "Pathologist",
        "Surgeon"
    ]
    return jsonify({"specializations": specializations})

@app.route('/nearby-doctors', methods=['POST'])
def get_nearby_doctors():
    data = request.get_json() or {}
    lat = data.get('lat')
    lng = data.get('lng')
    text = data.get('text')
    specialisation = data.get('specialisation')
    sort_by = data.get('sort_by', 'rating')  # Default to rating
    max_results = data.get('max_results', 60)  # Limit results

    try:
        # Build the query URL
        if text:
            # Text-based search
            if specialisation:
                # Clean specialisation for URL
                clean_spec = specialisation.replace(' ', '+').lower()
                query = f"{clean_spec}+doctor+in+{text.replace(' ', '+')}"
            else:
                query = f"doctors+hospitals+medical+in+{text.replace(' ', '+')}"
            
            url = (
                f"https://maps.googleapis.com/maps/api/place/textsearch/json"
                f"?query={query}"
                f"&type=doctor"
                f"&key={GOOGLE_MAPS_API_KEY}"
            )
        elif lat is not None and lng is not None:
            # Location-based search
            if specialisation:
                # Use keyword for specialisation
                clean_spec = specialisation.replace(' ', '+').lower()
                url = (
                    f"https://maps.googleapis.com/maps/api/place/nearbysearch/json"
                    f"?location={lat},{lng}"
                    f"&radius=25000"  # Increased radius to 25km
                    f"&type=doctor"
                    f"&keyword={clean_spec}"
                    f"&key={GOOGLE_MAPS_API_KEY}"
                )
            else:
                url = (
                    f"https://maps.googleapis.com/maps/api/place/nearbysearch/json"
                    f"?location={lat},{lng}"
                    f"&radius=25000"
                    f"&type=doctor"
                    f"&key={GOOGLE_MAPS_API_KEY}"
                )
        else:
            return jsonify({'error': 'Please provide either coordinates (lat, lng) or a text location'}), 400

        doctors = []
        next_page_token = None
        page_count = 0
        max_pages = 3  # Google Places API allows up to 3 pages

        while page_count < max_pages and len(doctors) < max_results:
            # Add page token if available
            current_url = url + (f"&pagetoken={next_page_token}" if next_page_token else "")
            
            # Make the API request
            response = requests.get(current_url)
            result = response.json()

            if result.get("status") not in ["OK", "ZERO_RESULTS"]:
                return jsonify({
                    'error': 'Google Places API error', 
                    'details': result,
                    'status': result.get("status")
                }), 500

            # Process results
            for place in result.get("results", []):
                # Skip if we've reached max results
                if len(doctors) >= max_results:
                    break
                
                # Extract basic information
                doctor_info = {
                    'id': place.get('place_id'),
                    'name': place.get('name'),
                    'address': place.get('vicinity') or place.get('formatted_address'),
                    'location': place.get('geometry', {}).get('location'),
                    'rating': place.get('rating'),
                    'user_ratings_total': place.get('user_ratings_total', 0),
                    'price_level': place.get('price_level'),
                    'open_now': place.get('opening_hours', {}).get('open_now'),
                    'types': place.get('types', []),
                    'photos': place.get('photos', [])[:1] if place.get('photos') else []  # Get first photo only
                }
                
                # Calculate distance if user location provided
                if lat and lng and doctor_info.get('location'):
                    doctor_info['distance'] = round(calculate_distance(
                        lat, lng,
                        doctor_info['location']['lat'],
                        doctor_info['location']['lng']
                    ), 2)
                
                # Add photo URL if available
                if doctor_info['photos']:
                    photo_reference = doctor_info['photos'][0].get('photo_reference')
                    if photo_reference:
                        doctor_info['photo_url'] = (
                            f"https://maps.googleapis.com/maps/api/place/photo"
                            f"?maxwidth=400&photoreference={photo_reference}"
                            f"&key={GOOGLE_MAPS_API_KEY}"
                        )

                doctors.append(doctor_info)

            # Check for next page token
            next_page_token = result.get("next_page_token")
            page_count += 1

            # Break if no more pages
            if not next_page_token:
                break

            # Google requires a delay before using the next page token
            time.sleep(2)

        # Sort doctors based on the specified criteria
        doctors = sort_doctors(doctors, sort_by, lat, lng)

        # Limit results to max_results
        doctors = doctors[:max_results]

        # Add summary statistics
        summary = {
            'total_found': len(doctors),
            'open_now': sum(1 for d in doctors if d.get('open_now')),
            'with_ratings': sum(1 for d in doctors if d.get('rating')),
            'average_rating': round(sum(d.get('rating', 0) for d in doctors if d.get('rating')) / 
                                  max(sum(1 for d in doctors if d.get('rating')), 1), 2)
        }

        return jsonify({
            'doctors': doctors,
            'summary': summary,
            'search_params': {
                'specialisation': specialisation,
                'location': text if text else f"{lat}, {lng}",
                'sort_by': sort_by
            }
        }), 200

    except requests.exceptions.RequestException as e:
        return jsonify({
            'error': 'Network error while fetching data',
            'details': f'Request failed: {str(e)}'
        }), 500
    except Exception as e:
        return jsonify({
            'error': 'An unexpected error occurred',
            'details': str(e)
        }), 500

@app.route('/doctor-details/<place_id>', methods=['GET'])
def get_doctor_details(place_id):
    """Get detailed information about a specific doctor/clinic"""
    try:
        details = get_place_details(place_id)
        if details:
            return jsonify({
                'details': details,
                'place_id': place_id
            }), 200
        else:
            return jsonify({'error': 'Details not found'}), 404
    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch doctor details',
            'details': str(e)
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("🏥 AetherCare Doctor Finder API Starting...")
    print(f"📍 Server running on http://localhost:3004")
    print(f"🔑 Google Maps API Key: {GOOGLE_MAPS_API_KEY if GOOGLE_MAPS_API_KEY else '❌ Missing'}")
    app.run(debug=True, port=3004, host='0.0.0.0')