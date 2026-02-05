"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import logo from "../images/PicklePlayLogo.jpg"

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className={`sticky top-0 z-40 bg-[#0a56a7] text-white shadow-md transition-all duration-500 ${isScrolled ? "py-1" : "py-2"}`} >
      <div className="max-w-7xl mx-auto px-4 md:px-5 flex items-center justify-between gap-4 relative h-16">
        {/* Logo - Static on mobile, animated on desktop */}
        <div className={`absolute z-40 transition-all duration-500 ease-in-out ${
          // Mobile: static positioning
          "md:absolute left-4 top-1/2 -translate-y-1/2 " +
          // Desktop: animated positioning
          `${isScrolled ? "md:left-2 md:top-1/2 md:-translate-y-1/2" : "md:left-5 md:-bottom-12"}`
        }`}>
          <Image
            alt="PicklePlay Logo"
            width={isScrolled ? 40 : 100}
            height={isScrolled ? 40 : 150}
            src={logo}
            className="rounded-full shadow-2xl transition-all duration-500 ease-in-out"
          />
        </div>

        {/* Desktop Navigation */}
        <nav className={`hidden md:flex gap-8 flex-1 transition-all duration-500 ease-in-out ${isScrolled ? "pl-16" : "pl-40"}`}>
          <a href="#" className="hover:text-yellow-300 transition font-semibold">
            HOME
          </a>
          <a href="#" className="hover:text-yellow-300 transition font-semibold">
            FIND COURTS
          </a>
          <a href="#" className="hover:text-yellow-300 transition font-semibold">
            ABOUT
          </a>
          <a href="#contact" className="hover:text-yellow-300 transition font-semibold">
            CONTACT
          </a>
        </nav>

        {/* Desktop Buttons */}
        <nav className="hidden md:flex gap-4 flex-1 justify-end items-center">
          <button className="px-3 py-2 text-sm border border-transparent text-white rounded-md font-semibold hover:bg-[#a3ff01] hover:text-[#0a56a7] transition cursor-pointer">
            Log in
          </button>
          <button className="px-3 py-2 text-sm border border-transparent text-white rounded-md font-semibold hover:bg-[#a3ff01] hover:text-[#0a56a7] transition cursor-pointer">
            Sign in
          </button>
          <button className="px-3 py-2 text-sm bg-white text-[#0a56a7] rounded-md font-semibold hover:bg-[#a3ff01] transition cursor-pointer">
            Download App
          </button>
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMobileMenu}
          className="md:hidden ml-auto p-2 hover:bg-white/10 rounded-lg transition"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <nav className="md:hidden bg-[#0a56a7] border-t border-white/20 py-4">
          <div className="max-w-7xl mx-auto px-4 flex flex-col gap-4 items-center text-center">
            <a
              href="#"
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-yellow-300 transition font-semibold py-2 w-full"
            >
              HOME
            </a>
            <a
              href="#"
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-yellow-300 transition font-semibold py-2 w-full"
            >
              FIND COURTS
            </a>
            <a
              href="#"
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-yellow-300 transition font-semibold py-2 w-full"
            >
              ABOUT
            </a>
            <a
              href="#contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-yellow-300 transition font-semibold py-2 w-full"
            >
              CONTACT
            </a>
            <hr className="border-white/20 w-full" />
            <button className="w-full px-4 py-2 text-white rounded-md font-semibold hover:bg-white/10 transition">
              Log in
            </button>
            <button className="w-full px-4 py-2 text-white rounded-md font-semibold hover:bg-white/10 transition">
              Sign in
            </button>
            <button className="w-full px-4 py-2 bg-white text-[#0a56a7] rounded-md font-semibold hover:bg-[#a3ff01] transition">
              Download App
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
