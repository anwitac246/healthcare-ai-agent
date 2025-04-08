'use client'
import React, { useState, useEffect } from 'react'
import Navbar from '@/components/navbar'
import Head from 'next/head'
import { useRouter } from 'next/navigation'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { ref, onValue, push, get } from 'firebase/database'
import { app, db } from '@/app/firebase-config'

export default function BookAppointment() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  const [userId, setUserId] = useState('')
  const [patientName, setPatientName] = useState('')
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [mode, setMode] = useState('video')
  const [cause, setCause] = useState('')
  const [dateTime, setDateTime] = useState('')

  const [doctors, setDoctors] = useState([])
  const [appointments, setAppointments] = useState([])

  // auth check and role validation
  useEffect(() => {
    const auth = getAuth(app)
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        alert('You must be logged in to book an appointment.')
        router.replace('/login')
        return
      }
      try {
        const roleSnap = await get(ref(db, `users/${user.uid}/role`))
        const role = roleSnap.val()
        if (role === 'doctor') {
          alert('Doctors cannot book appointments.')
          router.replace('/')
          return
        }
        setUserId(user.uid)
        setLoading(false)
      } catch (err) {
        console.error(err)
        alert('Error checking user role.')
        router.replace('/')
      }
    })
    return () => unsub()
  }, [router])

  // fetch all doctors
  useEffect(() => {
    const usersRef = ref(db, 'users')
    const unsub = onValue(usersRef, snapshot => {
      const data = snapshot.val() || {}
      const docs = Object.entries(data)
        .filter(([, u]) => u.role === 'doctor')
        .map(([id, u]) => ({
          id,
          name: u.name,
          specialization: u.specialization
        }))
      setDoctors(docs)
    })
    return () => unsub()
  }, [])

  // fetch appointments for current user
  useEffect(() => {
    if (!userId) return
    const apptRef = ref(db, 'appointments')
    const unsub = onValue(apptRef, snapshot => {
      const data = snapshot.val() || {}
      const myAppointments = Object.entries(data)
        .map(([id, a]) => ({ id, ...a }))
        .filter(appt => appt.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt)
      setAppointments(myAppointments)
    })
    return () => unsub()
  }, [userId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!patientName.trim()) {
      alert('Please enter your name.')
      return
    }
    if (!selectedDoctorId) {
      alert('Please select a doctor.')
      return
    }
    const doctor = doctors.find(d => d.id === selectedDoctorId)
    const newAppt = {
      patientName: patientName.trim(),
      doctorId: selectedDoctorId,
      doctorName: doctor.name,
      mode,
      description: cause.trim(),
      dateTime,
      status: 'pending',
      createdAt: Date.now(),
      userId // ✅ Save user ID
    }
    try {
      await push(ref(db, 'appointments'), newAppt)
      alert('Appointment booked successfully!')
      router.push('/')
    } catch (err) {
      console.error('Firebase write failed:', err)
      alert('Error booking appointment. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  const latestAppointment = appointments.length > 0 ? appointments[0] : null

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Head>
        <title>Book an Appointment</title>
        <meta name="description" content="Book an appointment with our doctors" />
      </Head>

      <Navbar />

      <div className="flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-1/3 bg-gray-100 p-6 border-r border-gray-300">
          <h3 className="text-xl font-bold mb-4 text-[#006A71] my-20">Your Appointments</h3>

          {latestAppointment ? (
            <div className="mb-6 p-4 bg-white rounded shadow">
              <h4 className="text-md text-black font-semibold">Latest Appointment</h4>
              <p className="text-[#006A71]"><strong>Doctor:</strong> {latestAppointment.doctorName}</p>
              <p className="text-[#006A71]"><strong>Date:</strong> {latestAppointment.dateTime}</p>
              <p className="text-[#006A71]"><strong>Mode:</strong> {latestAppointment.mode}</p>
              <p className="text-[#006A71]"><strong>Status:</strong> {latestAppointment.status}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-600 mb-4">No appointments yet.</p>
          )}

          {appointments.length > 1 && (
            <>
              <h4 className="font-semibold mt-4 text-[#006A71]">History</h4>
              <ul className="mt-2 space-y-2 text-sm">
                {appointments.slice(1).map(appt => (
                  <li key={appt.id} className="p-2 border rounded bg-white shadow">
                    <p><strong>Doctor:</strong> {appt.doctorName}</p>
                    <p><strong>Date:</strong> {appt.dateTime}</p>
                    <p><strong>Status:</strong> {appt.status}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>

        {/* Main form */}
        <main className="flex-1 container px-6 py-16">
          <h2 className="text-4xl font-bold text-black text-center mb-12 my-20">
            Schedule Your Visit
          </h2>

          <form onSubmit={handleSubmit} className="max-w-lg mx-auto bg-white p-8 rounded-xl shadow-xl">
            {/* Patient name */}
            <div className="mb-6">
              <label htmlFor="patientName" className="block text-black font-semibold mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="patientName"
                value={patientName}
                onChange={e => setPatientName(e.target.value)}
                className="w-full p-3 border text-[#006A71] border-[#006A71] rounded-md focus:outline-none focus:ring-2 focus:ring-[#006A71]"
                placeholder="Enter your full name"
                required
              />
            </div>

            {/* Doctor dropdown */}
            <div className="mb-6">
              <label htmlFor="doctor" className="block text-black font-semibold mb-2">
                Select Doctor
              </label>
              <select
                id="doctor"
                value={selectedDoctorId}
                onChange={e => setSelectedDoctorId(e.target.value)}
                className="w-full text-[#006A71] p-3 border border-[#006A71] rounded-md"
                required
              >
                <option value="" disabled>Select a doctor</option>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} – {doc.specialization}
                  </option>
                ))}
              </select>
            </div>

            {/* Appointment mode */}
            <div className="mb-6">
              <label htmlFor="mode" className="block text-black font-semibold mb-2">
                Appointment Mode
              </label>
              <select
                id="mode"
                value={mode}
                onChange={e => setMode(e.target.value)}
                className="w-full text-[#006A71] p-3 border border-[#006A71] rounded-md"
              >
                <option value="video">Video Consultation</option>
                <option value="in-person">In‑Person Visit</option>
              </select>
            </div>

            {/* Reason */}
            <div className="mb-6">
              <label htmlFor="cause" className="block text-[#006A71] font-semibold mb-2">
                Reason for Visit
              </label>
              <textarea
                id="cause"
                value={cause}
                onChange={e => setCause(e.target.value)}
                className="w-full p-3 border text-[#006A71] border-[#006A71] rounded-md"
                rows={4}
                placeholder="Describe your symptoms or concerns..."
                required
              />
            </div>

            {/* DateTime */}
            <div className="mb-8">
              <label htmlFor="datetime" className="block text-black font-semibold mb-2">
                Preferred Date & Time
              </label>
              <input
                type="datetime-local"
                id="datetime"
                value={dateTime}
                onChange={e => setDateTime(e.target.value)}
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

      <footer className="bg-black text-white py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm">© {new Date().getFullYear()} AetherCare. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
