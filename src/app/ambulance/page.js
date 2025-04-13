// ambulance.js
"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/navbar";

export default function AmbulancePage() {
  const [services, setServices]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [coords, setCoords]           = useState({ lat: null, lng: null });
  const [selected, setSelected]       = useState(null);
  const [editedPhone, setEditedPhone] = useState("");
  const [callStage, setCallStage]     = useState("idle");
  const [callResp, setCallResp]       = useState(null);
  const [callError, setCallError]     = useState("");

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        console.log("User location:", coords.latitude, coords.longitude);
        setCoords({ lat: coords.latitude, lng: coords.longitude });
        fetchServices(coords.latitude, coords.longitude);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError("Failed to get location: " + err.message);
        setLoading(false);
      }
    );
  }, []);

  async function fetchServices(lat, lng) {
    console.log("Fetching services for lat/lng:", lat, lng);
    try {
      const res = await fetch("http://localhost:7000/nearby-ambulance-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Places API error details:", data.details);
        throw new Error(data.error || "Unknown error");
      }
      setServices(data.ambulance_services);
      setError("");
    } catch (e) {
      console.error("Fetch error:", e);
      setError("Error fetching services: " + e.message);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }

  function startCall(svc) {
    setSelected(svc);
    setEditedPhone(svc.phone_number);
    setCallStage("confirm");
    setCallResp(null);
    setCallError("");
  }

  async function confirmCall() {
    setCallStage("calling");
    try {
      const res = await fetch("http://localhost:7000/call-ambulance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selected.name,
          phone_number: selected.phone_number,
          override_phone_number:
            editedPhone !== selected.phone_number ? editedPhone : null,
          confirm: true,
          lat: coords.lat,
          lng: coords.lng,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Call API error details:", data.details);
        throw new Error(data.error || "Call failed");
      }
      setCallResp(data);
      setCallStage("done");
    } catch (e) {
      console.error("Call error:", e);
      setCallError(e.message);
      setCallStage("error");
    }
  }

  return (
    <div className="min-h-screen bg-[#f0fdfd] px-6 py-10">
      <Navbar />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-[#006A71] mb-6 text-center">
          Nearby Ambulance Services
        </h1>
        {loading && (
          <p className="text-center text-black animate-pulse">Loading…</p>
        )}
        {error && <p className="text-center text-black">{error}</p>}
        {!loading && !error && services.length === 0 && (
          <p className="text-center text-black">No ambulance services found.</p>
        )}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {services.map((svc, i) => (
            <div
              key={i}
              className="bg-white p-4 rounded-xl shadow-md border border-black"
            >
              <h2 className="text-xl font-semibold text-black">{svc.name}</h2>
              <p className={svc.open_now ? "text-green-600" : "text-red-500"}>
                {svc.open_now ? "Open Now" : "Closed"}
              </p>
              <p className="mt-2 text-black font-mono">{svc.phone_number}</p>
              <button
                onClick={() => startCall(svc)}
                className="mt-3 bg-[#006A71] hover:bg-[#00514e] text-white px-4 py-2 rounded"
              >
                Call
              </button>
            </div>
          ))}
        </div>
        {callStage === "confirm" && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md border border-black">
              <h2 className="text-xl font-bold mb-4 text-black">Confirm Call</h2>
              <p className="mb-2 text-black">
                Calling <strong>{selected.name}</strong>
              </p>
              <label className="block mb-2 text-black">Phone number:</label>
              <input
                type="tel"
                value={editedPhone}
                onChange={(e) => setEditedPhone(e.target.value)}
                className="w-full mt-1 border border-black px-3 py-2 rounded text-black"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setCallStage("idle")}
                  className="px-4 py-2 rounded border border-black text-black"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmCall}
                  className="px-4 py-2 rounded bg-[#006A71] text-white"
                >
                  Confirm & Call
                </button>
              </div>
            </div>
          </div>
        )}
        {callStage === "calling" && (
          <p className="mt-6 text-center text-black">Placing call…</p>
        )}
        {callStage === "done" && callResp && (
          <p className="mt-6 text-center text-black">{callResp.message}</p>
        )}
        {callStage === "error" && (
          <p className="mt-6 text-center text-red-600">{callError}</p>
        )}
      </div>
    </div>
  );
}
