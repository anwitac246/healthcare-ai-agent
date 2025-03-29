'use client';
import Link from "next/link";
import React, { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 w-full bg-white/5 z-50 backdrop-blur-sm shadow-lg p-4 flex justify-between items-center flex-wrap border-b border-white/20">
    
      <h1 className="text-3xl font-bold text-green-400 cursor-pointer font-mono">
        <Link href="/">AetherCare</Link>
      </h1>

     
      <button
        className="md:hidden text-white cursor-pointer mx-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={32} /> : <Menu size={32} />}
      </button>

      <div className="max-sm:hidden md:flex justify-between items-center space-x-6">
        <ul className="flex space-x-6">
          <li className="text-white hover:text-green-300 cursor-pointer transition font-mono">
            <Link href="/">Home</Link>
          </li>
          <li className="text-white hover:text-green-300 cursor-pointer transition font-mono">
           <Link href="/diagnosis">Diagnosis</Link> 
          </li>
          <li className="text-white hover:text-green-300 cursor-pointer transition font-mono">
            <Link href="/about">About</Link>
          </li>
          <li className="text-white hover:text-green-300 cursor-pointer transition font-mono">
            <Link href="/contact">Contact</Link>
          </li>
        </ul>
      </div>

     
      <div className="max-sm:hidden md:flex space-x-4">
        <button className="bg-green-600 text-white px-4 py-2 rounded-lg cursor-pointer font-mono shadow-md hover:bg-green-500 transition">
          Sign Up
        </button>
        <button className="bg-white/20 text-green-400 px-4 py-2 rounded-lg cursor-pointer font-mono shadow-md hover:bg-white/30 transition">
          Login
        </button>
      </div>

     
      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full backdrop-blur-lg p-6 shadow-lg border-t ">
          <ul className="flex flex-col items-center space-y-4">
            <li className="text-white text-lg cursor-pointer font-mono" onClick={() => setIsOpen(false)}>
              <Link href="/">Home</Link>
            </li>
            <li className="text-white text-lg cursor-pointer font-mono" onClick={() => setIsOpen(false)}>
            <Link href="/diagnosis">Diagnosis</Link> 
            </li>
            <li className="text-white text-lg cursor-pointer font-mono" onClick={() => setIsOpen(false)}>
            <Link href="/about">About</Link>
            </li>
            <li className="text-white text-lg cursor-pointer font-mono" onClick={() => setIsOpen(false)}>
              <Link href="/contact">Contact</Link>
            </li>
          </ul>
          <div className="flex flex-col items-center mt-4 space-y-4">
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg cursor-pointer w-full font-mono shadow-md hover:bg-green-500 transition" onClick={() => setIsOpen(false)}>
              Sign Up
            </button>
            <button className="bg-white/20 text-green-400 px-4 py-2 rounded-lg cursor-pointer w-full font-mono shadow-md hover:bg-white/30 transition" onClick={() => setIsOpen(false)}>
              Login
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
