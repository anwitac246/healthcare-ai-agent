'use client';
import React from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/navbar';
import Link from 'next/link';

export default function About() {
  // Animation variants for text and images
  const sectionVariant = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 1 } },
  };

  const imageVariant = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 1 } },
  };
  const handleConsultationClick = () => {
    if (role === 'doctor') {
      router.push('/doctor_profile')
    } else {
      router.push('/appointment')
    }
  }
  return (
    <div className="min-h-screen bg-[#F2F2F2] relative overflow-hidden">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="py-24 px-6 text-center">

        <motion.p
          className="mt-6 text-lg md:text-xl text-[#5BAF54] max-w-3xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          At AetherCare, our goal is to reimagine healthcare with a blend of advanced AI technology and human compassion.
          Explore our journey and learn more about our full range of services.
        </motion.p>
      </section>

      {/* Our Services Overview */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            className="text-3xl font-bold text-center text-[#5BAF54] mb-20"
            initial={{ opacity: 0, y: -30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          >
            Our Services
          </motion.h2>
          <div className="flex flex-col gap-12">
            {/* Service 1: AI-Powered Diagnosis */}
            <motion.div
              className="flex flex-col md:flex-row items-center gap-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={sectionVariant}
            >
              <div className="md:w-1/2">
                <h3 className="text-2xl font-bold text-[#435643]">AI-Powered Diagnosis</h3>
                <p className="text-lg text-[#435643] mt-4">
                  Leverage our intelligent, AI-driven platform to get a rapid and reliable diagnosis based on your symptoms.
                </p><br />
                <Link href="/diagnosis">
                  <button className="px-8 py-4 text-lg cursor-pointer font-mono rounded-full text-white bg-gradient-to-r from-[#5BAF54] to-[#488F43] shadow-lg hover:from-[#5BAF54] hover:to-[#6EC465] transition transform hover:scale-105">
                    Get Diagnosis
                  </button>
                </Link>
              </div>
              <div className="md:w-1/2">
                <img
                  src="/diagnosis.jpg"
                  alt="AI Diagnosis"
                  className="w-full rounded-lg shadow-lg max-h-3.5 max-w-4 max-h-[50%] max-w-[60%]"
                />
              </div>
            </motion.div>
            {/* Service 2: Nearby Doctors */}
            <motion.div
              className="flex flex-col md:flex-row-reverse items-center gap-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={sectionVariant}
            >
              <div className="md:w-1/2">
                <h3 className="text-2xl font-bold text-[#435643]">Nearby Doctors</h3>
                <p className="text-lg text-[#435643] mt-4">
                  Easily locate trusted medical professionals near you with our real‑time search tool.
                </p><br />
                <Link href="/location_docs">
                  <button className="px-8 py-4 text-lg cursor-pointer font-mono rounded-full text-white bg-gradient-to-r from-[#488F43] to-[#6EC465] shadow-lg hover:from-[#488F43] hover:to-[#5BAF54] transition transform hover:scale-105">
                    Search Doctors
                  </button>
                </Link>
              </div>
              <div className="md:w-1/2">
                <img
                  src="/nearbydocs.jpg"
                  alt="Nearby Doctors"
                  className="w-full rounded-lg shadow-lg max-h-[50%] max-w-[60%]"
                />
              </div>
            </motion.div>
            {/* Service 3: Online Consultations */}
            <motion.div
              className="flex flex-col md:flex-row items-center gap-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={sectionVariant}
            >
              <div className="md:w-1/2">
                <h3 className="text-2xl font-bold text-[#435643]">Online Consultations</h3>
                <p className="text-lg text-[#435643] mt-4">
                  Get real‑time advice from medical experts through our secure online consultation service.
                </p><br />
                <button
                  onClick={handleConsultationClick}
                  className="px-8 py-4 text-lg cursor-pointer font-mono rounded-full text-white bg-gradient-to-r from-[#488F43] to-[#6EC465] shadow-lg hover:from-[#488F43] hover:to-[#5BAF54] transition transform hover:scale-105"
                >
                  Consultation
                </button>
              </div>
              <div className="md:w-1/2">
                <img
                  src="/consultation.jpg"
                  alt="Online Consultations"
                  className="w-full rounded-lg shadow-lg max-h-[50%] max-w-[60%]"
                />
              </div>
            </motion.div>
            {/* Service 4: Emergency Ambulance */}
            <motion.div
              className="flex flex-col md:flex-row-reverse items-center gap-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={sectionVariant}
            >
              <div className="md:w-1/2">
                <h3 className="text-2xl font-bold text-[#435643]">Emergency Ambulance</h3>
                <p className="text-lg text-[#435643] mt-4">
                  In emergencies, trigger an immediate ambulance call with a single click and let our AI coordinate the response.
                </p><br />
                <button className="px-8 py-4 text-lg cursor-pointer font-mono rounded-full text-white bg-gradient-to-r from-[#6EC465] to-[#5BAF54] shadow-lg hover:from-[#6EC465] hover:to-[#488F43] transition transform hover:scale-105">
                  <Link href="/ambulance">
                    SOS Ambulance
                  </Link>
                </button>
              </div>
              <div className="md:w-1/2">
                <img
                  src="/ambulance.jpg"
                  alt="Emergency Ambulance"
                  className="w-full rounded-lg shadow-lg bg-white max-h-[50%] max-w-[60%]"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Commitment (Optional Additional Section) */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-8">
          <motion.div
            className="md:w-1/2"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1 }}
          >
            <h2 className="text-3xl font-bold text-[#5BAF54] mb-4">Our Commitment</h2>
            <p className="text-lg text-[#435643] leading-relaxed">
              We are devoted to enhancing your healthcare experience with a perfect blend of advanced technology and empathetic care.
              Your well‑being is at the heart of everything we do.
            </p>
          </motion.div>
          <motion.div
            className="md:w-1/2"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1 }}
          >
            <img
              src="/about-commitment.jpg"
              alt="Our Commitment"
              className="w-full rounded-lg shadow-lg"
            />
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#5BAF54] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-base">
            © {new Date().getFullYear()} AetherCare. All rights reserved.
          </p>
          <div className="mt-4 space-x-4">
            <Link href="/about" className="hover:text-[#488F43] transition">
              About
            </Link>
            <Link href="/contact" className="hover:text-[#488F43] transition">
              Contact
            </Link>
            <Link href="/privacy" className="hover:text-[#488F43] transition">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
