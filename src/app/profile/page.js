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
    <div className="min-h-screen bg-gradient-to-tr from-white to-[#e0f7fa] font-sans">
  <Navbar />

  <header className="py-16 text-center bg-[#006A71] text-white shadow-xl">
    <h1 className="text-5xl font-extrabold drop-shadow-sm my-10">Profile Dashboard</h1>
    <p className="mt-3 text-lg font-medium opacity-90">
      Personalized insights and medical history at your fingertips.
    </p>
  </header>

  <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
    <section className="relative bg-white/80 backdrop-blur-md border border-[#006A71]/40 rounded-3xl shadow-xl p-8 transition-transform hover:scale-[1.01]">
      <h2 className="text-3xl font-bold text-[#006A71] mb-6">Your Information</h2>

      {isEditing ? (
        <div className="space-y-5">
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your Full Name"
            className="w-full p-4 border border-[#006A71] rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#006A71]"
          />
          <input
            type="date"
            name="dob"
            value={formData.dob}
            onChange={handleChange}
            className="w-full p-4 border border-[#006A71] rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#006A71]"
          />
          <textarea
            name="about"
            value={formData.about}
            onChange={handleChange}
            rows={4}
            placeholder="Tell us about yourself..."
            className="w-full p-4 border border-[#006A71] rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#006A71]"
          ></textarea>
          <button
            onClick={handleSave}
            className="w-full py-3 text-lg font-bold bg-[#006A71] text-white rounded-xl hover:bg-black transition"
          >
            Save Changes
          </button>
        </div>
      ) : (
        <div className="space-y-4 text-black">
          <h3 className="text-4xl font-bold">{userData.name}</h3>
          <p><span className="font-semibold">Email:</span> {userData.email}</p>
          <p><span className="font-semibold">DOB:</span> {userData.dob}</p>
          <p><span className="font-semibold">Age:</span> {userData.age} years</p>
          <p><span className="font-semibold">About:</span> {userData.about || "Not provided"}</p>

          <button
            onClick={() => setIsEditing(true)}
            className="mt-5 w-full py-3 text-lg font-bold bg-[#006A71] text-white rounded-xl hover:bg-black transition"
          >
             Edit Profile
          </button>
        </div>
      )}
    </section>

    <section className="relative bg-white/80 backdrop-blur-md border border-black/10 rounded-3xl shadow-xl p-8 transition-transform hover:scale-[1.01]">
      <h3 className="text-3xl font-bold text-[#006A71] mb-4">About Me</h3>
      <p className="text-lg text-black leading-relaxed">
        {userData.about || "No additional information provided."}
      </p>
    </section>

    <section className="relative bg-white/80 backdrop-blur-md border border-black/10 rounded-3xl shadow-xl p-8 transition-transform hover:scale-[1.01]">
      <h3 className="text-3xl font-bold text-[#006A71] mb-4">Diagnosis History</h3>
      <p className="text-lg text-black mb-6">
        Explore all your diagnosis records with detailed reports.
      </p>

      <div className="grid sm:grid-cols-2 gap-6">
        <Link href="/diagnosis">
          <div className="cursor-pointer p-6 rounded-xl bg-[#006A71] text-white hover:bg-black transition duration-300 shadow-lg hover:shadow-2xl">
            <h4 className="text-2xl font-bold mb-2">View Diagnoses</h4>
            <p className="text-lg">Check your medical insights & past records.</p>
          </div>
        </Link>
        <Link href="/reports">
          <div className="cursor-pointer p-6 rounded-xl bg-[#006A71] text-white hover:bg-black transition duration-300 shadow-lg hover:shadow-2xl">
            <h4 className="text-2xl font-bold mb-2">Download Reports</h4>
            <p className="text-lg">Get detailed diagnosis PDFs anytime.</p>
          </div>
        </Link>
      </div>
    </section>
  </main>
</div>

  );
}
