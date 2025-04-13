
"use client";
import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../app/firebase-config"; // Adjust path if needed
import { ref, onValue } from "firebase/database";
import { gsap } from "gsap";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const navRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const linksRef = useRef(null);

  // Watch auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  // Fetch user role
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

  // GSAP animations
  useEffect(() => {
    // Navbar entry animation
    gsap.fromTo(
      navRef.current,
      { opacity: 0, y: -50 },
      { opacity: 1, y: 0, duration: 1, ease: "power3.out" }
    );

    // Desktop links animation
    gsap.fromTo(
      linksRef.current?.querySelectorAll("li"),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power3.out", delay: 0.5 }
    );

    // Mobile menu animation
    if (isOpen) {
      gsap.fromTo(
        mobileMenuRef.current,
        { opacity: 0, x: "100%" },
        { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }
      );
      gsap.fromTo(
        mobileMenuRef.current?.querySelectorAll("li, button"),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power3.out", delay: 0.2 }
      );
    }
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const consultLink = userRole === "doctor" ? "/doctor_profile" : "/appointment";

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/diagnosis", label: "Diagnosis" },
    { href: consultLink, label: "Consult" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 w-full bg-[#006A71]/90 z-50 backdrop-blur-md shadow-md py-4 flex justify-between items-center border-b border-[#9ACBD0]/20"
    >
      {/* Logo */}
      <h1 className="text-2xl md:text-3xl font-bold font-[Poppins] text-[#F2EFE7] pl-6 hover:text-[#48A6A7] transition">
        <Link href="/" aria-label="AetherCare Home">
          AetherCare
        </Link>
      </h1>

      {/* Desktop Menu */}
      <div className="hidden md:flex items-center space-x-8">
        {/* Centered Links */}
        <div ref={linksRef} className="flex justify-center">
          <ul className="flex space-x-6">
            {navItems.map((item, index) => (
              <li key={index}>
                <Link
                  href={item.href}
                  className="text-[#F2EFE7] text-base font-[Inter] relative group transition"
                  aria-label={item.label}
                >
                  {item.label}
                  <span className="absolute left-0 bottom-0 w-0 h-[2px] bg-[#48A6A7] group-hover:w-full transition-all duration-300"></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Desktop Auth Buttons */}
      <div className="hidden md:flex items-center pr-6 space-x-4">
        {currentUser ? (
          <>
            <Link
              href="/profile"
              className="bg-gradient-to-r from-[#9ACBD0] to-[#48A6A7] text-[#F2EFE7] px-4 py-2 rounded-full font-[Inter] text-base shadow-md hover:from-[#48A6A7] hover:to-[#006A71] transition-all hover:shadow-lg"
              aria-label="View profile"
            >
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-[#9ACBD0] to-[#48A6A7] text-[#F2EFE7] px-4 py-2 rounded-full font-[Inter] text-base shadow-md hover:from-[#48A6A7] hover:to-[#006A71] transition-all hover:shadow-lg"
              aria-label="Log out"
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="bg-gradient-to-r from-[#9ACBD0] to-[#48A6A7] text-[#F2EFE7] px-4 py-2 rounded-full font-[Inter] text-base shadow-md hover:from-[#48A6A7] hover:to-[#006A71] transition-all hover:shadow-lg"
            aria-label="Log in"
          >
            Login
          </Link>
        )}
      </div>

      {/* Mobile Toggle */}
      <button
        className="md:hidden text-[#F2EFE7] pr-6"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      {/* Mobile Menu */}
      {isOpen && (
        <div
          ref={mobileMenuRef}
          className="md:hidden fixed top-16 left-0 w-full h-[calc(100vh-4rem)] bg-[#F2EFE7]/95 backdrop-blur-lg shadow-xl border-t border-[#9ACBD0]/20 flex flex-col items-center justify-center"
        >
          {/* Centered Links */}
          <div className="flex justify-center mb-8">
            <ul className="flex flex-col items-center space-y-6">
              {navItems.map((item, index) => (
                <li key={index}>
                  <Link
                    href={item.href}
                    className="text-[#006A71] text-lg font-[Inter] hover:text-[#48A6A7] transition"
                    onClick={() => setIsOpen(false)}
                    aria-label={item.label}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Mobile Auth Buttons */}
          <div className="flex flex-col items-center space-y-4 w-3/4">
            {currentUser ? (
              <>
                <Link
                  href="/profile"
                  className="w-full text-center bg-gradient-to-r from-[#9ACBD0] to-[#48A6A7] text-[#F2EFE7] px-4 py-3 rounded-full font-[Inter] text-base shadow-md hover:from-[#48A6A7] hover:to-[#006A71] transition-all hover:shadow-lg"
                  onClick={() => setIsOpen(false)}
                  aria-label="View profile"
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full bg-gradient-to-r from-[#9ACBD0] to-[#48A6A7] text-[#F2EFE7] px-4 py-3 rounded-full font-[Inter] text-base shadow-md hover:from-[#48A6A7] hover:to-[#006A71] transition-all hover:shadow-lg"
                  aria-label="Log out"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="w-full text-center bg-gradient-to-r from-[#9ACBD0] to-[#48A6A7] text-[#F2EFE7] px-4 py-3 rounded-full font-[Inter] text-base shadow-md hover:from-[#48A6A7] hover:to-[#006A71] transition-all hover:shadow-lg"
                onClick={() => setIsOpen(false)}
                aria-label="Log in"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
