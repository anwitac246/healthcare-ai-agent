
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
      {/* Sticky Header */}
      <Navbar />

      <main>
        {/* Hero Section */}
        <section
          ref={heroRef}
          className="relative py-24 px-6 text-center bg-gradient-to-b from-[#A8D5A2]/20 to-[#F5F5F5] overflow-hidden"
        >
          {/* Wave Background */}
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
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="relative">
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your Name"
                  className={`w-full px-4 py-3 bg-[#F5F5F5] border ${
                    errors.name ? "border-red-500" : "border-[#A8D5A2]"
                  } rounded-lg focus:ring-2 focus:ring-[#4B8C47] focus:border-transparent text-[#64A65F] transition-all`}
                  aria-label="Your name"
                  required
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Your Email"
                  className={`w-full px-4 py-3 bg-[#F5F5F5] border ${
                    errors.email ? "border-red-500" : "border-[#A8D5A2]"
                  } rounded-lg focus:ring-2 focus:ring-[#4B8C47] focus:border-transparent text-[#64A65F] transition-all`}
                  aria-label="Your email"
                  required
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>
              <div className="relative">
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Your Message"
                  rows={5}
                  className={`w-full px-4 py-3 bg-[#F5F5F5] border ${
                    errors.message ? "border-red-500" : "border-[#A8D5A2]"
                  } rounded-lg focus:ring-2 focus:ring-[#4B8C47] focus:border-transparent text-[#64A65F] transition-all`}
                  aria-label="Your message"
                  required
                />
                {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message}</p>}
              </div>
              {status && (
                <p
                  className={`text-center ${
                    status.includes("successfully") ? "text-[#64A65F]" : "text-red-500"
                  }`}
                >
                  {status}
                </p>
              )}
              <div className="text-center">
                <button
                  type="submit"
                  className="px-8 py-4 bg-[#64A65F] text-[#F5F5F5] font-semibold font-[Poppins] rounded-full shadow-lg hover:bg-[#4B8C47] transition-all hover:shadow-xl focus:ring-2 focus:ring-[#4B8C47]"
                  aria-label="Submit contact form"
                >
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#64A65F] text-[#F5F5F5] py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-base">© {new Date().getFullYear()} AetherCare. All rights reserved.</p>
          <div className="mt-4 space-x-4">
            <Link
              href="/about"
              className="text-[#F5F5F5] hover:text-[#4B8C47] transition"
              aria-label="About page"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-[#F5F5F5] hover:text-[#4B8C47] transition"
              aria-label="Contact page"
            >
              Contact
            </Link>
            <Link
              href="/privacy"
              className="text-[#F5F5F5] hover:text-[#4B8C47] transition"
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
