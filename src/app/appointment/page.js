

'use client';
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/navbar';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, push, get } from 'firebase/database';
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
      setPatientName(''); 
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsub = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const docs = Object.entries(data)
        .filter(([, u]) => u.role === 'doctor')
        .map(([id, u]) => ({
          id,
          name: u.name,
          specialization: u.specialization,
        }));
      setDoctors(docs);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const apptRef = ref(db, 'appointments');
    const unsub = onValue(apptRef, (snapshot) => {
      const data = snapshot.val() || {};
      const myAppointments = Object.entries(data)
        .map(([id, a]) => ({ id, ...a }))
        .filter((appt) => appt.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
      setAppointments(myAppointments);
    });
    return () => unsub();
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!patientName.trim()) {
      alert('Please enter your name.');
      return;
    }
    if (!selectedDoctorId || !dateTime) {
      alert('Please select a doctor and date/time.');
      return;
    }

    const allSnap = await get(ref(db, 'appointments'));
    const allData = allSnap.val() || {};
    const existingAccepted = Object.entries(allData)
      .map(([id, a]) => ({ id, ...a }))
      .filter(
        (a) =>
          a.doctorId === selectedDoctorId && a.status === 'accepted'
      );

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
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const latestAppointment = appointments[0] || null;

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Head>
        <title>Book an Appointment</title>
        <meta name="description" content="Book an appointment with our doctors" />
      </Head>

      <Navbar />

      <div className="flex flex-col md:flex-row">
        <aside className="w-full md:w-1/3 bg-gray-100 p-6 border-r border-gray-300">
          <h3 className="text-xl font-bold mb-4 text-[#006A71] my-20">
            Your Appointments
          </h3>

          {latestAppointment ? (
            <div className="mb-6 p-4 bg-white rounded shadow">
              <h4 className="text-md font-semibold">Latest Appointment</h4>
              <p className="text-[#006A71]">
                <strong>Doctor:</strong> {latestAppointment.doctorName}
              </p>
              <p className="text-[#006A71]">
                <strong>Date:</strong>{' '}
                {new Date(latestAppointment.dateTime).toLocaleString()}
              </p>
              <p className="text-[#006A71]">
                <strong>Mode:</strong> {latestAppointment.mode}
              </p>
              <p className="text-[#006A71]">
                <strong>Status:</strong>{' '}
                <span
                  className={`capitalize ${
                    latestAppointment.status === 'accepted'
                      ? 'text-green-600'
                      : latestAppointment.status === 'rejected'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                  }`}
                >
                  {latestAppointment.status}
                </span>
              </p>
              {latestAppointment.status === 'accepted' &&
                latestAppointment.meetingLink && (
                  <p className="text-[#006A71] mt-2">
                    <strong>Meeting Link:</strong>{' '}
                    <Link
                      href={latestAppointment.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Join Video Call
                    </Link>
                  </p>
                )}
            </div>
          ) : (
            <p className="text-sm text-gray-600 mb-4">No appointments yet.</p>
          )}

          {appointments.length > 1 && (
            <>
              <h4 className="font-semibold mt-4 text-[#006A71]">History</h4>
              <ul className="mt-2 space-y-2 text-sm">
                {appointments.slice(1).map((appt) => (
                  <li
                    key={appt.id}
                    className="p-2 border rounded bg-white shadow"
                  >
                    <p>
                      <strong>Doctor:</strong> {appt.doctorName}
                    </p>
                    <p>
                      <strong>Date:</strong>{' '}
                      {new Date(appt.dateTime).toLocaleString()}
                    </p>
                    <p>
                      <strong>Status:</strong>{' '}
                      <span
                        className={`capitalize ${
                          appt.status === 'accepted'
                            ? 'text-green-600'
                            : appt.status === 'rejected'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }`}
                      >
                        {appt.status}
                      </span>
                    </p>
                    {appt.status === 'accepted' && appt.meetingLink && (
                      <p>
                        <strong>Meeting Link:</strong>{' '}
                        <Link
                          href={appt.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Join Video Call
                        </Link>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>

        <main className="flex-1 container px-6 py-16">
          <h2 className="text-4xl font-bold text-black text-center mb-12 my-20">
            Schedule Your Visit
          </h2>

          <form
            onSubmit={handleSubmit}
            className="max-w-lg mx-auto bg-white p-8 rounded-xl shadow-xl"
          >
            <div className="mb-6">
              <label
                htmlFor="patientName"
                className="block text-black font-semibold mb-2"
              >
                Your Name
              </label>
              <input
                type="text"
                id="patientName"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full p-3 border text-[#006A71] border-[#006A71] rounded-md focus:outline-none focus:ring-2 focus:ring-[#006A71]"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="doctor"
                className="block text-black font-semibold mb-2"
              >
                Select Doctor
              </label>
              <select
                id="doctor"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full text-[#006A71] p-3 border border-[#006A71] rounded-md"
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

            <div className="mb-6">
              <label
                htmlFor="mode"
                className="block text-black font-semibold mb-2"
              >
                Appointment Mode
              </label>
              <select
                id="mode"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full text-[#006A71] p-3 border border-[#006A71] rounded-md"
              >
                <option value="video">Video Consultation</option>
                <option value="in-person">In‑Person Visit</option>
              </select>
            </div>

            <div className="mb-6">
              <label
                htmlFor="cause"
                className="block text-[#006A71] font-semibold mb-2"
              >
                Reason for Visit
              </label>
              <textarea
                id="cause"
                value={cause}
                onChange={(e) => setCause(e.target.value)}
                className="w-full p-3 border text-[#006A71] border-[#006A71] rounded-md"
                rows={4}
                placeholder="Describe your symptoms or concerns..."
              />
            </div>

            <div className="mb-8">
              <label
                htmlFor="datetime"
                className="block text-black font-semibold mb-2"
              >
                Preferred Date & Time
              </label>
              <input
                type="datetime-local"
                id="datetime"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full p-3 border text-[#006A71] border-[#006A71] rounded-md"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#006A71] text-white py-3 rounded-full font-semibold hover:bg-black transition-all duration-300 shadow-md"
            >
              Confirm Appointment
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
