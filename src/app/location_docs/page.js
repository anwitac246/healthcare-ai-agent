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
    if (map) {
      window.google.maps.event.trigger(map, "resize");
    }
  }, [map]);

  const clearMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  };

  const fetchDoctors = (lat, lng, text = "") => {
    setLoading(true);
    fetch("http://localhost:5000/nearby-doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(text ? { text } : { lat, lng }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.details?.error_message || data.error);
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
      .catch(() => setError("Failed to fetch doctors"))
      .finally(() => setLoading(false));
  };

  const handleSearch = () => {
    setSelectedDoctor(null);
    setEta("");
    clearMarkers();
    if (useManual && manualLocation.trim()) {
      fetchDoctors(null, null, manualLocation);
    } else {
      if (!navigator.geolocation) {
        setError("Geolocation is not supported by this browser.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchDoctors(pos.coords.latitude, pos.coords.longitude),
        () => setError("Location access denied.")
      );
    }
  };

  const showOnMap = (doctor) => {
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
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
    });
    directionsRendererRef.current.setMap(map);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      const origin = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      const destination = {
        lat: doctor.location.lat,
        lng: doctor.location.lng,
      };

      directionsService.route(
        {
          origin,
          destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
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
    <div className="min-h-screen font-mono bg-gradient-to-br from-[#e0f7fa] to-[#f1f8e9] px-6 py-10">
      <Navbar />
      <div className="max-w-6xl mx-auto my-20">
        <h1 className="text-5xl font-extrabold text-center text-[#006A71] mb-12 drop-shadow">
          Find Nearby Doctors
        </h1>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-10">
          <label className="flex items-center gap-2 text-lg font-semibold text-[#004d40]">
            <input
              type="radio"
              checked={!useManual}
              onChange={() => setUseManual(false)}
              className="accent-[#006A71]"
            />
            Use Current Location
          </label>
          <label className="flex items-center text-[#006A71] gap-2 text-lg font-semibold">
            <input
              type="radio"
              checked={useManual}
              onChange={() => setUseManual(true)}
              className="accent-[#006A71]"
            />
            Enter Location Manually
          </label>
        </div>

        {useManual && (
          <input
            type="text"
            placeholder="Enter a location (e.g., Mumbai)"
            value={manualLocation}
            onChange={(e) => setManualLocation(e.target.value)}
            className="w-full items-center text-[#006A71] max-w-xl mx-auto border border-gray-300 px-5 py-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-[#004d40] mb-8"
          />
        )}

        <div className="text-center">
          <button
            onClick={handleSearch}
            className="bg-[#006A71] cursor-pointer hover:bg-[#00251a] text-white px-8 py-3 rounded-full text-lg font-bold shadow-lg transition-transform hover:scale-105 duration-300"
          >
             Search
          </button>
        </div>

        {loading && <p className="text-center text-blue-700 mt-4 animate-pulse">Loading...</p>}
        {error && <p className="text-center text-red-600 mt-4">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
  {doctors.map((doc, i) => (
    <div
      key={i}
      className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 hover:shadow-2xl hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between min-h-[280px]"
    >
      <div>
        <h2 className="text-xl font-bold text-[#00695c] mb-2">{doc.name}</h2>
        <p className="text-gray-700 mb-1">{doc.address}</p>
        {doc.rating && <p className="text-gray-600">⭐ {doc.rating}</p>}
        <p className={doc.open_now ? "text-green-600" : "text-red-500"}>
          {doc.open_now ? "Open Now" : "Closed"}
        </p>
      </div>
      <button
        onClick={() => showOnMap(doc)}
        className="mt-6 w-full bg-[#00695c] text-white py-2 rounded-lg hover:bg-[#004d40] transition"
      >
        Show on Map
      </button>
    </div>
  ))}
</div>


        <div className="mt-16">
          <h3 className="text-2xl font-bold mb-4 text-[#004d40]">
            {selectedDoctor ? `🗺️ Directions to ${selectedDoctor.name}` : "📍 Map"}
          </h3>
          <div
            id="map"
            ref={mapContainerRef}
            className="w-full h-[450px] rounded-xl shadow-2xl border border-gray-200"
          />
          {eta && (
            <p className="text-lg text-[#004d40] font-semibold mt-4">
              Estimated travel time: <span className="underline">{eta}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
