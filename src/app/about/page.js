'use client';
import React from 'react';
import Navbar from '@/components/navbar';
import { motion } from 'framer-motion';

export default function About() {
  return (
    <div className="bg-black text-white min-h-screen font-sans">
      <Navbar />

      <motion.section
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="py-24 px-6 text-center "
      >
        <h1 className="text-6xl font-extrabold font-mono text-green-500">AetherCare</h1>
        <p className="max-w-3xl mx-auto text-lg text-gray-300 mt-4">
          AI-driven healthcare for a smarter, faster, and more accessible future.
        </p>
      </motion.section>

      
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="py-16 px-8  rounded-xl shadow-xl max-w-5xl mx-auto text-center"
      >
        <h2 className="text-4xl font-bold text-green-400 mb-6">Our Mission</h2>
        <p className="text-lg text-gray-300">
          Transforming healthcare with AI-powered diagnostics, seamless consultations,
          and intelligent prescription services.
        </p>
      </motion.section>

  
      <motion.section
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="py-16 px-8 flex flex-col md:flex-row justify-center gap-8 max-w-6xl mx-auto"
      >
        {['Innovation', 'Empathy', 'Accessibility'].map((value, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.05 }}
            className="bg-gray-900 p-6 rounded-lg shadow-lg text-center md:w-1/3 border border-gray-700"
          >
            <h3 className="text-xl font-semibold text-green-400 mb-4">{value}</h3>
            <p className="text-gray-400">
              {value === 'Innovation' && 'Leveraging AI to revolutionize medical diagnostics.'}
              {value === 'Empathy' && 'Ensuring that healthcare remains human-centric and accessible.'}
              {value === 'Accessibility' && 'Bringing healthcare to your fingertips, anytime, anywhere.'}
            </p>
          </motion.div>
        ))}
      </motion.section>

      
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="py-16 px-8 text-center"
      >
        <h2 className="text-4xl font-bold text-green-400">Join Us in Revolutionizing Healthcare</h2>
        <p className="text-lg text-gray-300 max-w-2xl mx-auto mt-4">
          AI-driven diagnostics, instant medical insights, and seamless consultations at your fingertips.
        </p>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="mt-6 px-6 py-3 bg-green-500 text-black font-bold rounded-lg shadow-lg hover:bg-green-400 transition"
        >
          Get Started
        </motion.button>
      </motion.section>
    </div>
  );
}
