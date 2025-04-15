
"use client";

import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/navbar";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FaAmbulance, FaPhone, FaClock, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

export default function AmbulancePage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [selected, setSelected] = useState(null);
  const [editedPhone, setEditedPhone] = useState("");
  const [callStage, setCallStage] = useState("idle");
  const [callResp, setCallResp] = useState(null);
  const [callError, setCallError] = useState("");

  // GSAP refs
  const headerRef = useRef(null);
  const servicesRef = useRef(null);
  const modalRef = useRef(null);

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

  useEffect(() => {
    // Header animation: fade-in and slide-up
    gsap.fromTo(
      headerRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1, ease: "power3.out" }
    );

    // Services animation: staggered fade-in on scroll
    gsap.fromTo(
      servicesRef.current?.querySelectorAll(".service-card"),
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: servicesRef.current,
          start: "top 80%",
        },
      }
    );

    // Modal animation: scale and fade
    if (callStage === "confirm") {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" }
      );
    }

    // Cleanup ScrollTriggers
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [callStage]);

  async function fetchServices(lat, lng) {
    console.log("Fetching services for lat/lng:", lat, lng);
    try {
      const res = await fetch("http://localhost:3002/nearby-ambulance-services", {
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
      const res = await fetch("http://localhost:3002/call-ambulance", {
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
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col relative overflow-hidden font-sans">
      <Navbar />
      {/* Background Wave Pattern */}
      <div className="absolute inset-0 z-0 opacity-10">
        <svg
          className="w-full h-full"
          viewBox="0 0 1440 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#A8D5A2"
            d="M0,160L80,186.7C160,213,320,267,480,266.7C640,267,800,213,960,186.7C1120,160,1280,160,1360,160L1440,160L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
          />
        </svg>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-12 z-10 pt-30">
        <header ref={headerRef} className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#64A65F] font-[Poppins]">
            Nearby Ambulance Services
          </h1>
          <p className="mt-2 text-lg text-[#4B8C47]">
            Find and contact emergency ambulance services near your location.
          </p>
        </header>

        {loading && (
          <div className="flex justify-center items-center my-12">
            <div className="flex flex-col items-center">
              <FaAmbulance className="text-[#64A65F] text-4xl animate-bounce" />
              <p className="text-[#64A65F] text-lg font-semibold mt-2 animate-pulse">
                Finding services...
              </p>
            </div>
          </div>
        )}
        {error && (
          <p className="text-center text-red-600 font-semibold my-12">{error}</p>
        )}
        {!loading && !error && services.length === 0 && (
          <p className="text-center text-[#64A65F] font-semibold my-12">
            No ambulance services found near your location.
          </p>
        )}
        {!loading && services.length > 0 && (
          <div ref={servicesRef} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((svc, i) => (
              <div
                key={i}
                className="service-card bg-white/90 backdrop-blur-md border border-[#A8D5A2]/50 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-[#64A65F] font-[Poppins]">
                    {svc.name}
                  </h2>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                      svc.open_now
                        ? "bg-green-100 text-[#64A65F]"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {svc.open_now ? <FaCheckCircle className="mr-1" /> : <FaTimesCircle className="mr-1" />}
                    {svc.open_now ? "Open" : "Closed"}
                  </span>
                </div>
                <div className="space-y-2 text-[#4B8C47]">
                  <p className="flex items-center">
                    <FaPhone className="mr-2 text-[#A8D5A2]" />
                    <span>{svc.phone_number}</span>
                  </p>
                </div>
                <button
                  onClick={() => startCall(svc)}
                  className="mt-4 w-full py-2 px-4 bg-[#64A65F] text-[#F5F5F5] rounded-lg font-semibold hover:bg-[#4B8C47] transition-all shadow-md hover:shadow-lg hover:scale-105"
                >
                  Call Now
                </button>
              </div>
            ))}
          </div>
        )}
        {callStage === "confirm" && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div
              ref={modalRef}
              className="bg-white/90 backdrop-blur-md rounded-xl p-8 w-full max-w-md border border-[#A8D5A2]/50 shadow-xl"
            >
              <h2 className="text-2xl font-bold text-[#64A65F] font-[Poppins] mb-4">
                Confirm Ambulance Call
              </h2>
              <p className="mb-4 text-[#4B8C47]">
                Calling <strong>{selected.name}</strong>
              </p>
              <label className="block mb-2 text-[#64A65F] font-semibold">
                Phone Number
              </label>
              <div className="relative">
                <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A8D5A2]" />
                <input
                  type="tel"
                  value={editedPhone}
                  onChange={(e) => setEditedPhone(e.target.value)}
                  className="w-full pl-10 p-3 bg-[#F5F5F5] border border-[#A8D5A2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B8C47] text-[#64A65F] transition-all"
                  aria-label="Phone number"
                />
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setCallStage("idle")}
                  className="px-4 py-2 bg-[#F5F5F5] border border-[#A8D5A2] text-[#64A65F] rounded-lg font-semibold hover:bg-[#A8D5A2]/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmCall}
                  className="px-4 py-2 bg-[#64A65F] text-[#F5F5F5] rounded-lg font-semibold hover:bg-[#4B8C47] transition-all shadow-md hover:shadow-lg hover:scale-105"
                >
                  Confirm & Call
                </button>
              </div>
            </div>
          </div>
        )}
        {callStage === "calling" && (
          <div className="flex justify-center items-center my-12">
            <div className="flex flex-col items-center">
              <FaPhone className="text-[#64A65F] text-4xl animate-bounce" />
              <p className="text-[#64A65F] text-lg font-semibold mt-2 animate-pulse">
                Placing call...
              </p>
            </div>
          </div>
        )}
        {callStage === "done" && callResp && (
          <p className="text-center text-[#64A65F] font-semibold my-12">{callResp.message}</p>
        )}
        {callStage === "error" && (
          <p className="text-center text-red-600 font-semibold my-12">{callError}</p>
        )}
      </div>
      <footer className="bg-[#64A65F] text-[#F5F5F5] py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-base">
            © {new Date().getFullYear()} AetherCare. All rights reserved.
          </p>
          <div className="mt-4 space-x-4">
            <Link href="/about" className="text-[#F5F5F5] hover:text-[#A8D5A2] transition">
              About
            </Link>
            <Link href="/contact" className="text-[#F5F5F5] hover:text-[#A8D5A2] transition">
              Contact
            </Link>
            <Link href="/privacy" className="text-[#F5F5F5] hover:text-[#A8D5A2] transition">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
