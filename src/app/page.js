'use client'
import Homepage from "@/components/homepage";
import Navbar from "@/components/navbar";
import Image from "next/image";
import About from "./about/page";

export default function Home() {
  return (
    <div>
      <Navbar/>
      <Homepage/>
      <About/>
    </div>
  );
}
