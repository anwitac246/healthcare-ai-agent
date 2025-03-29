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
                background: `linear-gradient(120deg, rgb(0, 0, 0) ${scrollY * 0.1}%, rgb(34, 197, 94) ${100 - scrollY * 0.1}%)`,
                transition: 'background 0.5s ease-in-out',
            }}
        >
            
            <motion.div 
                className="absolute inset-0 bg-gradient-to-br from-[#FFFFFF] via-[#0a1302] to-[#FFFFFF] opacity-50"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            />

           
            <motion.h1 
                className="text-4xl md:text-5xl font-extrabold text-white relative z-10"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
            >
                Welcome to{' '}
                <span className="text-green-400 font-mono">
                    <Typewriter words={['AetherCare']} loop={false} cursor cursorStyle="|" delaySpeed={3000} />
                </span>
                , your trusted AI-powered health companion.
            </motion.h1>

            <motion.p 
                className="text-lg text-gray-300 mt-4 max-w-2xl relative z-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.5 }}
            >
                We're here to help you navigate your symptoms and provide insights into your health—all at the click of a button.
            </motion.p>

            
            <motion.div 
                className="mt-8 flex flex-col md:flex-row gap-4 relative z-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 1 }}
            >
                <div className="flex md:flex-row flex-wrap justify-between m-4 max-sm:flex-col">
                <button className="px-6 py-3 m-4 cursor-pointer text-lg font-mono rounded-full  text-white  shadow-lg hover:bg-green-600 transition duration-300 hover:scale-105 hover:shadow-xl">
                <Link href="/diagnosis">Get Diagnosis</Link>
                </button>
                <button className="px-6 py-3 m-4 cursor-pointer text-lg font-mono rounded-full  text-white shadow-lg hover:bg-green-600 transition duration-300 hover:scale-105 hover:shadow-xl">
                <Link href="/about">Learn More</Link>
                </button>
                <button className="px-6 py-3 m-4 cursor-pointer text-lg font-mono rounded-full text-white shadow-lg hover:bg-green-600 transition duration-300 hover:scale-105 hover:shadow-xl">
                    Order Medicines
                </button>
                </div>
                
            </motion.div>

            
            <motion.div 
                className="absolute bottom-10 w-16 h-16 bg-green-600 rounded-full opacity-50"
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            />
        </div>
    );
}
