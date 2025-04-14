"use client";

import Navbar from "@/components/navbar";
import { useEffect, useState, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  FaMapMarkerAlt,
  FaStethoscope,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function loadGoogleMapsScript(callback) {
  if (window.google?.maps) {
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

  const headerRef = useRef(null);
  const searchRef = useRef(null);
  const doctorsRef = useRef(null);
  const mapSectionRef = useRef(null);

  // Load Google Maps
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

  // GSAP animations
  useEffect(() => {
    if (map) window.google.maps.event.trigger(map, "resize");

    gsap.fromTo(
      headerRef.current,
      { opacity: 0, y: -50 },
      { opacity: 1, y: 0, duration: 1, ease: "power3.out" }
    );
    gsap.fromTo(
      searchRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1, ease: "power3.out", delay: 0.2 }
    );
    gsap.fromTo(
      doctorsRef.current?.querySelectorAll(".doctor-card"),
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: doctorsRef.current,
          start: "top 80%",
        },
      }
    );
    gsap.fromTo(
      mapSectionRef.current,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: mapSectionRef.current,
          start: "top 80%",
        },
      }
    );

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, [map, doctors]);

  const clearMarkers = () => {
    markersRef.current.forEach((m) => m.setMap(null));
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
      .then((res) => res.json())
      .then((data) => {
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
        (pos) => fetchDoctors(pos.coords.latitude, pos.coords.longitude),
        () => setError("Location access denied.")
      );
    }
  };

  const showOnMap = (doctor) => {
    // Scroll map into view
    if (mapSectionRef.current) {
      mapSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    setSelectedDoctor(doctor);
    setEta("");
    if (!map) return;
    clearMarkers();

    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }

    const doctorLoc = new window.google.maps.LatLng(
      doctor.location.lat,
      doctor.location.lng
    );
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
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col relative overflow-hidden font-sans">
      <Navbar />

      {/* Background Wave */}
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 z-10">
        <h1
          ref={headerRef}
          className="text-4xl my-20 md:text-5xl font-bold text-center mb-12 text-[#64A65F] font-[Poppins] tracking-tight"
        >
          Find Doctors Near You
        </h1>

        {/* Search */}
        <div ref={searchRef} className="mb-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-6">
            <label className="flex items-center gap-2 text-lg font-medium text-[#4B8C47]">
              <input
                type="radio"
                checked={!useManual}
                onChange={() => setUseManual(false)}
                className="accent-[#64A65F]"
              />
              Use My Location
            </label>
            <label className="flex items-center gap-2 text-lg font-medium text-[#4B8C47]">
              <input
                type="radio"
                checked={useManual}
                onChange={() => setUseManual(true)}
                className="accent-[#64A65F]"
              />
              Enter Location
            </label>
          </div>

          {useManual && (
            <div className="relative max-w-xl mx-auto mb-6">
              <FaMapMarkerAlt className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#A8D5A2]" />
              <input
                type="text"
                placeholder="Enter a city or area"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                className="w-full pl-12 pr-5 py-3 bg-[#F5F5F5] border border-[#A8D5A2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B8C47] text-[#64A65F] transition-all"
              />
            </div>
          )}

          <div className="relative max-w-xl mx-auto mb-8">
            <FaStethoscope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#A8D5A2]" />
            <input
              type="text"
              placeholder="Search by specialisation (e.g., Dentist)"
              value={specialisation}
              onChange={(e) => setSpecialisation(e.target.value)}
                className="w-full pl-12 pr-5 py-3 bg-[#F5F5F5] border border-[#A8D5A2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B8C47] text-[#64A65F] transition-all"
            />
          </div>

          <div className="text-center">
            <button
              onClick={handleSearch}
              className="px-10 py-3 bg-[#64A65F] text-[#F5F5F5] rounded-lg text-lg font-semibold shadow-lg hover:bg-[#4B8C47] hover:scale-105 transition-all"
            >
              Search Doctors
            </button>
          </div>
        </div>

        {/* Loading & Error */}
        {loading && (
          <div className="flex justify-center items-center my-12">
            <FaStethoscope className="text-[#64A65F] text-4xl animate-bounce" />
            <p className="text-[#64A65F] text-lg font-semibold mt-2 animate-pulse">
              Searching for doctors...
            </p>
          </div>
        )}
        {error && (
          <p className="text-center text-red-600 font-semibold my-12">
            {error}
          </p>
        )}

        {/* Doctor Cards */}
        {doctors.length > 0 && (
          <div
            ref={doctorsRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-12"
          >
            {doctors.map((doc, i) => (
              <div
                key={i}
                className="doctor-card bg-white/90 backdrop-blur-md rounded-xl p-6 flex flex-col min-h-[300px] shadow-lg hover:shadow-2xl transition-all hover:scale-[1.02]"
              >
                <div className="flex-grow">
                  <h2 className="text-xl font-semibold text-[#64A65F] font-[Poppins] mb-2">
                    {doc.name}
                  </h2>
                  <p className="text-[#4B8C47] mb-2">{doc.address}</p>
                  {doc.rating && (
                    <p className="text-sm text-[#4B8C47]">
                      Rating: <span className="font-semibold">{doc.rating}</span>
                    </p>
                  )}
                  <span
                    className={`inline-flex items-center mt-2 px-3 py-1 rounded-full text-sm font-semibold ${
                      doc.open_now
                        ? "bg-green-100 text-[#64A65F]"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {doc.open_now ? (
                      <FaCheckCircle className="mr-1" />
                    ) : (
                      <FaTimesCircle className="mr-1" />
                    )}
                    {doc.open_now ? "Open" : "Closed"}
                  </span>
                </div>
                <button
                  onClick={() => showOnMap(doc)}
                  className="mt-auto w-full bg-[#64A65F] text-[#F5F5F5] py-2 rounded-lg font-semibold hover:bg-[#4B8C47] transition-all hover:scale-105"
                >
                  View on Map
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full‑width Map Section with 1rem margins */}
      <div ref={mapSectionRef} className="mt-16">
        {selectedDoctor && (
          <h3 className="text-3xl font-bold mb-4 text-[#64A65F] font-[Poppins] text-center">
            Directions to {selectedDoctor.name}
          </h3>
        )}
        <div className="m-4">
          <div
            id="map"
            ref={mapContainerRef}
            className="w-full h-[450px] rounded-xl shadow-xl border border-[#A8D5A2]/50 bg-white/90 backdrop-blur-md"
          />
        </div>
        {eta && (
          <p className="text-lg font-medium mt-4 text-[#4B8C47] text-center">
            Estimated Travel Time:{" "}
            <span className="font-bold underline">{eta}</span>
          </p>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-[#64A65F] text-[#F5F5F5] py-8 mt-auto z-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-base">
            © {new Date().getFullYear()} AetherCare. All rights reserved.
          </p>
          <div className="mt-4 space-x-4">
            <Link
              href="/about"
              className="text-[#F5F5F5] hover:text-[#A8D5A2] transition"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-[#F5F5F5] hover:text-[#A8D5A2] transition"
            >
              Contact
            </Link>
            <Link
              href="/privacy"
              className="text-[#F5F5F5] hover:text-[#A8D5A2] transition"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
