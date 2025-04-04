'use client';
import React, { useEffect, useState } from 'react';
import { Typewriter } from 'react-simple-typewriter';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Homepage() {
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div 
            className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative overflow-hidden"
            style={{
                // Fixed backdrop using your color palette:
                background: 'linear-gradient(120deg, #F2EFE7, #9ACBD0, #48A6A7, #006A71)',
                transition: 'background 0.5s ease-in-out',
            }}
        >
            <motion.div 
                className="absolute inset-0 bg-gradient-to-br from-transparent via-[#48A6A7] to-transparent opacity-40"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            />

            <motion.h1 
                className="text-4xl md:text-6xl font-extrabold text-[#006A71] relative z-10"
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
            >
                Welcome to{' '}
                <span className="text-[#006A71] font-mono">
                    <Typewriter words={['AetherCare']} loop={false} cursor cursorStyle="|" delaySpeed={3000} />
                </span>
                , your trusted AI-powered health companion.
            </motion.h1>

            <motion.p 
                className="text-lg md:text-xl text-[#006A71] mt-6 max-w-2xl relative z-10"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.5 }}
            >
                We're here to guide you through your symptoms and provide insightful diagnosis and advice, all at your fingertips.
            </motion.p>

            <motion.div 
                className="mt-8 flex flex-col md:flex-row gap-6 relative z-10"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 1 }}
            >
                <div className="flex flex-wrap justify-center gap-4">
                    <Link href="/diagnosis">
                        <button className="px-8 py-4 text-lg font-mono rounded-full text-white bg-gradient-to-r from-[#006A71] to-[#48A6A7] shadow-lg hover:from-[#006A71] hover:to-[#9ACBD0] transition transform hover:scale-105">
                            Get Diagnosis
                        </button>
                    </Link>
                    <Link href="/about">
                        <button className="px-8 py-4 text-lg font-mono rounded-full text-white bg-gradient-to-r from-[#48A6A7] to-[#9ACBD0] shadow-lg hover:from-[#48A6A7] hover:to-[#006A71] transition transform hover:scale-105">
                            Learn More
                        </button>
                    </Link>
                    <button className="px-8 py-4 text-lg font-mono rounded-full text-white bg-gradient-to-r from-[#9ACBD0] to-[#006A71] shadow-lg hover:from-[#9ACBD0] hover:to-[#48A6A7] transition transform hover:scale-105">
                        Order Medicines
                    </button>
                </div>
            </motion.div>

            <motion.div 
                className="absolute bottom-10 w-16 h-16 bg-[#006A71] rounded-full opacity-50"
                animate={{ y: [0, 15, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            />
        </div>
    );
}
