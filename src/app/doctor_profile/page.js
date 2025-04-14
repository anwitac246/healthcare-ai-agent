'use client';
import React, { useEffect, useState, useRef } from 'react';
import Navbar from '@/components/navbar';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db, app } from '@/app/firebase-config';
import { ref, onValue, update, push, set } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FaUser, FaCalendarAlt, FaVideo, FaCheckCircle, FaTimesCircle, FaClock, FaBars, FaTimes, FaPlus, FaRegFileAlt } from 'react-icons/fa';
import Link from 'next/link';

gsap.registerPlugin(ScrollTrigger);

export default function DoctorProfile() {
  const [appointments, setAppointments] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // GSAP refs
  const headerRef = useRef(null);
  const apptsRef = useRef(null);

  // Auth listener
  useEffect(() => {
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Load & auto-expire appointments
  useEffect(() => {
    if (!userId) return;
    const apptRef = ref(db, 'appointments');
    const unsub = onValue(apptRef, (snap) => {
      const data = snap.val() || {};
      const all = Object.entries(data).map(([id, v]) => ({ id, ...v }));
      const now = Date.now();

      // Expire old links
      all.forEach((appt) => {
        if (
          appt.status === 'accepted' &&
          appt.generatedAt &&
          now > appt.generatedAt + 30 * 60 * 1000
        ) {
          update(ref(db, `appointments/${appt.id}`), {
            status: 'completed',
            meetingLink: null,
            generatedAt: null,
            roomId: null,
          });
        }
      });

      // Filter & sort appointments for the doctor
      const docs = all
        .filter((a) => a.doctorId === userId)
        .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
      setAppointments(docs);
    });
    return () => unsub();
  }, [userId]);

  // GSAP animations
  useEffect(() => {
    // Header animation: fade-in and slide-up
    gsap.fromTo(
      headerRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }
    );

    // Appointment cards: staggered fade-in on scroll
    gsap.fromTo(
      apptsRef.current?.querySelectorAll('.appt-card'),
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: apptsRef.current,
          start: 'top 80%',
        },
      }
    );

    // Cleanup ScrollTriggers
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [appointments]);

  // Accept / Reject
  const handleAction = async (appt, action) => {
    const apptRef = ref(db, `appointments/${appt.id}`);
    const updates = { status: action === 'accept' ? 'accepted' : 'rejected' };

    if (action === 'accept') {
      const roomId = uuidv4();
      updates.roomId = roomId;
      updates.meetingLink = `${window.location.origin}/room/${roomId}`;
      updates.generatedAt = Date.now();
    }

    try {
      await update(apptRef, updates);
    } catch (err) {
      console.error(err);
      alert('Failed to update appointment. Try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <p className="text-[#64A65F] text-xl font-semibold font-[Poppins]">
          Loading…
        </p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <p className="text-red-500 text-xl font-semibold font-[Poppins]">
          Login required.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col relative overflow-hidden font-sans">
      <style jsx>{`
        .particles {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }
        .particle {
          position: absolute;
          background: rgba(168, 213, 162, 0.5);
          border-radius: 50%;
          animation: float 15s infinite ease-in-out;
        }
        .particle:nth-child(1) {
          width: 20px;
          height: 20px;
          left: 10%;
          top: 20%;
          animation-delay: 0s;
        }
        .particle:nth-child(2) {
          width: 15px;
          height: 15px;
          left: 30%;
          top: 50%;
          animation-delay: 2s;
        }
        .particle:nth-child(3) {
          width: 25px;
          height: 25px;
          left: 60%;
          top: 30%;
          animation-delay: 4s;
        }
        .particle:nth-child(4) {
          width: 18px;
          height: 18px;
          left: 80%;
          top: 70%;
          animation-delay: 6s;
        }
        .particle:nth-child(5) {
          width: 22px;
          height: 22px;
          left: 40%;
          top: 10%;
          animation-delay: 8s;
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0.5;
          }
          50% {
            transform: translateY(-100px) scale(0.8);
            opacity: 0.2;
          }
        }
      `}</style>
      <Navbar />

      <div className="particles">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>
      
      <div className="max-w-6xl mx-auto px-6 py-12 z-10 pt-25">
        <header ref={headerRef} className="mb-8">
          <h2 className="text-4xl font-bold text-[#64A65F] font-[Poppins]">
            Doctor Dashboard
          </h2>
          <p className="mt-2 text-lg text-[#4B8C47]">
            Manage your appointments and connect with patients seamlessly.
          </p>
        </header>

        {appointments.length === 0 ? (
          <div className="text-center">
            <p className="text-[#64A65F] text-lg font-semibold">
              No appointments scheduled yet.
            </p>
          </div>
        ) : (
          <div ref={apptsRef} className="grid md:grid-cols-2 gap-6 w-full">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="appt-card bg-white/90 backdrop-blur-md border border-[#A8D5A2]/50 rounded-xl p-8 min-h-[200px] shadow-lg hover:shadow-2xl transition-all hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-[#64A65F] font-[Poppins]">
                    {appt.patientName}
                  </h3>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold capitalize ${
                      {
                        pending: 'bg-yellow-100 text-yellow-600',
                        accepted: 'bg-green-100 text-[#64A65F]',
                        rejected: 'bg-red-100 text-red-600',
                        completed: 'bg-gray-100 text-gray-500',
                      }[appt.status]
                    }`}
                  >
                    {appt.status === 'pending' && <FaClock className="mr-1" />}
                    {appt.status === 'accepted' && <FaCheckCircle className="mr-1" />}
                    {appt.status === 'rejected' && <FaTimesCircle className="mr-1" />}
                    {appt.status}
                  </span>
                </div>
                <div className="space-y-2 text-[#4B8C47]">
                  <p className="flex items-center">
                    <FaCalendarAlt className="mr-2 text-[#A8D5A2]" />
                    <span>{new Date(appt.dateTime).toLocaleString()}</span>
                  </p>
                  <p className="flex items-center">
                    <FaUser className="mr-2 text-[#A8D5A2]" />
                    <span>Patient: {appt.patientName}</span>
                  </p>
                  <p className="flex items-center">
                    <FaRegFileAlt className="mr-2 text-[#A8D5A2]" />
                    <span>Description: {appt.description}</span>
                  </p>
                  {appt.meetingLink && (
                    <div className="flex items-center mt-4">
                      <a
                        href={appt.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-[#64A65F] text-[#F5F5F5] rounded-lg font-semibold hover:bg-[#4B8C47] transition-all shadow-md hover:shadow-lg hover:scale-105"
                      >
                        <FaVideo className="mr-2" />
                        Join Meeting
                      </a>
                    </div>
                  )}
                </div>
                {appt.status === 'pending' && (
                  <div className="mt-6 flex gap-4">
                    <button
                      onClick={() => handleAction(appt, 'accept')}
                      className="flex-1 py-2 px-4 bg-[#64A65F] text-[#F5F5F5] rounded-lg font-semibold hover:bg-[#4B8C47] transition-all shadow-md hover:shadow-lg hover:scale-105"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleAction(appt, 'reject')}
                      className="flex-1 py-2 px-4 bg-red-500 text-[#F5F5F5] rounded-lg font-semibold hover:bg-red-600 transition-all shadow-md hover:shadow-lg hover:scale-105"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
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
