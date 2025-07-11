"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { ref, set, update, get } from "firebase/database";
import { app, db } from "@/app/firebase-config";
import SHA256 from "crypto-js/sha256";
import Navbar from "@/components/navbar";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FaGoogle, FaUser, FaLock, FaCalendarAlt, FaBriefcaseMedical, FaHeartbeat, FaUserMd, FaHospital } from "react-icons/fa";

gsap.registerPlugin(ScrollTrigger);

export default function Login() {
  const router = useRouter();
  const auth = getAuth(app);
  const googleProvider = new GoogleAuthProvider();

  const [isSignUp, setIsSignUp] = useState(false);
  const [needExtraInfo, setNeedExtraInfo] = useState(false);
  const [userRecord, setUserRecord] = useState(null);

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [role, setRole] = useState("patient");
  const [specialization, setSpecialization] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const containerRef = useRef(null);
  const formRef = useRef(null);
  const leftPanelRef = useRef(null);

  useEffect(() => {
 
    gsap.fromTo(
      leftPanelRef.current,
      { opacity: 0, x: -50 },
      { opacity: 1, x: 0, duration: 1, ease: "power3.out" }
    );

    gsap.fromTo(
      containerRef.current,
      { opacity: 0, x: 50 },
      { opacity: 1, x: 0, duration: 1, ease: "power3.out", delay: 0.2 }
    );

    gsap.fromTo(
      formRef.current?.querySelectorAll(".form-field") || [],
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power3.out",
        delay: 0.5,
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [isSignUp, needExtraInfo]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !dob) {
      setError("Name and date of birth are required.");
      return;
    }
    if (role === "doctor" && !specialization.trim()) {
      setError("Please specify your specialization.");
      return;
    }
    try {
      const uc = await createUserWithEmailAndPassword(auth, email, password);
      const uid = uc.user.uid;
      const hashed = SHA256(password).toString();
      await set(ref(db, `users/${uid}`), {
        name: name.trim(),
        dob,
        role,
        specialization: role === "doctor" ? specialization.trim() : null,
        email: uc.user.email,
        password: hashed,
        createdAt: new Date().toISOString(),
      });
      router.push("/diagnosis");
    } catch (err) {
      setError(err.message);
    }
  };


  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const uc = await signInWithEmailAndPassword(auth, email, password);
      const uid = uc.user.uid;
      const snap = await get(ref(db, `users/${uid}`));
      if (snap.exists()) {
        const rec = snap.val();
        const ok =
          rec.dob &&
          rec.role &&
          (rec.role === "patient" || (rec.role === "doctor" && rec.specialization));
        if (ok) {
          router.push("/diagnosis");
        } else {
          setUserRecord(rec);
          setName(rec.name || "");
          setDob(rec.dob || "");
          setRole(rec.role || "patient");
          setSpecialization(rec.specialization || "");
          setNeedExtraInfo(true);
        }
      } else {
        setUserRecord(null);
        setName(uc.user.displayName || "");
        setDob("");
        setRole("patient");
        setSpecialization("");
        setNeedExtraInfo(true);
      }
    } catch (err) {
      setError(err.message);
    }
  };

 
  const handleGoogle = async () => {
    setError("");
    try {
      const uc = await signInWithPopup(auth, googleProvider);
      const uid = uc.user.uid;
      const snap = await get(ref(db, `users/${uid}`));
      if (snap.exists()) {
        const rec = snap.val();
        const ok =
          rec.dob &&
          rec.role &&
          (rec.role === "patient" || (rec.role === "doctor" && rec.specialization));
        if (ok) {
          router.push("/diagnosis");
          return;
        }
        setUserRecord(rec);
        setName(rec.name || uc.user.displayName || "");
        setDob(rec.dob || "");
        setRole(rec.role || "patient");
        setSpecialization(rec.specialization || "");
      } else {
        setUserRecord(null);
        setName(uc.user.displayName || "");
        setDob("");
        setRole("patient");
        setSpecialization("");
      }
      setEmail(uc.user.email);
      setNeedExtraInfo(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExtraInfo = async (e) => {
    e.preventDefault();
    setError("");
    if (!dob) {
      setError("Please enter your date of birth.");
      return;
    }
    if (role === "doctor" && !specialization.trim()) {
      setError("Please specify your specialization.");
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      setError("No authenticated user.");
      return;
    }
    try {
      const updates = {
        dob,
        role,
        specialization: role === "doctor" ? specialization.trim() : null,
      };
      if (!userRecord) {
        updates.name = name.trim();
        updates.email = email;
        updates.createdAt = new Date().toISOString();
      }
      await update(ref(db, `users/${user.uid}`), updates);
      router.push("/diagnosis");
    } catch (err) {
      setError(err.message);
    }
  };

  if (needExtraInfo) {
    return (
      <div className="min-h-screen flex">
        <Navbar />
     
        <div ref={leftPanelRef} className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#2D4A3D] to-[#1F3329] relative overflow-hidden">
        
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#A8D5A2" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>
          
          <div className="flex flex-col justify-center items-center text-center p-12 relative z-10">
            <div className="flex items-center space-x-3 mb-8">
              <FaHeartbeat className="text-4xl text-[#A8D5A2]" />
              <h1 className="text-4xl font-bold text-white font-[Poppins]">AetherCare</h1>
            </div>
            
            <p className="text-xl text-[#A8D5A2] mb-6 leading-relaxed max-w-md">
              Your comprehensive healthcare companion, providing all-in-one medical facilities and personalized care solutions.
            </p>
            
            <div className="flex space-x-8 text-[#A8D5A2]">
              <div className="flex flex-col items-center">
                <FaUserMd className="text-2xl mb-2" />
                <span className="text-sm">Expert Doctors</span>
              </div>
              <div className="flex flex-col items-center">
                <FaHospital className="text-2xl mb-2" />
                <span className="text-sm">Complete Care</span>
              </div>
              <div className="flex flex-col items-center">
                <FaHeartbeat className="text-2xl mb-2" />
                <span className="text-sm">24/7 Support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Light */}
        <div className="w-full md:w-1/2 bg-[#F5F5F5] flex items-center justify-center relative">
          {/* Background Wave Pattern */}
          <div className="absolute inset-0 z-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 1440 320" fill="none">
              <path
                fill="#A8D5A2"
                d="M0,160L80,186.7C160,213,320,267,480,266.7C640,267,800,213,960,186.7C1120,160,1280,160,1360,160L1440,160L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
              />
            </svg>
          </div>
          
          <div ref={containerRef} className="bg-white/90 backdrop-blur-md shadow-lg rounded-xl p-8 max-w-md w-full mx-4 border border-[#A8D5A2]/50 z-10">
            <h2 className="text-3xl font-bold mb-6 text-center text-[#64A65F] font-[Poppins]">
              Complete Your Profile
            </h2>
            {error && (
              <p className="text-red-500 mb-4 text-center font-semibold">{error}</p>
            )}
            <form ref={formRef} onSubmit={handleExtraInfo} className="space-y-6">
              <div className="form-field">
                <label htmlFor="dob" className="block font-semibold text-[#64A65F]">
                  Date of Birth
                </label>
                <div className="relative">
                  <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A8D5A2]" />
                  <input
                    type="date"
                    id="dob"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="mt-1 w-full pl-10 p-3 bg-[#F5F5F5] border border-[#A8D5A2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B8C47] text-[#64A65F] transition-all"
                    required
                  />
                </div>
              </div>
              <div className="form-field">
                <label className="block font-semibold mb-2 text-[#64A65F]">
                  I am a
                </label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="patient"
                      checked={role === "patient"}
                      onChange={(e) => setRole(e.target.value)}
                      className="form-radio text-[#64A65F] focus:ring-[#4B8C47]"
                    />
                    <span className="ml-2 text-[#64A65F]">Patient</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="doctor"
                      checked={role === "doctor"}
                      onChange={(e) => setRole(e.target.value)}
                      className="form-radio text-[#64A65F] focus:ring-[#4B8C47]"
                    />
                    <span className="ml-2 text-[#64A65F]">Doctor</span>
                  </label>
                </div>
              </div>
              {role === "doctor" && (
                <div className="form-field">
                  <label
                    htmlFor="specialization"
                    className="block font-semibold text-[#64A65F]"
                  >
                    Specialization
                  </label>
                  <div className="relative">
                    <FaBriefcaseMedical className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A8D5A2]" />
                    <input
                      type="text"
                      id="specialization"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="mt-1 w-full pl-10 p-3 bg-[#F5F5F5] border border-[#A8D5A2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B8C47] text-[#64A65F] transition-all"
                      required
                    />
                  </div>
                </div>
              )}
              <button
                type="submit"
                className="w-full py-3 text-lg font-semibold bg-[#64A65F] text-[#F5F5F5] rounded-lg hover:bg-[#4B8C47] transition-all shadow-md hover:shadow-lg hover:scale-105"
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Navbar />
      
   
      <div ref={leftPanelRef} className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#2D4A3D] to-[#1F3329] relative overflow-hidden">
    
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#A8D5A2" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>
        
        <div className="flex flex-col justify-center items-center text-center p-12 relative z-10">
          <div className="flex items-center space-x-3 mb-8">
            <FaHeartbeat className="text-4xl text-[#A8D5A2]" />
            <h1 className="text-4xl font-bold text-white font-[Poppins]">AetherCare</h1>
          </div>
          
          <p className="text-xl text-[#A8D5A2] mb-6 leading-relaxed max-w-md">
            Your comprehensive healthcare companion, providing all-in-one medical facilities and personalized care solutions.
          </p>
          
          <div className="flex space-x-8 text-[#A8D5A2]">
            <div className="flex flex-col items-center">
              <FaUserMd className="text-2xl mb-2" />
              <span className="text-sm">Expert Doctors</span>
            </div>
            <div className="flex flex-col items-center">
              <FaHospital className="text-2xl mb-2" />
              <span className="text-sm">Complete Care</span>
            </div>
            <div className="flex flex-col items-center">
              <FaHeartbeat className="text-2xl mb-2" />
              <span className="text-sm">24/7 Support</span>
            </div>
          </div>
        </div>
      </div>

     
      <div className="w-full md:w-1/2 bg-[#F5F5F5] flex items-center justify-center relative">
     
        <div className="absolute inset-0 z-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1440 320" fill="none">
            <path
              fill="#A8D5A2"
              d="M0,160L80,186.7C160,213,320,267,480,266.7C640,267,800,213,960,186.7C1120,160,1280,160,1360,160L1440,160L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
            />
          </svg>
        </div>
        
        <div ref={containerRef} className="bg-white/90 backdrop-blur-md shadow-lg rounded-xl p-8 max-w-md w-full mx-4 border border-[#A8D5A2]/50 z-10">
          <h2 className="text-3xl font-bold mb-6 text-center text-[#64A65F] font-[Poppins]">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>
          {error && (
            <p className="text-red-500 mb-4 text-center font-semibold">{error}</p>
          )}
          <div className="flex justify-center mb-6">
            <div className="flex bg-[#F5F5F5] rounded-full p-1">
              <button
                onClick={() => {
                  setError("");
                  setIsSignUp(false);
                }}
                className={`px-6 py-2 rounded-full font-semibold transition-all ${
                  !isSignUp ? "bg-[#64A65F] text-[#F5F5F5]" : "text-[#64A65F]"
                }`}
              >
                Login
              </button>
              <button
                onClick={() => {
                  setError("");
                  setIsSignUp(true);
                }}
                className={`px-6 py-2 rounded-full font-semibold transition-all ${
                  isSignUp ? "bg-[#64A65F] text-[#F5F5F5]" : "text-[#64A65F]"
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>
          <form
            ref={formRef}
            onSubmit={isSignUp ? handleSignUp : handleLogin}
            className="space-y-6"
          >
            {isSignUp && (
              <>
                <div className="form-field">
                  <label
                    htmlFor="name"
                    className="block font-semibold text-[#64A65F]"
                  >
                    Name
                  </label>
                  <div className="relative">
                    <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A8D5A2]" />
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full pl-10 p-3 bg-[#F5F5F5] border border-[#A8D5A2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B8C47] text-[#64A65F] transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="form-field">
                  <label
                    htmlFor="dob"
                    className="block font-semibold text-[#64A65F]"
                  >
                    Date of Birth
                  </label>
                  <div className="relative">
                    <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A8D5A2]" />
                    <input
                      type="date"
                      id="dob"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="mt-1 w-full pl-10 p-3 bg-[#F5F5F5] border border-[#A8D5A2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B8C47] text-[#64A65F] transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="form-field">
                  <label className="block font-semibold mb-2 text-[#64A65F]">
                    I am a
                  </label>
                  <div className="flex space-x-4">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="patient"
                        checked={role === "patient"}
                        onChange={(e) => setRole(e.target.value)}
                        className="form-radio text-[#64A65F] focus:ring-[#4B8C47]"
                      />
                      <span className="ml-2 text-[#64A65F]">Patient</span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="doctor"
                        checked={role === "doctor"}
                        onChange={(e) => setRole(e.target.value)}
                        className="form-radio text-[#64A65F] focus:ring-[#4B8C47]"
                      />
                      <span className="ml-2 text-[#64A65F]">Doctor</span>
                    </label>
                  </div>
                </div>
                {role === "doctor" && (
                  <div className="form-field">
                    <label
                      htmlFor="specialization"
                      className="block font-semibold text-[#64A65F]"
                    >
                      Specialization
                    </label>
                    <div className="relative">
                      <FaBriefcaseMedical className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A8D5A2]" />
                      <input
                        type="text"
                        id="specialization"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className="mt-1 w-full pl-10 p-3 bg-[#F5F5F5] border border-[#A8D5A2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B8C47] text-[#64A65F] transition-all"
                        required
                      />
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="form-field">
              <label
                htmlFor="email"
                className="block font-semibold text-[#64A65F]"
              >
                Email
              </label>
              <div className="relative">
                <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A8D5A2]" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full pl-10 p-3 bg-[#F5F5F5] border border-[#A8D5A2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B8C47] text-[#64A65F] transition-all"
                  required
                />
              </div>
            </div>
            <div className="form-field">
              <label
                htmlFor="password"
                className="block font-semibold text-[#64A65F]"
              >
                Password
              </label>
              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A8D5A2]" />
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full pl-10 p-3 bg-[#F5F5F5] border border-[#A8D5A2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B8C47] text-[#64A65F] transition-all"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-3 text-lg font-semibold bg-[#64A65F] text-[#F5F5F5] rounded-lg hover:bg-[#4B8C47] transition-all shadow-md hover:shadow-lg hover:scale-105"
            >
              {isSignUp ? "Sign Up" : "Login"}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button
              onClick={handleGoogle}
              className="flex items-center justify-center space-x-2 w-full py-3 border border-[#A8D5A2] text-[#64A65F] rounded-lg hover:bg-[#A8D5A2]/20 transition-all shadow-md hover:shadow-lg hover:scale-105"
            >
              <FaGoogle />
              <span>Sign in with Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}