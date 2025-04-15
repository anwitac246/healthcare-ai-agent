
'use client';

import React, { useEffect, useState, useRef } from 'react';
import Navbar from '@/components/navbar';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db, app } from '@/app/firebase-config';
import { ref, onValue, update } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FaUser, FaCalendarAlt, FaVideo, FaCheckCircle, FaTimesCircle, FaClock, FaSearch, FaTimes } from 'react-icons/fa';
import Link from 'next/link';
import Head from 'next/head';

gsap.registerPlugin(ScrollTrigger);

export default function DoctorProfile() {
  const [appointments, setAppointments] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

      // Filter & sort
      const docs = all.filter((a) => a.doctorId === userId);
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

  // Filter and sort appointments
  const filteredAppointments = appointments
    .filter((appt) =>
      appt.patientName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Prioritize pending appointments
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      // For non-pending, sort by dateTime descending
      return new Date(b.dateTime) - new Date(a.dateTime);
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#64A65F]"></div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-500 text-xl font-semibold font-inter">
          Login required.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-inter relative overflow-hidden">
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
      <Head>
        <title>Doctor Dashboard</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Navbar />
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 z-10 pt-24">
        <header
          ref={headerRef}
          className="max-w-7xl mx-auto mb-12 animate-fade-in bg-white text-gray-800 rounded-lg p-8 relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-10">
            <svg
              className="w-full h-full"
              viewBox="0 0 1440 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#f3f4f6"
                d="M0,160L80,186.7C160,213,320,267,480,266.7C640,267,800,213,960,186.7C1120,160,1280,160,1360,160L1440,160L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
              />
            </svg>
          </div>
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Doctor Dashboard
            </h2>
            <p className="mt-4 text-lg md:text-xl leading-relaxed">
              Manage your appointments and connect with patients seamlessly.
            </p>
          </div>
        </header>

        <div className="max-w-7xl mx-auto mb-8">
          <div className="relative">
          <FaSearch className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-3 pl-10 border border-gray-200 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#64A65F] focus:outline-none transition"
              aria-label="Search patients"
            />
            
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="text-center max-w-7xl mx-auto">
            <p className="text-gray-600 text-lg font-semibold">
              No appointments found.
            </p>
          </div>
        ) : (
          <div ref={apptsRef} className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredAppointments.map((appt) => {
                const isLinkValid =
                  appt.status === 'accepted' &&
                  appt.meetingLink &&
                  appt.generatedAt &&
                  Date.now() < appt.generatedAt + 30 * 60 * 1000;

                return (
                  <div
                    key={appt.id}
                    className="appt-card bg-white/90 backdrop-blur-lg rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-transform hover:scale-[1.02]"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-800 truncate">
                        {appt.patientName}
                      </h3>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold capitalize ${{
                          pending: 'bg-[#64A65F]/20 text-[#64A65F]',
                          accepted: 'bg-blue-100 text-blue-600',
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
                    <div className="space-y-3 text-gray-600">
                      <p className="flex items-center">
                        <FaCalendarAlt className="mr-2 text-[#64A65F]" />
                        <span>{new Date(appt.dateTime).toLocaleString()}</span>
                      </p>
                      <p className="flex items-center">
                        <FaUser className="mr-2 text-[#64A65F]" />
                        <span>Patient: {appt.patientName}</span>
                      </p>
                      <p className="flex items-center">
                        <FaUser className="mr-2 text-[#64A65F]" />
                        <span>Description: {appt.description}</span>
                      </p>
                      {appt.status === 'accepted' && (
                        <div className="flex items-center mt-4">
                          {isLinkValid ? (
                            <Link
                              href={appt.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 bg-[#64A65F] text-white rounded-lg font-semibold hover:bg-[#4B8C47] transition-transform hover:scale-105 shadow-md"
                              aria-label="Join Meeting"
                            >
                              <FaVideo className="mr-2" />
                              Join Meeting
                            </Link>
                          ) : (
                            <span className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-600 rounded-lg">
                              <FaTimesCircle className="mr-2" />
                              Link Expired
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {appt.status === 'pending' && (
                      <div className="mt-6 flex gap-4">
                        <button
                          onClick={() => handleAction(appt, 'accept')}
                          className="flex-1 py-2 px-4 bg-[#64A65F] text-white rounded-lg font-semibold hover:bg-[#4B8C47] transition-transform hover:scale-105 shadow-md"
                          aria-label="Accept Appointment"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleAction(appt, 'reject')}
                          className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-transform hover:scale-105 shadow-md"
                          aria-label="Reject Appointment"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <footer className="bg-[#64A65F] text-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-base">
            © {new Date().getFullYear()} AetherCare. All rights reserved.
          </p>
          <div className="mt-4 space-x-4">
            <Link href="/about" className="text-white hover:text-gray-200 transition">
              About
            </Link>
            <Link href="/contact" className="text-white hover:text-gray-200 transition">
              Contact
            </Link>
            <Link href="/privacy" className="text-white hover:text-gray-200 transition">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
