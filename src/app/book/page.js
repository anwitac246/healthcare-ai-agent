"use client";
import Navbar from '@/components/navbar'
import Head from 'next/head'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const doctors = [
  { id: 1, name: 'Dr. John Smith', specialization: 'Cardiologist' },
  { id: 2, name: 'Dr. Emily Johnson', specialization: 'Pediatrician' },
  { id: 3, name: 'Dr. Michael Brown', specialization: 'Neurologist' },
]

const BookAppointment = () => {
  const router = useRouter()
  const [selectedDoctorId, setSelectedDoctorId] = useState(null)
  const [cause, setCause] = useState('')
  const [dateTime, setDateTime] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedDoctorId) {
      alert('Please select a doctor.')
      return
    }
    console.log({ doctorId: selectedDoctorId, cause, dateTime })
    alert('Appointment booked successfully!')
    router.push('/')
  }

  return (
    <div className="bg-white min-h-screen">
      <Head className="my-20">
        <title>Book an Appointment</title>
        <meta name="description" content="Book an appointment with our doctors" />
      </Head>

      <Navbar />

      <main className="container mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-black text-center mb-12 animate-fade-in my-20">Schedule Your Visit</h2>
        <form
          onSubmit={handleSubmit}
          className="max-w-lg mx-auto bg-white p-8 rounded-xl shadow-xl transform transition-all duration-500"
        >
          <div className="mb-6">
            <label htmlFor="doctor" className="block text-black font-semibold mb-2">
              Select Doctor
            </label>
            <select
              id="doctor"
              value={selectedDoctorId || ''}
              onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
              className="w-full text-[#006A71] p-3 border border-[#006A71] rounded-md focus:outline-none focus:ring-2 focus:ring-[#006A71] transition-all duration-300"
              required
            >
              <option value="" disabled>Select a doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} - {doctor.specialization}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label htmlFor="cause" className="block text-[#006A71] font-semibold mb-2">
              Reason for Visit
            </label>
            <textarea
              id="cause"
              value={cause}
              onChange={(e) => setCause(e.target.value)}
              className="w-full p-3 border text-[#006A71] border-[#006A71] rounded-md focus:outline-none focus:ring-2 focus:ring-[#006A71] transition-all duration-300"
              rows={4}
              required
              placeholder="Describe your symptoms or concerns..."
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
              onChange={(e) => setDateTime(e.target.value)}
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

export default BookAppointment
