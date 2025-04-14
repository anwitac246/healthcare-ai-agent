
"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Navbar from "@/components/navbar";

// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

export default function Contact() {
  // GSAP refs for animations
  const heroRef = useRef(null);
  const cardsRef = useRef([]);
  const formRef = useRef(null);
  const statusRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState(null); // null, 'success', 'error'
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    // Status message animation: fade-in on change
    if (status) {
      gsap.fromTo(
        statusRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }
      );
    }

    // Cleanup ScrollTriggers on unmount
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [status]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) return "Name is required.";
    if (!formData.email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      return "Invalid email format.";
    if (!formData.message.trim()) return "Message is required.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    const error = validateForm();
    if (error) {
      setStatus({ type: "error", message: error });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setStatus({ type: "success", message: "Message sent successfully!" });
        setFormData({ name: "", email: "", message: "" });
      } else {
        const data = await response.json();
        setStatus({ type: "error", message: data.error || "Failed to send message." });
      }
    } catch (err) {
      setStatus({ type: "error", message: "An error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactItems = [
    {
      href: "https://www.instagram.com/anwitac.795?igsh=YmdueHZuYTd3NHlq",
      label: "Instagram",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width={24}
          height={24}
          stroke="#F5F5F5"
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
          width={24}
          height={24}
          stroke="#F5F5F5"
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
          width={24}
          height={24}
          stroke="#F5F5F5"
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
    <div className="font-sans bg-[#F5F5F5] text-[#64A65F]">
      <Navbar />
      <main>
        {/* Hero Section */}
        <section
          ref={heroRef}
          className="relative py-24 px-6 text-center bg-gradient-to-b from-[#A8D5A2]/20 to-[#F5F5F5] overflow-hidden"
        >
          <div className="absolute inset-0 z-0">
            <svg
              className="w-full h-full opacity-10"
              viewBox="0 0 1440 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#A8D5A2"
                d="M0,160L80,186.7C160,213,320,267,480,266.7C640,267,800,213,960,186.7C1120,160,1280,160,1360,160L1440,160L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
              />
            </svg>
          </div>
          <div className="relative z-10 max-w-5xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold font-[Poppins] text-[#64A65F]">
              Contact Us
            </h1>
            <p className="mt-6 text-base md:text-lg text-[#4B8C47] max-w-3xl mx-auto leading-relaxed">
              Have questions, feedback, or just want to say hello? We’d love to hear from you! Whether
              you need assistance, want to collaborate, or have an idea to share, our team is here to
              help.
            </p>
          </div>
        </section>

        {/* Contact Methods */}
        <section className="py-16 px-6 max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold font-[Poppins] text-center text-[#64A65F] mb-12">
            Connect With Us
          </h2>
          <div className="flex justify-center flex-wrap gap-6">
            {contactItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                target="_blank"
                aria-label={`Contact via ${item.label}`}
                ref={(el) => (cardsRef.current[index] = el)}
              >
                <div className="bg-[#64A65F] p-6 rounded-xl shadow-lg flex items-center gap-4 w-64 hover:bg-[#4B8C47] transition-all duration-300 transform hover:scale-105 hover:shadow-xl">
                  <div className="text-[#F5F5F5]">{item.icon}</div>
                  <span className="text-base font-semibold text-[#F5F5F5]">{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Contact Form */}
        <section
          ref={formRef}
          className="py-16 px-6 bg-gradient-to-t from-[#A8D5A2]/20 to-[#F5F5F5]"
        >
          <div className="max-w-3xl mx-auto bg-[#F5F5F5] rounded-2xl shadow-xl p-8 border border-[#A8D5A2]/50">
            <h2 className="text-2xl md:text-3xl font-bold font-[Poppins] text-center text-[#64A65F] mb-8">
              Send Us a Message
            </h2>
            {status && (
              <div
                ref={statusRef}
                className={`text-center mb-6 p-4 rounded-lg ${
                  status.type === "success"
                    ? "bg-green-100 text-[#64A65F]"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {status.message}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Your Name"
                  className="w-full px-4 py-3 bg-[#F5F5F5] border border-[#A8D5A2] rounded-lg focus:ring-2 focus:ring-[#4B8C47] focus:border-transparent text-[#64A65F] transition-all"
                  aria-label="Your name"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Your Email"
                  className="w-full px-4 py-3 bg-[#F5F5F5] border border-[#A8D5A2] rounded-lg focus:ring-2 focus:ring-[#4B8C47] focus:border-transparent text-[#64A65F] transition-all"
                  aria-label="Your email"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="relative">
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Your Message"
                  rows={5}
                  className="w-full px-4 py-3 bg-[#F5F5F5] border border-[#A8D5A2] rounded-lg focus:ring-2 focus:ring-[#4B8C47] focus:border-transparent text-[#64A65F] transition-all"
                  aria-label="Your message"
                  required
                  disabled={isSubmitting}
                ></textarea>
              </div>
              <div className="text-center">
                <button
                  type="submit"
                  className="px-8 py-4 bg-[#64A65F] text-[#F5F5F5] font-semibold font-[Poppins] rounded-full shadow-lg hover:bg-[#4B8C47] transition-all hover:shadow-xl focus:ring-2 focus:ring-[#4B8C47] disabled:bg-[#A8D5A2] disabled:cursor-not-allowed"
                  aria-label="Submit contact form"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#64A65F] text-[#F5F5F5] py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-base">
            © {new Date().getFullYear()} AetherCare. All rights reserved.
          </p>
          <div className="mt-4 space-x-4">
            <Link
              href="/about"
              className="text-[#F5F5F5] hover:text-[#A8D5A2] transition"
              aria-label="About page"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-[#F5F5F5] hover:text-[#A8D5A2] transition"
              aria-label="Contact page"
            >
              Contact
            </Link>
            <Link
              href="/privacy"
              className="text-[#F5F5F5] hover:text-[#A8D5A2] transition"
              aria-label="Privacy policy"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
