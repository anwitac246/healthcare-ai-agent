"use client";
import Navbar from "@/components/navbar";
import { useEffect, useState, useRef } from "react";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function loadGoogleMapsScript(callback) {
  if (typeof window.google === "object" && typeof window.google.maps === "object") {
    callback();
  } else {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = callback;
    document.head.appendChild(script);
  }
}

export default function NearbyDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [specialisation, setSpecialisation] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [eta, setEta] = useState("");
  const [useManual, setUseManual] = useState(false);
  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  const directionsRendererRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    loadGoogleMapsScript(() => {
      if (mapContainerRef.current && !map) {
        const mapObj = new window.google.maps.Map(mapContainerRef.current, {
          zoom: 12,
          center: { lat: 28.6139, lng: 77.209 },
        });
        setMap(mapObj);
      }
    });
  }, [map]);

  useEffect(() => {
    if (map) window.google.maps.event.trigger(map, "resize");
  }, [map]);

  const clearMarkers = () => {
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
  };

  const fetchDoctors = (lat, lng, text = "") => {
    setLoading(true);
    setError("");
    fetch("http://localhost:5000/nearby-doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        text
          ? { text, specialisation }
          : { lat, lng, specialisation }
      ),
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.details?.error_message || data.error);
          setDoctors([]);
        } else {
          const sorted = data.doctors.sort((a, b) => {
            if (a.open_now && !b.open_now) return -1;
            if (!a.open_now && b.open_now) return 1;
            return (b.rating || 0) - (a.rating || 0);
          });
          setDoctors(sorted);
          setError("");
        }
      })
      .catch(() => {
        setError("Failed to fetch doctors");
        setDoctors([]);
      })
      .finally(() => setLoading(false));
  };

  const handleSearch = () => {
    setSelectedDoctor(null);
    setEta("");
    clearMarkers();
    if (useManual && manualLocation.trim()) {
      fetchDoctors(null, null, manualLocation.trim());
    } else {
      if (!navigator.geolocation) {
        setError("Geolocation is not supported by this browser.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => fetchDoctors(pos.coords.latitude, pos.coords.longitude),
        () => setError("Location access denied.")
      );
    }
  };

  const showOnMap = doctor => {
    setSelectedDoctor(doctor);
    setEta("");
    if (!map) return;
    clearMarkers();
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    const doctorLoc = new window.google.maps.LatLng(doctor.location.lat, doctor.location.lng);
    map.setCenter(doctorLoc);
    const marker = new window.google.maps.Marker({
      position: doctorLoc,
      map,
      title: doctor.name,
    });
    markersRef.current.push(marker);
    const directionsService = new window.google.maps.DirectionsService();
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({ suppressMarkers: true });
    directionsRendererRef.current.setMap(map);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(pos => {
      const origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const destination = { lat: doctor.location.lat, lng: doctor.location.lng };
      directionsService.route(
        { origin, destination, travelMode: window.google.maps.TravelMode.DRIVING },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            directionsRendererRef.current.setDirections(result);
            const leg = result.routes[0].legs[0];
            setEta(leg.duration.text);
          } else {
            setError("Failed to fetch directions.");
            setEta("");
          }
        }
      );
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e0f7fa] to-[#f1f8e9] text-[#004d40] font-sans px-6 py-10">
      <Navbar />

      <div className="max-w-7xl mx-auto fade-in">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-12 text-[#006A71] tracking-tight my-30">
          Find Doctors Near You
        </h1>

        <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-6">
          <label className="flex items-center gap-2 text-lg font-medium">
            <input
              type="radio"
              checked={!useManual}
              onChange={() => setUseManual(false)}
              className="accent-[#006A71]"
            />
            Use My Location
          </label>
          <label className="flex items-center gap-2 text-lg font-medium">
            <input
              type="radio"
              checked={useManual}
              onChange={() => setUseManual(true)}
              className="accent-[#006A71]"
            />
            Enter Location
          </label>
        </div>

        {useManual && (
          <input
            type="text"
            placeholder="Enter a city or area"
            value={manualLocation}
            onChange={e => setManualLocation(e.target.value)}
            className="w-full max-w-xl mx-auto block border border-gray-300 px-5 py-3 rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-[#006A71] mb-6 bg-white"
          />
        )}

        <input
          type="text"
          placeholder="Search by specialisation (e.g. Dentist)"
          value={specialisation}
          onChange={e => setSpecialisation(e.target.value)}
          className="w-full max-w-xl mx-auto block border border-gray-300 px-5 py-3 rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-[#006A71] mb-8 bg-white"
        />

        <div className="text-center">
          <button
            onClick={handleSearch}
            className="bg-[#006A71] text-white px-10 py-3 rounded-full text-lg font-semibold shadow-lg hover:scale-105 hover:bg-[#004d40] transition duration-300"
          >
            Search Doctors
          </button>
        </div>

        {loading && <p className="text-center text-blue-600 mt-4 animate-pulse">Searching...</p>}
        {error && <p className="text-center text-red-600 mt-4">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {doctors.map((doc, i) => (
            <div
              key={i}
              className="glass rounded-3xl p-6 flex flex-col min-h-[350px] shadow-xl hover:shadow-2xl transition duration-300 fade-in"
            >
              <div className="flex-grow">
                <h2 className="text-2xl font-semibold text-[#006A71] mb-1">{doc.name}</h2>
                <p className="text-gray-800 mb-1">{doc.address}</p>
                {doc.rating && (
                  <p className="text-sm text-gray-700">Rating: {doc.rating}</p>
                )}
                <p className={doc.open_now ? "text-green-600" : "text-red-500"}>
                  {doc.open_now ? "Open Now" : "Closed"}
                </p>
              </div>
              <button
                onClick={() => showOnMap(doc)}
                className="mt-auto w-full bg-[#006A71] text-white py-2 rounded-xl hover:bg-[#004d40] transition"
              >
                View on Map
              </button>
            </div>
          ))}
        </div>


        <div className="mt-16 fade-in">
          {selectedDoctor && (
            <h3 className="text-3xl font-bold mb-4 text-[#006A71]">
              Directions to {selectedDoctor.name}
            </h3>
          )}
          <div
            id="map"
            ref={mapContainerRef}
            className="w-full h-[450px] rounded-3xl shadow-2xl border border-gray-200 bg-white"
          />
          {eta && (
            <p className="text-lg font-medium mt-4 text-[#004d40]">
              Estimated Travel Time: <span className="font-bold underline">{eta}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
