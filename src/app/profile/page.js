
"use client";
import { useEffect, useState, useRef } from "react";
import { getDatabase, ref, onValue, update } from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import { firebaseConfig } from "@/app/firebase-config";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/navbar";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FaUserCircle } from "react-icons/fa";

if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: "", dob: "", about: "" });
  const router = useRouter();

  // GSAP refs for animations
  const headerRef = useRef(null);
  const infoRef = useRef(null);
  const aboutRef = useRef(null);
  const historyRef = useRef(null);

  useEffect(() => {
    const auth = getAuth();
    const db = getDatabase();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userRef = ref(db, `users/${user.uid}`);
        onValue(userRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const dobDate = new Date(data.dob);
            const age = new Date().getFullYear() - dobDate.getFullYear();
            setUserData({ ...data, age });
            setFormData({
              name: data.name || "",
              dob: data.dob || "",
              about: data.about || "Tell us a bit about yourself...",
            });
          }
        });
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    // Header animation: fade-in and slide-up
    gsap.fromTo(
      headerRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1, ease: "power3.out" }
    );

    // Info section: fade-in on scroll
    gsap.fromTo(
      infoRef.current,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: infoRef.current,
          start: "top 80%",
        },
      }
    );

    // About section: fade-in on scroll
    gsap.fromTo(
      aboutRef.current,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: aboutRef.current,
          start: "top 80%",
        },
      }
    );

    // History section: fade-in on scroll
    gsap.fromTo(
      historyRef.current,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: historyRef.current,
          start: "top 80%",
        },
      }
    );

    // Cleanup ScrollTriggers on unmount
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    const auth = getAuth();
    const db = getDatabase();
    const user = auth.currentUser;
    if (user) {
      const userRef = ref(db, `users/${user.uid}`);
      try {
        await update(userRef, {
          name: formData.name,
          dob: formData.dob,
          about: formData.about,
        });
        setIsEditing(false);
      } catch (error) {
        console.error("Error saving user data:", error);
      }
    }
  };

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <Navbar />
        <div className="mt-6 text-center">
          <p className="text-2xl font-semibold text-[#64A65F]">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans">
      <Navbar />

      <header
        ref={headerRef}
        className="relative py-16 text-center bg-gradient-to-t from-[#ffffff]/80 to-[#f5f5f5] shadow-lg overflow-hidden"
      >
        {/* Decorative Background Pattern */}
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
        <div className="relative z-10 max-w-5xl mx-auto pt-13">
          <h1 className="text-4xl md:text-5xl font-bold font-[Poppins] text-[#64A65F] drop-shadow-sm">
            Your Profile
          </h1>
          <p className="mt-4 text-lg text-[#4B8C47] max-w-2xl mx-auto leading-relaxed">
            Manage your personal details and medical history with ease.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        <section
          ref={infoRef}
          className="relative bg-white/90 backdrop-blur-md border border-[#A8D5A2]/50 rounded-3xl shadow-xl p-8 transition-transform hover:shadow-2xl"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Profile Icon */}
            <div className="flex-shrink-0">
              <FaUserCircle className="w-32 h-32 text-[#64A65F] border-4 border-[#A8D5A2] rounded-full shadow-md" />
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-[#64A65F] mb-6 font-[Poppins]">
                Personal Information
              </h2>
              {isEditing ? (
                <div className="space-y-5">
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your Full Name"
                    className="w-full p-4 bg-[#F5F5F5] border border-[#A8D5A2] rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4B8C47] text-[#64A65F] transition-all placeholder:text-[#A8D5A2]/70"
                  />
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    className="w-full p-4 bg-[#F5F5F5] border border-[#A8D5A2] rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4B8C47] text-[#64A65F] transition-all"
                  />
                  <textarea
                    name="about"
                    value={formData.about}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Tell us about yourself..."
                    className="w-full p-4 bg-[#F5F5F5] border border-[#A8D5A2] rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4B8C47] text-[#64A65F] transition-all placeholder:text-[#A8D5A2]/70"
                  />
                  <div className="flex gap-4">
                    <button
                      onClick={handleSave}
                      className="flex-1 py-3 text-lg font-semibold bg-[#64A65F] text-[#F5F5F5] rounded-xl hover:bg-[#4B8C47] transition-all shadow-md hover:shadow-lg"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-3 text-lg font-semibold bg-[#F5F5F5] text-[#64A65F] border border-[#A8D5A2] rounded-xl hover:bg-[#A8D5A2]/20 transition-all shadow-md hover:shadow-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-[#64A65F]">
                  <h3 className="text-3xl font-bold font-[Poppins]">{userData.name || "Anonymous User"}</h3>
                  <p className="text-lg">
                    <span className="font-semibold">Email:</span> {userData.email}
                  </p>
                  <p className="text-lg">
                    <span className="font-semibold">DOB:</span> {userData.dob || "Not provided"}
                  </p>
                  <p className="text-lg">
                    <span className="font-semibold">Age:</span> {userData.age ? `${userData.age} years` : "Not provided"}
                  </p>
                  <p className="text-lg">
                    <span className="font-semibold">About:</span>{" "}
                    {userData.about || "No information provided."}
                  </p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-6 w-full py-3 text-lg font-semibold bg-[#64A65F] text-[#F5F5F5] rounded-xl hover:bg-[#4B8C47] transition-all shadow-md hover:shadow-lg"
                  >
                    Edit Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section
          ref={aboutRef}
          className="relative bg-white/90 backdrop-blur-md border border-[#A8D5A2]/50 rounded-3xl shadow-xl p-8 transition-transform hover:shadow-2xl"
        >
          <h3 className="text-3xl font-bold text-[#64A65F] mb-4 font-[Poppins]">About Me</h3>
          <p className="text-lg text-[#4B8C47] leading-relaxed">
            {userData.about || "Share a bit about yourself to personalize your profile."}
          </p>
        </section>

        <section
          ref={historyRef}
          className="relative bg-white/90 backdrop-blur-md border border-[#A8D5A2]/50 rounded-3xl shadow-xl p-8 transition-transform hover:shadow-2xl"
        >
          <h3 className="text-3xl font-bold text-[#64A65F] mb-6 font-[Poppins]">Medical History</h3>
          <p className="text-lg text-[#4B8C47] mb-6">
            Access your diagnosis records and detailed reports anytime.
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            <Link href="/diagnosis">
              <div className="cursor-pointer p-6 rounded-xl bg-[#64A65F] text-[#F5F5F5] hover:bg-[#4B8C47] transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105">
                <h4 className="text-2xl font-bold mb-2 font-[Poppins]">View Diagnoses</h4>
                <p className="text-lg">Explore your medical insights and past records.</p>
              </div>
            </Link>
            <Link href="/reports">
              <div className="cursor-pointer p-6 rounded-xl bg-[#64A65F] text-[#F5F5F5] hover:bg-[#4B8C47] transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105">
                <h4 className="text-2xl font-bold mb-2 font-[Poppins]">Download Reports</h4>
                <p className="text-lg">Get detailed diagnosis PDFs instantly.</p>
              </div>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-[#64A65F] text-[#F5F5F5] py-8">
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
