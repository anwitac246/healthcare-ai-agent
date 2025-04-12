
'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/navbar';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, push, get, update } from 'firebase/database';
import { app, db } from '@/app/firebase-config';
import Link from 'next/link';

export default function BookAppointment() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [mode, setMode] = useState('video');
  const [cause, setCause] = useState('');
  const [dateTime, setDateTime] = useState('');

  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);


  useEffect(() => {
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        alert('You must be logged in to book an appointment.');
        router.replace('/login');
        return;
      }
      const roleSnap = await get(ref(db, `users/${user.uid}/role`));
      if (roleSnap.val() === 'doctor') {
        alert('Doctors cannot book appointments.');
        router.replace('/');
        return;
      }
      setUserId(user.uid);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsub = onValue(usersRef, (snap) => {
      const data = snap.val() || {};
      const docs = Object.entries(data)
        .filter(([, u]) => u.role === 'doctor')
        .map(([id, u]) => ({ id, name: u.name, specialization: u.specialization }));
      setDoctors(docs);
    });
    return () => unsub();
  }, []);


  useEffect(() => {
    if (!userId) return;
    const apptRef = ref(db, 'appointments');
    const unsub = onValue(apptRef, (snap) => {
      const data = snap.val() || {};
      const all = Object.entries(data).map(([id, a]) => ({ id, ...a }));
      const now = Date.now();

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

      const mine = all
        .filter((a) => a.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
      setAppointments(mine);
    });
    return () => unsub();
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientName.trim() || !selectedDoctorId || !dateTime) {
      alert('Please fill all fields.');
      return;
    }

    const allSnap = await get(ref(db, 'appointments'));
    const allData = allSnap.val() || {};
    const existingAccepted = Object.entries(allData)
      .map(([id, a]) => ({ id, ...a }))
      .filter((a) => a.doctorId === selectedDoctorId && a.status === 'accepted');

    const requestedTime = new Date(dateTime).getTime();
    const THIRTY_MIN = 30 * 60 * 1000;
    for (let appt of existingAccepted) {
      const existingTime = new Date(appt.dateTime).getTime();
      if (
        requestedTime >= existingTime &&
        requestedTime < existingTime + THIRTY_MIN
      ) {
        alert(
          'Sorry, that doctor already has an appointment at that time. Please choose another slot.'
        );
        return;
      }
    }

    const doctor = doctors.find((d) => d.id === selectedDoctorId);
    const newAppt = {
      patientName: patientName.trim(),
      doctorId: selectedDoctorId,
      doctorName: doctor.name,
      mode,
      description: cause.trim(),
      dateTime,
      status: 'pending',
      createdAt: Date.now(),
      userId,
    };

    try {
      await push(ref(db, 'appointments'), newAppt);
      alert('Appointment booked successfully!');
      setPatientName('');
      setSelectedDoctorId('');
      setMode('video');
      setCause('');
      setDateTime('');
    } catch (err) {
      console.error('Firebase write failed:', err);
      alert('Error booking appointment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <p className="text-black">Loading…</p>
      </div>
    );
  }

  const latest = appointments[0] || null;

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Head>
        <title>Book an Appointment</title>
      </Head>
      <Navbar />

      <div className="flex flex-col md:flex-row flex-1 gap-6 px-6 py-8 mt-20">
       
        <aside className="w-full md:w-1/3">
          <h3 className="text-2xl font-bold mb-4 text-[#006A71]">
            Your Appointments
          </h3>

          {latest ? (
            <div className="bg-white p-4 rounded-lg shadow border border-[#006A71]">
              <p className="text-black">
                <strong>Doctor:</strong> {latest.doctorName}
              </p>
              <p className="text-black">
                <strong>Date:</strong>{' '}
                {new Date(latest.dateTime).toLocaleString()}
              </p>
              <p className="text-black">
                <strong>Status:</strong>{' '}
                <span
                  className={`capitalize font-semibold ${
                    {
                      pending: 'text-[#006A71]',
                      accepted: 'text-black',
                      rejected: 'text-red-600',
                      completed: 'text-gray-500',
                    }[latest.status]
                  }`}
                >
                  {latest.status}
                </span>
              </p>
              {latest.status === 'accepted' && latest.meetingLink && (
                <p className="mt-2">
                  <Link
                    href={latest.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-[#006A71] text-white rounded hover:bg-black transition"
                  >
                    Join Video Call
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <p className="text-black">No appointments yet.</p>
          )}

          {appointments.length > 1 && (
            <ul className="mt-4 space-y-3">
              {appointments.slice(1).map((a) => (
                <li
                  key={a.id}
                  className="bg-white p-3 rounded-lg shadow border border-[#006A71]"
                >
                  <p className="text-black">
                    <strong>Doctor:</strong> {a.doctorName}
                  </p>
                  <p className="text-black">
                    <strong>Date:</strong>{' '}
                    {new Date(a.dateTime).toLocaleString()}
                  </p>
                  <p className="text-black">
                    <strong>Status:</strong>{' '}
                    <span
                      className={`capitalize font-semibold ${
                        {
                          pending: 'text-[#006A71]',
                          accepted: 'text-black',
                          rejected: 'text-red-600',
                          completed: 'text-gray-500',
                        }[a.status]
                      }`}
                    >
                      {a.status}
                    </span>
                  </p>
                  {a.status === 'accepted' && a.meetingLink && (
                    <p className="mt-1">
                      <Link
                        href={a.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-3 py-1 bg-[#006A71] text-white rounded hover:bg-black transition"
                      >
                        Join Video Call
                      </Link>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className="flex-1">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-3xl font-bold mb-6 text-black text-center">
              Schedule Your Visit
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
             
              <div>
                <label
                  htmlFor="patientName"
                  className="block text-black font-semibold mb-1"
                >
                  Your Name
                </label>
                <input
                  id="patientName"
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full p-2 border border-black rounded text-[#006A71]"
                  placeholder="Enter your full name"
                  required
                />
              </div>

          
              <div>
                <label
                  htmlFor="doctor"
                  className="block text-black font-semibold mb-1"
                >
                  Select Doctor
                </label>
                <select
                  id="doctor"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full p-2 border border-black rounded text-[#006A71]"
                  required
                >
                  <option value="" disabled>
                    Select a doctor
                  </option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} – {doc.specialization}
                    </option>
                  ))}
                </select>
              </div>

            
              <div>
                <label
                  htmlFor="mode"
                  className="block text-black font-semibold mb-1"
                >
                  Appointment Mode
                </label>
                <select
                  id="mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full p-2 border border-black rounded text-[#006A71]"
                >
                  <option value="video">Video Consultation</option>
                  <option value="in-person">In‑Person Visit</option>
                </select>
              </div>

      
              <div>
                <label
                  htmlFor="cause"
                  className="block text-black font-semibold mb-1"
                >
                  Reason for Visit
                </label>
                <textarea
                  id="cause"
                  value={cause}
                  onChange={(e) => setCause(e.target.value)}
                  className="w-full p-2 border border-black rounded text-[#006A71]"
                  rows={3}
                  placeholder="Describe your symptoms..."
                />
              </div>

     
              <div>
                <label
                  htmlFor="datetime"
                  className="block text-black font-semibold mb-1"
                >
                  Preferred Date & Time
                </label>
                <input
                  id="datetime"
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full p-2 border border-black rounded text-[#006A71]"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#006A71] text-white rounded hover:bg-black transition"
              >
                Confirm Appointment
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
