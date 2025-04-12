// doctor_profile.js
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

  // Auth listener
  useEffect(() => {
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Load & auto-expire
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
      const docs = all
        .filter((a) => a.doctorId === userId)
        .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
      setAppointments(docs);
    });
    return () => unsub();
  }, [userId]);

  // Accept / Reject
  const handleAction = async (appt, action) => {
    const apptRef = ref(db, `appointments/${appt.id}`);
    const updates = { status: action === 'accept' ? 'accepted' : 'rejected' };

    if (action === 'accept') {
      const roomId = uuidv4();
      updates.roomId      = roomId;
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
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading…</p>
      </div>
    );
  }
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Login required.</p>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-3xl font-bold text-[#006A71] mb-6">
          Doctor Dashboard
        </h2>

        {appointments.length === 0 ? (
          <p>No appointments yet.</p>
        ) : (
          <div className="space-y-4">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="border rounded-lg p-4 shadow-sm hover:shadow-md transition"
              >
                <h3 className="text-xl font-semibold">{appt.patientName}</h3>
                <p>
                  <strong>Date:</strong>{' '}
                  {new Date(appt.dateTime).toLocaleString()}
                </p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span className={`capitalize ${
                    {
                      pending: 'text-yellow-600',
                      accepted: 'text-green-600',
                      rejected: 'text-red-600',
                      completed: 'text-gray-500',
                    }[appt.status]
                  }`}>
                    {appt.status}
                  </span>
                </p>
                {appt.meetingLink && (
                  <p className="mt-2">
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
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleAction(appt, 'accept')}
                      className="px-4 py-2 bg-green-600 text-white rounded"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleAction(appt, 'reject')}
                      className="px-4 py-2 bg-red-600 text-white rounded"
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
