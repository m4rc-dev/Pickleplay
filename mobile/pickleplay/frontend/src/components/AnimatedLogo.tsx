"use client";

import Image from "next/image";
import logo from "../images/PicklePlayLogo.jpg";

export default function AnimatedLogo() {
  return (
    <>
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          25% {
            transform: translateY(-15px) scale(1.05);
          }
          50% {
            transform: translateY(-8px) scale(1.02);
          }
          75% {
            transform: translateY(-20px) scale(1.08);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        
        @keyframes rotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        .logo-container {
          animation: float 4s ease-in-out infinite;
        }
        
        .logo-glow {
          animation: pulse 2s ease-in-out infinite;
        }
        
        .logo-rotate {
          animation: rotate 20s linear infinite;
        }
      `}</style>
      
      <section className="w-full py-16 bg-gradient-to-br from-[#0a56a7] to-[#063d7d] relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-400 rounded-full opacity-20 blur-xl"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-white rounded-full opacity-10 blur-2xl"></div>
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-yellow-300 rounded-full opacity-15 blur-lg"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="logo-container relative mb-8">
              {/* Glow effect behind logo */}
              <div className="logo-glow absolute inset-0 bg-yellow-400 rounded-full blur-2xl scale-150 opacity-30"></div>
              
              {/* Rotating ring */}
              <div className="logo-rotate absolute inset-0 border-4 border-yellow-400 rounded-full opacity-50"></div>
              
              {/* Main logo */}
              <div className="relative bg-white rounded-full p-8 shadow-2xl">
                <Image
                  src={logo}
                  alt="PicklePlay Logo"
                  width={200}
                  height={200}
                  className="rounded-full"
                />
              </div>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              PicklePlay
            </h2>
            <p className="text-xl text-yellow-300 mb-8 max-w-2xl">
              Your Ultimate Pickleball Experience
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3 text-white">
                <span className="font-semibold">🏓</span> Professional Courts
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3 text-white">
                <span className="font-semibold">👥</span> Community Driven
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3 text-white">
                <span className="font-semibold">🎯</span> Skill Development
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
