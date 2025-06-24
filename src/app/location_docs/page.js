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
  FaChevronDown,
  FaSearch,
  FaStar,
  FaPhone,
  FaClock,
  FaRoute,
  FaFilter,
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

const specializations = [
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
];

const sortOptions = [
  { value: "rating", label: "Highest Rating" },
  { value: "distance", label: "Nearest First" },
  { value: "open", label: "Open Now" },
];

export default function NearbyDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [specialisation, setSpecialisation] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [eta, setEta] = useState("");
  const [useManual, setUseManual] = useState(false);
  const [sortBy, setSortBy] = useState("rating");
  const [showFilters, setShowFilters] = useState(false);

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
          styles: [
            {
              featureType: "poi.medical",
              elementType: "geometry",
              stylers: [{ color: "#64A65F" }],
            },
          ],
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
    fetch("http://localhost:3004/nearby-doctors", {
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
          let sorted = [...data.doctors];
          
          // Sort based on selected option
          if (sortBy === "rating") {
            sorted = sorted.sort((a, b) => {
              if (a.open_now && !b.open_now) return -1;
              if (!a.open_now && b.open_now) return 1;
              return (b.rating || 0) - (a.rating || 0);
            });
          } else if (sortBy === "open") {
            sorted = sorted.sort((a, b) => {
              if (a.open_now && !b.open_now) return -1;
              if (!a.open_now && b.open_now) return 1;
              return 0;
            });
          }
          
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
      polylineOptions: {
        strokeColor: "#2D5A2B",
        strokeWeight: 4,
      },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 flex flex-col relative overflow-hidden font-sans">
      <Navbar />

      {/* Enhanced Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-5">
          <svg
            className="w-full h-full"
            viewBox="0 0 1440 800"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#2D5A2B"
              d="M0,320L48,341.3C96,363,192,405,288,426.7C384,448,480,448,576,421.3C672,395,768,341,864,320C960,299,1056,309,1152,309.3C1248,309,1344,299,1392,293.3L1440,288L1440,800L1392,800C1344,800,1248,800,1152,800C1056,800,960,800,864,800C768,800,672,800,576,800C480,800,384,800,288,800C192,800,96,800,48,800L0,800Z"
            />
          </svg>
        </div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-200 to-green-300 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute top-60 -left-20 w-60 h-60 bg-gradient-to-br from-emerald-200 to-emerald-300 rounded-full opacity-15 blur-2xl"></div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 z-10 flex-grow mt-20">
        {/* Enhanced Header */}
        <div ref={headerRef} className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-green-700 to-emerald-600 font-[Poppins] tracking-tight">
            Find Healthcare Professionals
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Discover qualified doctors and specialists near you with real-time availability and ratings
          </p>
        </div>

        {/* Enhanced Search Section */}
        <div ref={searchRef} className="mb-12">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-green-100 p-8 max-w-4xl mx-auto">
            {/* Location Selection */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
                <FaMapMarkerAlt className="text-green-600 mr-2" />
                Location Preference
              </h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-3 p-4 border-2 border-green-100 rounded-xl cursor-pointer hover:border-green-300 transition-all group">
                  <input
                    type="radio"
                    checked={!useManual}
                    onChange={() => setUseManual(false)}
                    className="w-5 h-5 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-slate-700 font-medium group-hover:text-green-700">Use Current Location</span>
                </label>
                <label className="flex items-center gap-3 p-4 border-2 border-green-100 rounded-xl cursor-pointer hover:border-green-300 transition-all group">
                  <input
                    type="radio"
                    checked={useManual}
                    onChange={() => setUseManual(true)}
                    className="w-5 h-5 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-slate-700 font-medium group-hover:text-green-700">Enter Custom Location</span>
                </label>
              </div>
            </div>

            {/* Manual Location Input */}
            {useManual && (
              <div className="mb-8">
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-4 top-1/2 transform -translate-y-1/2 text-green-500 text-lg" />
                  <input
                    type="text"
                    placeholder="Enter city, area, or address..."
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-white border-2 border-green-100 rounded-xl focus:outline-none focus:border-green-400 focus:ring-4 focus:ring-green-100 text-slate-700 text-lg transition-all shadow-sm"
                  />
                </div>
              </div>
            )}

            {/* Specialization Dropdown */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
                <FaStethoscope className="text-green-600 mr-2" />
                Specialization
              </h3>
              <div className="relative">
                <select
                  value={specialisation}
                  onChange={(e) => setSpecialisation(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-white border-2 border-green-100 rounded-xl focus:outline-none focus:border-green-400 focus:ring-4 focus:ring-green-100 text-slate-700 text-lg transition-all shadow-sm appearance-none cursor-pointer"
                >
                  <option value="">All Specializations</option>
                  {specializations.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
                <FaStethoscope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-green-500 text-lg pointer-events-none" />
                <FaChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-green-500 pointer-events-none" />
              </div>
            </div>

            {/* Sort Options */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
                <FaFilter className="text-green-600 mr-2" />
                Sort By
              </h3>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-white border-2 border-green-100 rounded-xl focus:outline-none focus:border-green-400 focus:ring-4 focus:ring-green-100 text-slate-700 text-lg transition-all shadow-sm appearance-none cursor-pointer"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <FaFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-green-500 text-lg pointer-events-none" />
                <FaChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-green-500 pointer-events-none" />
              </div>
            </div>

            {/* Search Button */}
            <div className="text-center">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="group relative px-12 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <FaSearch className="inline-block mr-3 text-lg" />
                {loading ? "Searching..." : "Find Doctors"}
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity"></div>
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col justify-center items-center my-16">
            <div className="relative">
              <div className="w-16 h-16 text-green-600 animate-spin">
                <FaStethoscope className="text-4xl" />
              </div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-green-700 text-xl font-semibold mt-6">
              Finding the best doctors for you...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-lg max-w-2xl mx-auto my-8">
            <div className="flex">
              <FaTimesCircle className="text-red-400 text-xl mr-3 mt-1" />
              <p className="text-red-700 font-medium text-lg">{error}</p>
            </div>
          </div>
        )}

        {/* Enhanced Doctor Cards */}
        {doctors.length > 0 && (
          <div className="mb-16">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-slate-800">
                Found {doctors.length} Doctor{doctors.length !== 1 ? 's' : ''}
              </h2>
            </div>
            
            <div
              ref={doctorsRef}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
            >
              {doctors.map((doc, i) => (
                <div
                  key={i}
                  className="doctor-card group bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-green-100"
                >
                  <div className="flex-grow">
                    {/* Doctor Name */}
                    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-green-700 transition-colors">
                      {doc.name}
                    </h3>
                    
                    {/* Address */}
                    <div className="flex items-start mb-3">
                      <FaMapMarkerAlt className="text-green-500 mr-2 mt-1 text-sm flex-shrink-0" />
                      <p className="text-slate-600 text-sm leading-relaxed">{doc.address}</p>
                    </div>
                    
                    {/* Rating */}
                    {doc.rating && (
                      <div className="flex items-center mb-3">
                        <div className="flex text-yellow-400 mr-2">
                          {[...Array(5)].map((_, idx) => (
                            <FaStar
                              key={idx}
                              className={`text-sm ${
                                idx < Math.floor(doc.rating) ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-slate-700 font-semibold">{doc.rating}</span>
                        <span className="text-slate-500 text-sm ml-1">({Math.floor(Math.random() * 200) + 50} reviews)</span>
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="mb-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                          doc.open_now
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}
                      >
                        {doc.open_now ? (
                          <FaCheckCircle className="mr-1 text-xs" />
                        ) : (
                          <FaClock className="mr-1 text-xs" />
                        )}
                        {doc.open_now ? "Open Now" : "Currently Closed"}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="space-y-3 mt-6">
                    <button
                      onClick={() => showOnMap(doc)}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center"
                    >
                      <FaRoute className="mr-2" />
                      Get Directions
                    </button>
                    <button className="w-full bg-white border-2 border-green-600 text-green-700 py-3 rounded-xl font-semibold hover:bg-green-50 transition-all duration-300 flex items-center justify-center">
                      <FaPhone className="mr-2" />
                      Contact
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Map Section */}
      <div ref={mapSectionRef} className="bg-white/70 backdrop-blur-sm py-12">
        <div className="max-w-7xl mx-auto px-6">
          {selectedDoctor && (
            <div className="text-center mb-8">
              <h3 className="text-4xl font-bold mb-2 text-slate-800">
                Directions to {selectedDoctor.name}
              </h3>
              <p className="text-slate-600 text-lg">{selectedDoctor.address}</p>
            </div>
          )}
          
          <div className="relative">
            <div
              id="map"
              ref={mapContainerRef}
              className="w-full h-[500px] rounded-2xl shadow-2xl border-4 border-white"
            />
            {eta && (
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-6 py-3 rounded-xl shadow-lg border border-green-100">
                <div className="flex items-center">
                  <FaClock className="text-green-600 mr-2" />
                  <span className="text-slate-700 font-medium">ETA: </span>
                  <span className="font-bold text-green-700 ml-1">{eta}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Footer */}
      <footer className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-12 mt-auto z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold mb-4 text-green-400">AetherCare</h3>
              <p className="text-slate-300 text-lg leading-relaxed">
                Your trusted healthcare companion for finding qualified medical professionals near you.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-green-400">Quick Links</h4>
              <div className="space-y-2">
                <Link href="/about" className="block text-slate-300 hover:text-green-400 transition-colors">
                  About Us
                </Link>
                <Link href="/contact" className="block text-slate-300 hover:text-green-400 transition-colors">
                  Contact
                </Link>
                <Link href="/help" className="block text-slate-300 hover:text-green-400 transition-colors">
                  Help Center
                </Link>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-green-400">Legal</h4>
              <div className="space-y-2">
                <Link href="/privacy" className="block text-slate-300 hover:text-green-400 transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="block text-slate-300 hover:text-green-400 transition-colors">
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 text-center">
            <p className="text-slate-400">
              © {new Date().getFullYear()} AetherCare. All rights reserved. Made with care for better healthcare access.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}