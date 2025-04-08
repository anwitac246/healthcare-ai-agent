"use client";
import { useEffect, useState } from "react";
import { getDatabase, ref, onValue, update } from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import { firebaseConfig } from "@/app/firebase-config";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/navbar";

if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: "", dob: "", about: "" });
  const router = useRouter();

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
              about: data.about || "Tell us a bit about yourself..." 
            });
          }
        });
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Navbar />
        <div className="mt-6 text-center">
          <p className="text-2xl font-semibold text-black">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-[#006A71]">
      <Navbar />
    
      <header className="py-20 text-center">
        <h1 className="text-5xl font-bold text-black">Dashboard</h1>
        <p className="mt-4 text-xl text-black">
          Your personalized dashboard for medical insights and diagnosis history.
        </p>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-10">
        
        <section className="bg-white shadow-lg border border-black rounded-lg p-8">
          {isEditing ? (
            <div className="space-y-4">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your Name"
                className="w-full p-3 border border-[#006A71] rounded-md focus:outline-none focus:ring-2 focus:ring-[#006A71]"
              />
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full p-3 border border-[#006A71] rounded-md focus:outline-none focus:ring-2 focus:ring-[#006A71]"
              />
              <textarea
                name="about"
                value={formData.about}
                onChange={handleChange}
                placeholder="Tell us about yourself"
                rows={4}
                className="w-full p-3 border border-[#006A71] rounded-md focus:outline-none focus:ring-2 focus:ring-[#006A71]"
              ></textarea>
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-[#006A71] text-white font-bold rounded-md hover:bg-black transition"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="space-y-3 text-black">
              <h2 className="text-4xl font-bold">{userData.name}</h2>
              <p className="text-lg">
                <span className="font-semibold">Email:</span> {userData.email}
              </p>
              <p className="text-lg">
                <span className="font-semibold">Date of Birth:</span> {userData.dob}
              </p>
              <p className="text-lg">
                <span className="font-semibold">Age:</span> {userData.age} years
              </p>
              <p className="text-lg">
                <span className="font-semibold">About Me:</span> {userData.about || "Not provided"}
              </p>
              <button
                onClick={() => setIsEditing(true)}
                className="mt-4 px-6 py-3 bg-[#006A71] text-white font-bold rounded-md hover:bg-black transition"
              >
                Edit Profile
              </button>
            </div>
          )}
        </section>
     
        <section className="bg-white shadow-lg border border-black rounded-lg p-8">
          <h3 className="text-3xl font-bold text-[#006A71] mb-4">About Me</h3>
          <p className="text-lg text-black">
            {userData.about || "No additional information provided."}
          </p>
        </section>
       
        <section className="bg-white shadow-lg border border-black rounded-lg p-8">
          <h3 className="text-3xl font-bold text-[#006A71] mb-4">My Diagnosis History</h3>
          <p className="text-lg text-black mb-6">
            Explore your previous diagnosis records and detailed insights.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Link href="/diagnosis">
              <div className="cursor-pointer bg-[#006A71] text-white p-6 rounded-md shadow-md hover:bg-black transition">
                <h4 className="text-2xl font-bold mb-2">View Diagnoses</h4>
                <p className="text-lg">Check your latest and past medical insights.</p>
              </div>
            </Link>
            <Link href="/reports">
              <div className="cursor-pointer bg-[#006A71] text-white p-6 rounded-md shadow-md hover:bg-black transition">
                <h4 className="text-2xl font-bold mb-2">Download Reports</h4>
                <p className="text-lg">Access your detailed diagnosis reports.</p>
              </div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
