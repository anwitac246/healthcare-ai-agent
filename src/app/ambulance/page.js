"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/navbar";

export default function AmbulancePage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  const [selected, setSelected] = useState(null);
  const [editedPhone, setEditedPhone] = useState("");
  const [callStage, setCallStage] = useState("idle"); 
  const [callResp, setCallResp] = useState(null);
  const [callError, setCallError] = useState("");

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => fetchServices(coords.latitude, coords.longitude),
      (err) => {
        setError("Failed to get location: " + err.message);
        setLoading(false);
      }
    );
  }, []);

  async function fetchServices(lat, lng) {
    try {
      const res = await fetch("http://localhost:7000/nearby-ambulance-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setServices(data.ambulance_services);
      setError("");
    } catch (e) {
      setError("Error fetching services: " + e.message);
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
          phone_number: editedPhone,
          confirm: true
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Call failed");
      setCallResp(data);
      setCallStage("done");
    } catch (e) {
      setCallError(e.message);
      setCallStage("error");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e0f7fa] to-[#f1f8e9] px-6 py-10">
      <Navbar />

      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-[#004d40] mb-6 text-center mt-20">
          Nearby Ambulance Services
        </h1>

        {loading && <p className="text-center text-blue-700 animate-pulse">Loading…</p>}
        {error && <p className="text-center text-red-600">{error}</p>}
        {!loading && !error && services.length === 0 && (
          <p className="text-center text-gray-600">No ambulance services found.</p>
        )}

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {services.map((svc, i) => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-md border">
              <h2 className="text-xl font-semibold text-[#00695c]">{svc.name}</h2>
              <p className={svc.open_now ? "text-green-600" : "text-red-500"}>
                {svc.open_now ? "Open Now" : "Closed"}
              </p>
              <p className="mt-2 text-gray-700">
                 <span className="font-mono">{svc.phone_number}</span>
              </p>
              <button
                onClick={() => startCall(svc)}
                className="mt-3 bg-[#00695c] hover:bg-[#004d40] text-white px-4 py-2 rounded"
              >
                Call
              </button>
            </div>
          ))}
        </div>

  
        {callStage === "confirm" && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Confirm Call</h2>
              <p className="mb-2">
                Calling <strong>{selected.name}</strong>
              </p>
              <label className="block mb-2">
                Phone number:
                <input
                  type="tel"
                  value={editedPhone}
                  onChange={(e) => setEditedPhone(e.target.value)}
                  className="w-full mt-1 border px-3 py-2 rounded"
                />
              </label>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setCallStage("idle")}
                  className="px-4 py-2 rounded border"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmCall}
                  className="px-4 py-2 rounded bg-[#00695c] text-white"
                >
                  Confirm & Call
                </button>
              </div>
            </div>
          </div>
        )}

        {callStage === "calling" && (
          <p className="mt-6 text-center text-blue-700">Placing call…</p>
        )}
        {callStage === "done" && callResp && (
          <p className="mt-6 text-center text-green-600">
             {callResp.message}
          </p>
        )}
        {callStage === "error" && (
          <p className="mt-6 text-center text-red-600"> {callError}</p>
        )}
      </div>
    </div>
  );
}
