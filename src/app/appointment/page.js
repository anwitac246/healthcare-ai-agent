
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

  const [patientName, setPatientName] = useState('')
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [mode, setMode] = useState('video')
  const [cause, setCause] = useState('')
  const [dateTime, setDateTime] = useState('')


  const [doctors, setDoctors] = useState([])


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
        setLoading(false)
      } catch (err) {
        console.error(err)
        alert('Error checking user role.')
        router.replace('/')
      }
    })
    return () => unsub()
  }, [router])


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
      createdAt: Date.now()
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

  return (
    <div className="bg-white min-h-screen">
      <Head>
        <title>Book an Appointment</title>
        <meta name="description" content="Book an appointment with our doctors" />
      </Head>

      <Navbar />

      <main className="container mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-black text-center mb-12 animate-fade-in my-20">
          Schedule Your Visit
        </h2>
        <form
          onSubmit={handleSubmit}
          className="max-w-lg mx-auto bg-white p-8 rounded-xl shadow-xl transform transition-all duration-500"
        >
          <div className="mb-6">
            <label htmlFor="patientName" className="block text-black font-semibold mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="patientName"
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              className="w-full p-3 border text-[#006A71] border-[#006A71] rounded-md focus:outline-none focus:ring-2 focus:ring-[#006A71] transition-all duration-300"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="doctor" className="block text-black font-semibold mb-2">
              Select Doctor
            </label>
            <select
              id="doctor"
              value={selectedDoctorId}
              onChange={e => setSelectedDoctorId(e.target.value)}
              className="w-full text-[#006A71] p-3 border border-[#006A71] rounded-md focus:outline-none focus:ring-2 focus:ring-[#006A71] transition-all duration-300"
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

          <div className="mb-6">
            <label htmlFor="mode" className="block text-black font-semibold mb-2">
              Appointment Mode
            </label>
            <select
              id="mode"
              value={mode}
              onChange={e => setMode(e.target.value)}
              className="w-full text-[#006A71] p-3 border border-[#006A71] rounded-md focus:outline-none focus:ring-2 focus:ring-[#006A71] transition-all duration-300"
            >
              <option value="video">Video Consultation</option>
              <option value="in-person">In‑Person Visit</option>
            </select>
          </div>

          <div className="mb-6">
            <label htmlFor="cause" className="block text-[#006A71] font-semibold mb-2">
              Reason for Visit
            </label>
            <textarea
              id="cause"
              value={cause}
              onChange={e => setCause(e.target.value)}
              className="w-full p-3 border text-[#006A71] border-[#006A71] rounded-md focus:outline-none focus:ring-2 focus:ring-[#006A71] transition-all duration-300"
              rows={4}
              placeholder="Describe your symptoms or concerns..."
              required
            />
          </div>

          <div className="mb-8">
            <label htmlFor="datetime" className="block text-black font-semibold mb-2">
              Preferred Date & Time
            </label>
            <input
              type="datetime-local"
              id="datetime"
              value={dateTime}
              onChange={e => setDateTime(e.target.value)}
              className="w-full p-3 border text-[#006A71] border-[#006A71] rounded-md focus:outline-none focus:ring-2 focus:ring-[#006A71] transition-all duration-300"
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

      <footer className="bg-black text-white py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm">© {new Date().getFullYear()} AetherCare. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
