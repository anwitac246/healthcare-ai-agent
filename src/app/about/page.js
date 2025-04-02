'use client';
import React from 'react';
import Navbar from '@/components/navbar';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function About() {
  return (
    <div className="min-h-screen font-sans" style={{ background: '#F2EFE7', color: '#006A71' }}>
      <Navbar />

      <motion.section
        initial={{ opacity: 0, y: -60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="py-24 px-6 text-center"
      >
        <h1 className="text-6xl font-extrabold font-mono" style={{ color: '#006A71' }}>
          AetherCare
        </h1>
        <p className="max-w-3xl mx-auto text-xl mt-4" style={{ color: '#48A6A7' }}>
          Empowering healthcare with cutting-edge AI solutions and compassionate care.
        </p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="py-16 px-8 rounded-xl mx-auto text-center shadow-xl max-w-5xl"
        style={{ background: '#9ACBD0' }}
      >
        <h2 className="text-4xl font-bold mb-6" style={{ color: '#006A71' }}>
          Our Vision
        </h2>
        <p className="text-lg" style={{ color: '#F2EFE7' }}>
          At AetherCare, we’re revolutionizing healthcare by blending state-of-the-art AI diagnostics, personalized care, and innovative technology to create a system that’s efficient, accessible, and truly patient-centric.
        </p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="py-16 px-8 flex flex-col md:flex-row justify-center gap-8 max-w-6xl mx-auto"
      >
        {['Innovation', 'Integrity', 'Inclusion'].map((value, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.05, rotate: 1 }}
            className="p-6 rounded-lg shadow-lg text-center md:w-1/3 border"
            style={{ background: '#48A6A7', borderColor: '#006A71' }}
          >
            <h3 className="text-2xl font-semibold mb-4" style={{ color: '#F2EFE7' }}>
              {value}
            </h3>
            <p className="text-lg" style={{ color: '#F2EFE7' }}>
              {value === 'Innovation' && 'Harnessing technology to redefine diagnostics and treatment.'}
              {value === 'Integrity' && 'Commitment to transparency, ethics, and patient-first care.'}
              {value === 'Inclusion' && 'Building accessible healthcare solutions for everyone.'}
            </p>
          </motion.div>
        ))}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="py-16 px-8 text-center"
      >
        <h2 className="text-4xl font-bold mb-6" style={{ color: '#006A71' }}>
          Join the Healthcare Revolution
        </h2>
        <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: '#48A6A7' }}>
          Discover a new era of personalized healthcare, where advanced AI meets human empathy. Let’s build a healthier future together.
        </p>
        <motion.button
          whileHover={{ scale: 1.1, rotate: 2 }}
          whileTap={{ scale: 0.95, rotate: -2 }}
          className="px-8 py-4 font-bold rounded-lg shadow-lg transition"
          style={{ background: '#006A71', color: '#F2EFE7' }}
        >
          Get Started
        </motion.button>
      </motion.section>
    </div>
  );
}
