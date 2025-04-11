

'use client';
import React, { useEffect, useState } from 'react';
import Navbar from '@/components/navbar';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db, app } from '@/app/firebase-config';
import { ref, onValue, update } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';

export default function DoctorProfile() {
  const [appointments, setAppointments] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const appointmentsRef = ref(db, 'appointments');
    const unsub = onValue(appointmentsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const all = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      const doctorAppointments = all
        .filter((appt) => appt.doctorId === userId)
        .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
      setAppointments(doctorAppointments);
    });
    return () => unsub();
  }, [userId]);

  const handleAction = async (appt, action) => {
    const apptRef = ref(db, `appointments/${appt.id}`);
    let updates = { status: action === 'accept' ? 'accepted' : 'rejected' };

    if (action === 'accept') {
     
      const roomId = uuidv4();
      
      const meetingLink = `${window.location.origin}/room/${roomId}`;
    
      updates.meetingLink = meetingLink;
    }

    try {
      await update(apptRef, updates);
      if (action === 'accept') {
        console.log('Meeting link:', meetingLink);
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('Failed to update appointment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">You must be logged in to view this page.</p>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-10 text-[#006A71] mt-8">
          Doctor Dashboard
        </h2>

        {appointments.length === 0 ? (
          <p className="text-center text-gray-600">No appointments yet.</p>
        ) : (
          <div className="space-y-6">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="border border-[#006A71]/40 rounded-lg p-6 shadow-md bg-white"
              >
                <h3 className="text-2xl font-semibold text-[#006A71] mb-2">
                  {appt.patientName}
                </h3>
                <p className="text-gray-800">
                  <strong>Description:</strong> {appt.description}
                </p>
                <p className="text-gray-800">
                  <strong>Date/Time:</strong>{' '}
                  {new Date(appt.dateTime).toLocaleString()}
                </p>
                <p className="text-gray-800">
                  <strong>Mode:</strong> {appt.mode}
                </p>
                <p className="text-gray-800">
                  <strong>Status:</strong>{' '}
                  <span className="font-bold text-[#006A71] capitalize">
                    {appt.status}
                  </span>
                </p>
                {appt.meetingLink && (
                  <p className="text-gray-800">
                    <strong>Meeting Link:</strong>{' '}
                    <a
                      href={appt.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Join Meeting
                    </a>
                  </p>
                )}

                {appt.status === 'pending' && (
                  <div className="flex gap-4 mt-4">
                    <button
                      onClick={() => handleAction(appt, 'accept')}
                      className="bg-[#006A71] hover:bg-[#004f54] text-white px-5 py-2 rounded shadow"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleAction(appt, 'reject')}
                      className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded shadow"
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
    </div>
  );
}
