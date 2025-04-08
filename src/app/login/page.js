// app/components/Login.js
'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth'
import { ref, set, update, get } from 'firebase/database'
import { app, db } from '@/app/firebase-config'
import SHA256 from 'crypto-js/sha256'
import Navbar from '@/components/navbar'

export default function Login() {
  const router = useRouter()
  const auth = getAuth(app)
  const googleProvider = new GoogleAuthProvider()

  const [isSignUp, setIsSignUp] = useState(false)
  const [needExtraInfo, setNeedExtraInfo] = useState(false)
  const [userRecord, setUserRecord] = useState(null)

  // form fields
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [role, setRole] = useState('patient')
  const [specialization, setSpecialization] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // SIGN-UP handler
  const handleSignUp = async e => {
    e.preventDefault()
    setError('')
    if (!name.trim() || !dob) {
      setError('Name and date of birth are required.')
      return
    }
    if (role === 'doctor' && !specialization.trim()) {
      setError('Please specify your specialization.')
      return
    }
    try {
      const uc = await createUserWithEmailAndPassword(auth, email, password)
      const uid = uc.user.uid
      const hashed = SHA256(password).toString()
      await set(ref(db, `users/${uid}`), {
        name: name.trim(),
        dob,
        role,
        specialization: role === 'doctor' ? specialization.trim() : null,
        email: uc.user.email,
        password: hashed,
        createdAt: new Date().toISOString()
      })
      router.push('/diagnosis')
    } catch (err) {
      setError(err.message)
    }
  }

  // LOGIN handler
  const handleLogin = async e => {
    e.preventDefault()
    setError('')
    try {
      const uc = await signInWithEmailAndPassword(auth, email, password)
      const uid = uc.user.uid
      const snap = await get(ref(db, `users/${uid}`))
      if (snap.exists()) {
        const rec = snap.val()
        // check completeness
        const ok =
          rec.dob &&
          rec.role &&
          (rec.role === 'patient' || (rec.role === 'doctor' && rec.specialization))
        if (ok) {
          router.push('/diagnosis')
        } else {
          // incomplete → show extra‑info form
          setUserRecord(rec)
          setName(rec.name || '')
          setDob(rec.dob || '')
          setRole(rec.role || 'patient')
          setSpecialization(rec.specialization || '')
          setNeedExtraInfo(true)
        }
      } else {
        // no record at all → first‑time, show extra‑info
        setUserRecord(null)
        setName(uc.user.displayName || '')
        setDob('')
        setRole('patient')
        setSpecialization('')
        setNeedExtraInfo(true)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  // GOOGLE handler (same post‑auth logic)
  const handleGoogle = async () => {
    setError('')
    try {
      const uc = await signInWithPopup(auth, googleProvider)
      const uid = uc.user.uid
      const snap = await get(ref(db, `users/${uid}`))
      if (snap.exists()) {
        const rec = snap.val()
        const ok =
          rec.dob &&
          rec.role &&
          (rec.role === 'patient' || (rec.role === 'doctor' && rec.specialization))
        if (ok) {
          router.push('/diagnosis')
          return
        }
        setUserRecord(rec)
        setName(rec.name || uc.user.displayName || '')
        setDob(rec.dob || '')
        setRole(rec.role || 'patient')
        setSpecialization(rec.specialization || '')
      } else {
        setUserRecord(null)
        setName(uc.user.displayName || '')
        setDob('')
        setRole('patient')
        setSpecialization('')
      }
      setEmail(uc.user.email)
      setNeedExtraInfo(true)
    } catch (err) {
      setError(err.message)
    }
  }

  // Extra‑info form submit
  const handleExtraInfo = async e => {
    e.preventDefault()
    setError('')
    if (!dob) {
      setError('Please enter your date of birth.')
      return
    }
    if (role === 'doctor' && !specialization.trim()) {
      setError('Please specify your specialization.')
      return
    }
    const user = auth.currentUser
    if (!user) {
      setError('No authenticated user.')
      return
    }
    try {
      const updates = {
        dob,
        role,
        specialization: role === 'doctor' ? specialization.trim() : null
      }
      if (!userRecord) {
        updates.name = name.trim()
        updates.email = email
        updates.createdAt = new Date().toISOString()
      }
      await update(ref(db, `users/${user.uid}`), updates)
      router.push('/diagnosis')
    } catch (err) {
      setError(err.message)
    }
  }

  // If we need extra info, render that form:
  if (needExtraInfo) {
    return (
      <div className="min-h-screen bg-[#F2EFE7] flex flex-col">
        <Navbar />
        <div className="flex items-center justify-center flex-1">
          <div className="bg-white shadow-2xl rounded-lg p-8 max-w-md w-full">
            <h2 className="text-3xl font-bold mb-6 text-center text-[#006A71]">
              Complete Your Profile
            </h2>
            {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
            <form onSubmit={handleExtraInfo} className="space-y-4">
              <div>
                <label htmlFor="dob" className="block font-semibold text-[#006A71]">
                  Date of Birth
                </label>
                <input
                  type="date"
                  id="dob"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  className="mt-1 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#006A71]"
                  style={{ borderColor: '#9ACBD0' }}
                  required
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-[#006A71]">I am a</label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="role"
                      value="patient"
                      checked={role === 'patient'}
                      onChange={e => setRole(e.target.value)}
                      className="form-radio text-[#006A71]"
                    />
                    <span className="ml-2 text-[#006A71]">Patient</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="role"
                      value="doctor"
                      checked={role === 'doctor'}
                      onChange={e => setRole(e.target.value)}
                      className="form-radio text-[#006A71]"
                    />
                    <span className="ml-2 text-[#006A71]">Doctor</span>
                  </label>
                </div>
              </div>
              {role === 'doctor' && (
                <div>
                  <label htmlFor="specialization" className="block font-semibold text-[#006A71]">
                    Specialization
                  </label>
                  <input
                    type="text"
                    id="specialization"
                    value={specialization}
                    onChange={e => setSpecialization(e.target.value)}
                    className="mt-1 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#006A71]"
                    style={{ borderColor: '#9ACBD0' }}
                    required
                  />
                </div>
              )}
              <button
                type="submit"
                className="w-full py-2 px-4 rounded-md transition cursor-pointer"
                style={{ backgroundColor: '#006A71', color: '#F2EFE7' }}
                onMouseOver={e => (e.currentTarget.style.backgroundColor = '#48A6A7')}
                onMouseOut={e => (e.currentTarget.style.backgroundColor = '#006A71')}
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Otherwise render login / signup form
  return (
    <div className="min-h-screen bg-[#F2EFE7] flex flex-col">
      <Navbar />
      <div className="flex items-center justify-center flex-1">
        <div className="bg-white shadow-2xl rounded-lg p-8 max-w-md w-full">
          <h2 className="text-3xl font-bold mb-6 text-center text-[#006A71]">
            {isSignUp ? 'Sign Up' : 'Login'}
          </h2>
          {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

          <form
            onSubmit={isSignUp ? handleSignUp : handleLogin}
            className="space-y-4"
          >
            {isSignUp && (
              <>
                <div>
                  <label htmlFor="name" className="block font-semibold text-[#006A71]">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="mt-1 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#006A71]"
                    style={{ borderColor: '#9ACBD0' }}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="dob" className="block font-semibold text-[#006A71]">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    id="dob"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    className="mt-1 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#006A71]"
                    style={{ borderColor: '#9ACBD0' }}
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[#006A71]">
                    I am a
                  </label>
                  <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="role"
                        value="patient"
                        checked={role === 'patient'}
                        onChange={e => setRole(e.target.value)}
                        className="form-radio text-[#006A71]"
                      />
                      <span className="ml-2 text-[#006A71]">Patient</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="role"
                        value="doctor"
                        checked={role === 'doctor'}
                        onChange={e => setRole(e.target.value)}
                        className="form-radio text-[#006A71]"
                      />
                      <span className="ml-2 text-[#006A71]">Doctor</span>
                    </label>
                  </div>
                </div>
                {role === 'doctor' && (
                  <div>
                    <label
                      htmlFor="specialization"
                      className="block font-semibold text-[#006A71]"
                    >
                      Specialization
                    </label>
                    <input
                      type="text"
                      id="specialization"
                      value={specialization}
                      onChange={e => setSpecialization(e.target.value)}
                      className="mt-1 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#006A71]"
                      style={{ borderColor: '#9ACBD0' }}
                      required
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label htmlFor="email" className="block font-semibold text-[#006A71]">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#006A71]"
                style={{ borderColor: '#9ACBD0' }}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block font-semibold text-[#006A71]">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-1 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#006A71]"
                style={{ borderColor: '#9ACBD0' }}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 rounded-md transition cursor-pointer"
              style={{ backgroundColor: '#006A71', color: '#F2EFE7' }}
              onMouseOver={e => (e.currentTarget.style.backgroundColor = '#48A6A7')}
              onMouseOut={e => (e.currentTarget.style.backgroundColor = '#006A71')}
            >
              {isSignUp ? 'Sign Up' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleGoogle}
              className="flex items-center justify-center space-x-2 border py-2 px-4 rounded-md transition cursor-pointer"
              style={{ borderColor: '#006A71', color: '#006A71' }}
              onMouseOver={e => (e.currentTarget.style.backgroundColor = '#F2EFE7')}
            >
              Sign in with Google
            </button>
            <p className="mt-4 text-[#006A71]">
              {isSignUp
                ? 'Already have an account?'
                : "Don't have an account?"}{' '}
              <button
                onClick={() => {
                  setError('')
                  setIsSignUp(!isSignUp)
                }}
                className="font-bold cursor-pointer hover:underline text-[#48A6A7]"
              >
                {isSignUp ? 'Login' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
