'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../app/firebase-config';   // adjust if needed
import { ref, onValue } from 'firebase/database';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Watch auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  // Fetch user role once we know who is logged in
  useEffect(() => {
    if (!currentUser) {
      setUserRole(null);
      return;
    }
    const roleRef = ref(db, `users/${currentUser.uid}/role`);
    const unsubRole = onValue(roleRef, (snapshot) => {
      setUserRole(snapshot.val());
    });
    return () => unsubRole();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };


  const consultLink = userRole === 'doctor'
    ? '/doctor_profile'
    : '/appointment';

  return (
    <nav className="fixed top-0 left-0 w-full bg-white/5 z-50 backdrop-blur-sm shadow-lg p-4 flex justify-between items-center flex-wrap border-b border-white/20">
      <h1 className="text-3xl font-bold text-[#006A71] cursor-pointer font-mono">
        <Link href="/">AetherCare</Link>
      </h1>

      <button
        className="md:hidden text-[#006A71] cursor-pointer mx-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={32} /> : <Menu size={32} />}
      </button>

      {/* Desktop menu */}
      <div className="max-sm:hidden md:flex justify-between items-center space-x-6">
        <ul className="flex space-x-6">
          <li className="text-[#006A71] hover:text-[#000000] cursor-pointer transition font-mono">
            <Link href="/">Home</Link>
          </li>
          <li className="text-[#006A71] hover:text-[#000000] cursor-pointer transition font-mono">
            <Link href="/diagnosis">Diagnosis</Link>
          </li>
          <li className="text-[#006A71] hover:text-[#000000] cursor-pointer transition font-mono">
            <Link href={consultLink}>Consult</Link>
          </li>
          <li className="text-[#006A71] hover:text-[#000000] cursor-pointer transition font-mono">
            <Link href="/contact">Contact</Link>
          </li>
        </ul>
      </div>

      {/* Desktop auth buttons */}
      <div className="max-sm:hidden md:flex space-x-4">
        {currentUser ? (
          <>
            <button className="bg-gradient-to-r from-[#9ACBD0] mx-4 to-[#48A6A7] text-[#F2EFE7] px-4 py-2 rounded-lg cursor-pointer font-mono shadow-md hover:from-[#48A6A7] hover:to-[#006A71] transition">
              <Link href="/profile">Profile</Link>
            </button>
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-[#9ACBD0] to-[#48A6A7] text-[#F2EFE7] px-4 py-2 rounded-lg cursor-pointer font-mono shadow-md hover:from-[#48A6A7] hover:to-[#006A71] transition"
            >
              Logout
            </button>
          </>
        ) : (
          <button className="bg-gradient-to-r from-[#9ACBD0] to-[#48A6A7] text-[#F2EFE7] px-4 py-2 rounded-lg cursor-pointer font-mono shadow-md hover:from-[#48A6A7] hover:to-[#006A71] transition">
            <Link href="/login">Login</Link>
          </button>
        )}
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full backdrop-blur-lg p-6 shadow-lg border-t border-white/20">
          <ul className="flex flex-col items-center space-y-4">
            <li className="text-[#006A71] text-lg cursor-pointer font-mono" onClick={() => setIsOpen(false)}>
              <Link href="/">Home</Link>
            </li>
            <li className="text-[#006A71] text-lg cursor-pointer font-mono" onClick={() => setIsOpen(false)}>
              <Link href="/diagnosis">Diagnosis</Link>
            </li>
            <li className="text-[#006A71] text-lg cursor-pointer font-mono" onClick={() => setIsOpen(false)}>
              <Link href={consultLink}>Consult</Link>
            </li>
            <li className="text-[#006A71] text-lg cursor-pointer font-mono" onClick={() => setIsOpen(false)}>
              <Link href="/contact">Contact</Link>
            </li>
          </ul>

          <div className="flex flex-col items-center mt-4 space-y-4">
            {currentUser ? (
              <div className="w-full flex-col justify-between space-y-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleLogout();
                  }}
                  className="w-full bg-gradient-to-r from-[#9ACBD0] to-[#48A6A7] text-[#F2EFE7] px-4 py-2 rounded-lg cursor-pointer font-mono shadow-md hover:from-[#48A6A7] hover:to-[#006A71] transition"
                >
                  Logout
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                  }}
                  className="w-full bg-gradient-to-r from-[#9ACBD0] to-[#48A6A7] text-[#F2EFE7] px-4 py-2 rounded-lg cursor-pointer font-mono shadow-md hover:from-[#48A6A7] hover:to-[#006A71] transition"
                >
                  <Link href="/profile">Profile</Link>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsOpen(false)}
                className="w-full bg-gradient-to-r from-[#9ACBD0] to-[#48A6A7] text-[#F2EFE7] px-4 py-2 rounded-lg cursor-pointer font-mono shadow-md hover:from-[#48A6A7] hover:to-[#006A71] transition"
              >
                <Link href="/login">Login</Link>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
