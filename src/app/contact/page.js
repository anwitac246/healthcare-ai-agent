"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Navbar from "@/components/navbar";
import emailjs from "emailjs-com";

gsap.registerPlugin(ScrollTrigger);

export default function Contact() {
  const heroRef = useRef(null);
  const cardsRef = useRef([]);
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Hero animation: fade-in and slide-up
    gsap.fromTo(
      heroRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1, ease: "power3.out" }
    );

    // Contact cards: staggered scale and fade
    gsap.fromTo(
      cardsRef.current,
      { opacity: 0, scale: 0.8 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.8,
        stagger: 0.2,
        ease: "back.out(1.7)",
        scrollTrigger: {
          trigger: cardsRef.current[0],
          start: "top 80%",
        },
      }
    );

    // Form animation: slide-up on scroll
    gsap.fromTo(
      formRef.current,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: formRef.current,
          start: "top 80%",
        },
      }
    );

    // Cleanup ScrollTriggers on unmount
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email address";
    if (!formData.message.trim()) newErrors.message = "Message is required";
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setStatus("");
      return;
    }

    const templateParams = {
      from_name: formData.name,
      from_email: formData.email,
      message: formData.message,
      to_name: "AetherCare Team",
    };

    emailjs
      .send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "YOUR_SERVICE_ID",
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "YOUR_TEMPLATE_ID",
        templateParams,
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "YOUR_PUBLIC_KEY"
      )
      .then(
        (result) => {
          console.log("Email successfully sent:", result.text);
          setStatus("Message sent successfully!");
          setFormData({ name: "", email: "", message: "" });
          setErrors({});
        },
        (error) => {
          console.error("Email sending error:", error.text);
          setStatus("Failed to send message. Please try again.");
        }
      );
  };

  const contactItems = [
    {
      href: "https://www.instagram.com/anwitac.795?igsh=YmdueHZuYTd3NHlq",
      label: "Instagram",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width={28}
          height={28}
          stroke="#E8F5E7"
          fill="none"
          strokeWidth="1.5"
          strokeLinejoin="round"
        >
          <rect x="2.5" y="2.5" width="19" height="19" rx="5" ry="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17" cy="7" r="1" />
        </svg>
      ),
    },
    {
      href: "https://x.com/ThisisAnwita_C?t=kMJla6JC-R1FMdeYSTE9Sw&s=08",
      label: "Twitter",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width={28}
          height={28}
          stroke="#E8F5E7"
          fill="none"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 21L10.5 13.5M21 3L13.5 10.5M13.5 10.5L8 3H3L10.5 13.5M13.5 10.5L21 21H16L10.5 13.5" />
        </svg>
      ),
    },
    {
      href: "mailto:diyachakra.369@gmail.com",
      label: "Email",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width={28}
          height={28}
          stroke="#E8F5E7"
          fill="none"
          strokeWidth="1.5"
          strokeLinejoin="round"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
          <path d="M2 6l10 7 10-7" />
        </svg>
      ),
    },
  ];

  return (
    <div className="font-sans bg-slate-50 text-slate-800 min-h-screen">
      {/* Sticky Header */}
      <Navbar />

      <main>
        {/* Hero Section */}
        <section
          ref={heroRef}
          className="relative py-32 px-6 text-center bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-900 overflow-hidden"
        >
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-10 w-32 h-32 bg-emerald-400 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-40 h-40 bg-green-400 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-emerald-300 rounded-full blur-3xl animate-pulse delay-500"></div>
          </div>
          
          {/* Geometric Shapes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <svg className="absolute top-10 right-20 w-16 h-16 text-emerald-400/20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
            </svg>
            <svg className="absolute bottom-20 left-20 w-12 h-12 text-green-400/20" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>

          <div className="relative z-10 max-w-5xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold font-[Poppins] text-white mb-6 tracking-tight">
              Get In Touch
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-emerald-400 to-green-400 mx-auto mb-8"></div>
            <p className="text-xl md:text-2xl text-emerald-100 max-w-4xl mx-auto leading-relaxed font-light">
              Ready to start a conversation? Whether you have questions, ideas, or just want to connect, 
              we're here to listen and help bring your vision to life.
            </p>
          </div>
        </section>

        {/* Contact Methods */}
        <section className="py-20 px-6 bg-gradient-to-b from-slate-50 to-emerald-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold font-[Poppins] text-emerald-900 mb-4">
                Connect With Us
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Choose your preferred way to reach out. We're active across all platforms and respond quickly.
              </p>
            </div>
            
            <div className="flex justify-center flex-wrap gap-8">
              {contactItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  target="_blank"
                  aria-label={`Contact via ${item.label}`}
                  ref={(el) => (cardsRef.current[index] = el)}
                >
                  <div className="group bg-gradient-to-br from-emerald-800 to-green-800 p-8 rounded-2xl shadow-2xl flex items-center gap-6 w-80 hover:from-emerald-700 hover:to-green-700 transition-all duration-500 transform hover:scale-105 hover:shadow-3xl border border-emerald-700/50 backdrop-blur-sm">
                    <div className="text-emerald-100 group-hover:scale-110 transition-transform duration-300">
                      {item.icon}
                    </div>
                    <div>
                      <span className="text-xl font-semibold text-white block">{item.label}</span>
                      <span className="text-emerald-200 text-sm">Click to connect</span>
                    </div>
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section
          ref={formRef}
          className="py-20 px-6 bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-900 relative overflow-hidden"
        >
          {/* Background Elements */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="w-full h-full" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat'
              }}>
              </div>
            </div>
          </div>
          
          <div className="max-w-4xl mx-auto relative z-10">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-emerald-200/50">
              <div className="text-center mb-10">
                <h2 className="text-4xl md:text-5xl font-bold font-[Poppins] text-emerald-900 mb-4">
                  Send Us a Message
                </h2>
                <p className="text-lg text-slate-600">
                  Fill out the form below and we'll get back to you within 24 hours.
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-8" noValidate>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="relative group">
                    <label htmlFor="name" className="block text-sm font-semibold text-emerald-800 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      className={`w-full px-6 py-4 bg-slate-50 border-2 ${
                        errors.name ? "border-red-400" : "border-emerald-200"
                      } rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 transition-all duration-300 placeholder-slate-400`}
                      aria-label="Your name"
                      required
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-2 font-medium">{errors.name}</p>}
                  </div>
                  
                  <div className="relative group">
                    <label htmlFor="email" className="block text-sm font-semibold text-emerald-800 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email address"
                      className={`w-full px-6 py-4 bg-slate-50 border-2 ${
                        errors.email ? "border-red-400" : "border-emerald-200"
                      } rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 transition-all duration-300 placeholder-slate-400`}
                      aria-label="Your email"
                      required
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-2 font-medium">{errors.email}</p>}
                  </div>
                </div>
                
                <div className="relative group">
                  <label htmlFor="message" className="block text-sm font-semibold text-emerald-800 mb-2">
                    Your Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us about your project, questions, or how we can help..."
                    rows={6}
                    className={`w-full px-6 py-4 bg-slate-50 border-2 ${
                      errors.message ? "border-red-400" : "border-emerald-200"
                    } rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 transition-all duration-300 placeholder-slate-400 resize-none`}
                    aria-label="Your message"
                    required
                  />
                  {errors.message && <p className="text-red-500 text-sm mt-2 font-medium">{errors.message}</p>}
                </div>
                
                {status && (
                  <div className={`text-center p-4 rounded-xl ${
                    status.includes("successfully") 
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    <p className="font-medium">{status}</p>
                  </div>
                )}
                
                <div className="text-center pt-4">
                  <button
                    type="submit"
                    className="group relative px-12 py-5 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold font-[Poppins] rounded-2xl shadow-xl hover:from-emerald-500 hover:to-green-500 transition-all duration-300 hover:shadow-2xl focus:ring-4 focus:ring-emerald-500/30 transform hover:scale-105"
                    aria-label="Submit contact form"
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      Send Message
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">AetherCare</h3>
              <p className="text-slate-400">Building connections that matter</p>
            </div>
            
            <div className="flex justify-center space-x-8 mb-6">
              <Link
                href="/about"
                className="text-slate-300 hover:text-emerald-400 transition-colors duration-300 font-medium"
                aria-label="About page"
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-emerald-400 font-medium"
                aria-label="Contact page"
              >
                Contact
              </Link>
              <Link
                href="/privacy"
                className="text-slate-300 hover:text-emerald-400 transition-colors duration-300 font-medium"
                aria-label="Privacy policy"
              >
                Privacy Policy
              </Link>
            </div>
            
            <div className="border-t border-slate-800 pt-6">
              <p className="text-slate-400">
                © {new Date().getFullYear()} AetherCare. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}