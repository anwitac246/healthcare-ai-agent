'use client';
import React from 'react';
import Navbar from '@/components/navbar';
import Head from 'next/head';
import Link from 'next/link';

const doctors = [
  { id: 1, name: 'Dr. John Smith', specialization: 'Cardiologist', avatar: 'https://media.istockphoto.com/id/1161336374/photo/portrait-of-confident-young-medical-doctor-on-blue-background.jpg?s=612x612&w=0&k=20&c=zaa4MFrk76JzFKvn5AcYpsD8S0ePYYX_5wtuugCD3ig=' },
  { id: 2, name: 'Dr. Emily Johnson', specialization: 'Pediatrician', avatar: 'https://www.shutterstock.com/image-photo/profile-photo-attractive-family-doc-260nw-1724693776.jpg' },
  { id: 3, name: 'Dr. Michael Brown', specialization: 'Neurologist', avatar: 'https://thumbs.dreamstime.com/b/african-male-doctor-happy-tablet-computer-34481166.jpg' },
];

const Home = () => {
  return (
    <div className="bg-white min-h-screen">
      <Head>
        <title>Doctor Appointment</title>
        <meta name="description" content="Book appointments with our expert doctors" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />

      <section className="bg-gradient-to-r from-[#006A71] to-black text-white py-20 my-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-5xl font-extrabold mb-4 animate-fade-in">Your Health, Our Priority</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Book appointments with top specialists in just a few clicks.
          </p>
          <Link
            href="/book"
            className="inline-block bg-white text-[#006A71] px-8 py-3 rounded-full font-semibold hover:bg-opacity-90 transition-all duration-300 shadow-md"
          >
            Book Now
          </Link>
        </div>
      </section>

      <main className="container mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-black text-center mb-12">Meet Our Doctors</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {doctors.map((doctor) => (
            <div
              key={doctor.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300"
            >
              <img
                src={doctor.avatar}
                alt={doctor.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-6 text-center">
                <h3 className="text-2xl font-semibold text-black mb-2">{doctor.name}</h3>
                <p className="text-[#006A71] mb-4">{doctor.specialization}</p>
                <Link
                  href="/book"
                  className="inline-block bg-[#006A71] text-white px-6 py-2 rounded-full hover:bg-black transition-colors duration-300"
                >
                  Book Appointment
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="bg-black text-white py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm">© {new Date().getFullYear()} Aethercare. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
