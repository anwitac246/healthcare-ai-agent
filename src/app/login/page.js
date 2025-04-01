'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { app, db } from '../firebase-config';
import SHA256 from 'crypto-js/sha256';
import Navbar from '@/components/navbar';

export default function Login() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const auth = getAuth(app);
  const googleProvider = new GoogleAuthProvider();

  const handleEmailPasswordAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      let userCredential;
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
 
        const hashedPassword = SHA256(password).toString();
        const user = userCredential.user;
       
        await set(ref(db, `users/${user.uid}`), {
          email: user.email,
          password: hashedPassword,
          createdAt: new Date().toISOString()
        });
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }
      router.push('/diagnosis');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
    
      await set(ref(db, `users/${user.uid}`), {
        email: user.email,
        name: user.displayName,
        createdAt: new Date().toISOString()
      });
      router.push('/diagnosis');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <Navbar/>
    <div className="min-h-screen flex items-center justify-center bg-green-900">
      <div className="bg-white shadow-2xl rounded-lg p-8 max-w-md w-full">
        <h2 className="text-3xl font-bold mb-6 text-center text-green-900">
          {isSignUp ? 'Sign Up' : 'Login'}
        </h2>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        <form onSubmit={handleEmailPasswordAuth} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-green-900 font-semibold">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full p-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-green-900 font-semibold">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full p-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 cursor-pointer px-4 bg-green-700 text-white rounded-md hover:bg-green-800 transition"
          >
            {isSignUp ? 'Sign Up' : 'Login'}
          </button>
        </form>
        <div className="mt-6 flex items-center justify-center">
          <button
            onClick={handleGoogleLogin}
            className="flex cursor-pointer items-center space-x-2 border border-green-700 text-green-700 py-2 px-4 rounded-md hover:bg-green-100 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.74 1.37 9.23 3.57l6.89-6.89C35.77 4.07 30.18 2 24 2 14.89 2 6.97 6.33 2.65 13.11l7.98 6.2C12.74 12.4 17.78 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.5c0-1.63-.15-3.2-.44-4.7H24v8.9h12.93c-.56 3.04-2.21 5.61-4.72 7.32l7.63 5.94C44.68 36.32 46.98 30.17 46.98 24.5z"/>
              <path fill="#FBBC05" d="M10.63 28.86c-.47-1.38-.74-2.85-.74-4.36 0-1.51.27-2.98.74-4.36l-7.98-6.2C1.96 17.48 1.5 20.13 1.5 22.5c0 2.37.46 5.02 2.15 8.2l7.98-6.2z"/>
              <path fill="#34A853" d="M24 44c6.18 0 11.38-2.04 15.17-5.54l-7.63-5.94c-2.11 1.42-4.8 2.26-7.54 2.26-5.8 0-10.73-3.92-12.5-9.22l-7.98 6.2C6.97 41.67 14.89 44 24 44z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>
        <div className="mt-6 text-center">
          <p className="text-green-900">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} className="font-bold cursor-pointer hover:underline">
              {isSignUp ? "Login" : "Sign Up"}
            </button>
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}
