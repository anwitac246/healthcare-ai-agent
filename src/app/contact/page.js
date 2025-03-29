import Navbar from "@/components/navbar";
import Link from "next/link";
import React from "react";

export default function Contact() {
  return (
    <div className="my-20">
        <Navbar />
    
    <div className="min-h-screen flex flex-col items-center">
      

      <div className="max-w-3xl text-center py-12 px-4">
        <h1 className="text-green-600 text-4xl font-mono font-bold">Contact Us</h1>
        <p className="text-gray-500 mt-4 text-lg">
          Have questions, feedback, or just want to say hello?  
          We'd love to hear from you! Whether you need assistance, want to collaborate, or have an idea to share, our team is here to help.  
          Drop us a message, and we'll get back to you as soon as possible.
        </p>
      </div>

      <div className="flex justify-center space-x-6 mt-8">
        {[
          {
            href: "https://www.instagram.com/anwitac.795?igsh=YmdueHZuYTd3NHlq",
            label: "Instagram",
            icon: (
              <path d="M2.5 12C2.5 7.5 2.5 5.3 3.9 3.9C5.3 2.5 7.5 2.5 12 2.5C16.5 2.5 18.7 2.5 20.1 3.9C21.5 5.3 21.5 7.5 21.5 12C21.5 16.5 21.5 18.7 20.1 20.1C18.7 21.5 16.5 21.5 12 21.5C7.5 21.5 5.3 21.5 3.9 20.1C2.5 18.7 2.5 16.5 2.5 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            ),
          },
          {
            href: "https://x.com/ThisisAnwita_C?t=kMJla6JC-R1FMdeYSTE9Sw&s=08",
            label: "Twitter",
            icon: (
              <path d="M3 21L10.5 13.5M21 3L13.5 10.5M13.5 10.5L8 3H3L10.5 13.5M13.5 10.5L21 21H16L10.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            ),
          },
          {
            href: "mailto:diyachakra.369@gmail.com",
            label: "Email",
            icon: (
              <path d="M2 6L8.9 9.9C11.5 11.4 12.5 11.4 15.1 9.9L22 6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            ),
          },
        ].map((item, index) => (
          <Link key={index} href={item.href} target="_blank" aria-label={item.label}>
            <div className="p-3 bg-white rounded-full shadow-md hover:bg-green-600 transition duration-300 cursor-pointer flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={32} height={32} className="hover:text-white">
                {item.icon}
              </svg>
            </div>
          </Link>
        ))}
      </div>

      <div className="text-center mt-10 text-gray-600 text-sm">
        © {new Date().getFullYear()} AetherCare. All rights reserved.
      </div>
    </div>
    </div>
  );
}
