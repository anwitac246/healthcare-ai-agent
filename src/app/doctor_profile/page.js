'use client'
import React, { useEffect, useState } from 'react'
import { db } from '@/app/firebase-config'
import { ref, onValue, update } from 'firebase/database'
import axios from 'axios'

export default function DoctorProfile() {
  const [appointments, setAppointments] = useState([])

  useEffect(() => {
    const appointmentsRef = ref(db, 'appointments')
    onValue(appointmentsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const allAppointments = Object.entries(data).map(([id, val]) => ({ id, ...val }))
        setAppointments(allAppointments)
      }
    })
  }, [])

  const handleAction = async (appt, action) => {
    const apptRef = ref(db, `appointments/${appt.id}`)
    if (action === 'reject') {
      await update(apptRef, { status: 'rejected' })
      return
    }

    try {
      const res = await axios.post('http://localhost:5000/generate-room', {
        identity: appt.doctorName,
        mode: appt.mode,
      })

      const { room, token } = res.data

      await update(apptRef, {
        status: 'accepted',
        room,
        token,
      })
    } catch (err) {
      console.error('Error creating Twilio room', err)
    }
  }

  return (
    <div className="max-w-4xl mx-auto mt-12 px-6">
      <h2 className="text-4xl font-bold text-center mb-10 text-[#006A71]">Doctor Dashboard</h2>

      {appointments.length === 0 ? (
        <p className="text-center text-gray-600">No appointments yet.</p>
      ) : (
        <div className="space-y-6">
          {appointments.map((appt) => (
            <div
              key={appt.id}
              className="border border-[#006A71]/40 rounded-lg p-6 shadow-md bg-white"
            >
              <h3 className="text-2xl font-semibold text-[#006A71] mb-2">{appt.patientName}</h3>
              <p className="text-gray-800"><strong>Description:</strong> {appt.description}</p>
              <p className="text-gray-800"><strong>Date/Time:</strong> {appt.dateTime}</p>
              <p className="text-gray-800"><strong>Mode:</strong> {appt.mode}</p>
              <p className="text-gray-800">
                <strong>Status:</strong>{' '}
                <span className="font-bold text-[#006A71] capitalize">{appt.status}</span>
              </p>

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

              {appt.status === 'accepted' && (
                <a
                  href={`/room?room=${appt.room}&token=${appt.token}&mode=${appt.mode}`}
                  className="inline-block mt-4 text-[#006A71] hover:text-[#004f54] font-medium underline"
                >
                  Join Consultation Room →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
