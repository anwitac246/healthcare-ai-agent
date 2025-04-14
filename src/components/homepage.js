
'use client'
import React, { useEffect, useState } from 'react'
import { Typewriter } from 'react-simple-typewriter'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { ref, onValue } from 'firebase/database'
import { db, app } from '@/app/firebase-config'
import Link from 'next/link'

export default function Homepage() {
  const [scrollY, setScrollY] = useState(0)
  const [role, setRole] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const auth = getAuth(app)
    const unsub = onAuthStateChanged(auth, user => {
      if (user) {
        const userRef = ref(db, `users/${user.uid}`)
        onValue(userRef, snapshot => {
          const data = snapshot.val()
          if (data && data.role) {
            setRole(data.role)
          }
        })
      } else {
        setRole(null)
      }
    })
    return () => unsub()
  }, [])

  const handleConsultationClick = () => {
    if (role === 'doctor') {
      router.push('/doctor_profile')
    } else {
      router.push('/appointment')
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-start justify-center text-left px-6 md:px-12 relative overflow-hidden"
      style={{
        backgroundImage: "url('/home.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        transition: 'background 0.5s ease-in-out',
      }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-transparent via-[#5BAF54] to-transparent opacity-40"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
      />

      <motion.h1
        className="text-4xl md:text-6xl font-extrabold text-[#5BAF54] relative z-10"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1 }}
      >
        Welcome to{' '}
        <span className="text-[#5BAF54] font-mono">
          <Typewriter words={['AetherCare']} loop={false} cursor cursorStyle="|" delaySpeed={3000} />
        </span><br />
        Your trusted AI-powered <br />health companion.
      </motion.h1>

      <motion.p
        className="text-lg md:text-xl text-[#5BAF54] mt-6 max-w-2xl relative z-10"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        We're here to guide you through your symptoms and provide insightful diagnosis and advice, all at your fingertips.
      </motion.p>

      <motion.div
        className="mt-8 flex flex-col md:flex-row gap-6 relative z-10"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 1 }}
      >
        
        <div className="flex flex-wrap gap-4">
          <Link href="/diagnosis">
            <button className="px-8 py-4 text-lg cursor-pointer font-mono rounded-full text-white bg-gradient-to-r from-[#5BAF54] to-[#488F43] shadow-lg hover:from-[#5BAF54] hover:to-[#6EC465] transition transform hover:scale-105">
              Get Diagnosis
            </button>
          </Link>
          <Link href="/location_docs">
            <button className="px-8 py-4 text-lg cursor-pointer font-mono rounded-full text-white bg-gradient-to-r from-[#488F43] to-[#6EC465] shadow-lg hover:from-[#488F43] hover:to-[#5BAF54] transition transform hover:scale-105">
              Search Doctors
            </button>
          </Link>
          <button
            onClick={handleConsultationClick}
            className="px-8 py-4 text-lg cursor-pointer font-mono rounded-full text-white bg-gradient-to-r from-[#488F43] to-[#6EC465] shadow-lg hover:from-[#488F43] hover:to-[#5BAF54] transition transform hover:scale-105"
          >
            Consultation
          </button>
          
          <button className="px-8 py-4 text-lg cursor-pointer font-mono rounded-full text-white bg-gradient-to-r from-[#6EC465] to-[#5BAF54] shadow-lg hover:from-[#6EC465] hover:to-[#488F43] transition transform hover:scale-105">
            <Link href="/ambulance">
              SOS Ambulance
            </Link>
          </button>
        </div>
       
      </motion.div> 

      <motion.div
        className="absolute bottom-10 w-16 h-16 bg-[#5BAF54] rounded-full opacity-50"
        animate={{ y: [0, 15, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
      />
    </div>
  )
}
