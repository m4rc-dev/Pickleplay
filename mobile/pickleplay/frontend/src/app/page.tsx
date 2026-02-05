"use client";

import { useEffect } from "react";
import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import ExperienceSection from "@/components/ExperienceSection";
import CourtsSection from "@/components/CourtsSection";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";

export default function Home() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <HeroCarousel />
      <ExperienceSection />
      <CourtsSection />
      <FeaturesSection />
      <Footer />
    </div>
  );
}
