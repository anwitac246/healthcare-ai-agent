"use client";
import Navbar from "@/components/navbar";
import Link from "next/link";
import React from "react";

export default function Contact() {
  const contactItems = [
    {
      href: "https://www.instagram.com/anwitac.795?igsh=YmdueHZuYTd3NHlq",
      label: "Instagram",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width={36}
          height={36}
          stroke="black"
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
          width={36}
          height={36}
          stroke="black"
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
          width={36}
          height={36}
          stroke="black"
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
    <div className="my-20 font-mono">
      <Navbar />
      <div className="min-h-screen flex flex-col items-center px-4" style={{ backgroundColor: "#F2EFE7" }}>
        <div className="max-w-3xl text-center py-12">
          <h1 className="text-5xl font-bold text-[#006A71] drop-shadow">Contact Us</h1>
          <p className="mt-6 text-lg text-[#48A6A7] leading-relaxed">
            Have questions, feedback, or just want to say hello? We'd love to hear from you! Whether
            you need assistance, want to collaborate, or have an idea to share, our team is here to
            help. Drop us a message, and we'll get back to you as soon as possible.
          </p>
        </div>

        <div className="flex justify-center flex-wrap gap-6 mt-10">
          {contactItems.map((item, index) => (
            <Link key={index} href={item.href} target="_blank" aria-label={item.label}>
              <div
                className="p-4 rounded-full shadow-xl bg-white transition-all duration-300 transform hover:scale-110 hover:bg-[#006A71] group"
              >
                <div className="transition-all duration-300 group-hover:scale-110">
                  {item.icon}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12 text-sm text-[#006A71] tracking-wider">
          © {new Date().getFullYear()} AetherCare. All rights reserved.
        </div>
      </div>
    </div>
  );
}
