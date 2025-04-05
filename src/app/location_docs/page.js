"use client";
import { useEffect, useState } from "react";

export default function NearbyDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationMode, setLocationMode] = useState("current");
  const [manualLocation, setManualLocation] = useState("");

  const fetchDoctors = async (payload) => {
    setLoading(true);
    setError("");
    setDoctors([]);

    try {
      const res = await fetch("http://localhost:5000/nearby-doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.details?.error_message || data.error);
      } else {
        const sorted = [...data.doctors].sort((a, b) => {
          if (b.open_now === a.open_now) {
            return (b.rating || 0) - (a.rating || 0);
          }
          return (b.open_now ? 1 : 0) - (a.open_now ? 1 : 0);
        });
        setDoctors(sorted);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch doctors.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (locationMode === "manual") {
      if (!manualLocation.trim()) {
        setError("Please enter a location.");
        return;
      }
      fetchDoctors({ text: manualLocation.trim() });
    } else if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          fetchDoctors({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => {
          setError("Location permission denied.");
        }
      );
    } else {
      setError("Geolocation not supported.");
    }
  };

  useEffect(() => {
    handleSearch();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#e7ecef] via-[#fdfaf6] to-[#e0f7f4] text-[#003f46] px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-10">Find Nearby Doctors</h1>

        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-6 mb-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="location"
                  value="current"
                  checked={locationMode === "current"}
                  onChange={() => setLocationMode("current")}
                  className="accent-[#006A71]"
                />
                Use Current Location
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="location"
                  value="manual"
                  checked={locationMode === "manual"}
                  onChange={() => setLocationMode("manual")}
                  className="accent-[#006A71]"
                />
                Enter Location Manually
              </label>
            </div>

            {locationMode === "manual" && (
              <input
                type="text"
                placeholder="e.g. New Delhi, India"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#006A71] focus:outline-none w-full sm:w-64"
              />
            )}

            <button
              onClick={handleSearch}
              className="bg-[#006A71] text-white px-6 py-2 rounded-xl font-medium hover:bg-[#004d52] transition transform hover:scale-105 shadow-md"
            >
              Search
            </button>
          </div>
        </div>

        {loading && <p className="text-center text-[#006A71]">Loading...</p>}
        {error && <p className="text-center text-red-500 font-medium">{error}</p>}
        {!loading && !error && doctors.length === 0 && (
          <p className="text-center text-gray-600">No doctors found.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
          {doctors.map((doc, index) => (
            <div
              key={index}
              className="bg-white/80 backdrop-blur-lg border border-gray-200 rounded-2xl shadow-xl p-6 transition-all hover:shadow-2xl hover:-translate-y-1"
            >
              <h2 className="text-xl font-semibold mb-1">{doc.name}</h2>
              <p className="text-gray-700 mb-1">
                <span className="font-medium">Address:</span> {doc.address}
              </p>
              {doc.rating && (
                <p className="text-gray-700 mb-1">
                  <span className="font-medium">Rating:</span> {doc.rating} ⭐
                </p>
              )}
              {"open_now" in doc && (
                <p
                  className={`font-medium ${
                    doc.open_now ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {doc.open_now ? "Open Now" : "Closed"}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.6s ease-in-out both;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0px);
          }
        }
      `}</style>
    </div>
  );
}
