"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function ExperienceSection() {
  const [balls, setBalls] = useState<Array<{ id: number; x: number; y: number; delay: number; duration: number; size: number }>>([]);

  useEffect(() => {
    // Generate evenly distributed paddle positions in a grid pattern with varied sizes
    const generatedItems = [];
    const cols = 8; // 8 columns
    const rows = 5; // 5 rows
    const totalItems = cols * rows;
    
    for (let i = 0; i < totalItems; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const size = Math.random() > 0.5 ? 25 : 15; // 50% big (25px), 50% small (15px)
      
      generatedItems.push({
        id: i,
        x: (col / (cols - 1)) * 90 + 5, // Even distribution with 5% margins
        y: (row / (rows - 1)) * 90 + 5, // Even distribution with 5% margins
        delay: Math.random() * 8,
        duration: 3 + Math.random() * 5,
        size,
      });
    }
    setBalls(generatedItems);
  }, []);

  return (
    <>
      <style jsx>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0px) scale(1);
            opacity: 0.2;
          }
          50% {
            transform: translateY(-25px) scale(1.2);
            opacity: 0.5;
          }
        }
        
        .ball-bg {
          position: absolute;
          opacity: 0.2;
          pointer-events: none;
          z-index: 1;
        }
        
        .ball-bg img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
      `}</style>
      
      <section className="w-full py-16 bg-white relative overflow-hidden">
        {/* Bouncing paddles background */}
        {balls.map((item) => (
          <div
            key={item.id}
            className="ball-bg"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              width: `${item.size}px`,
              height: `${item.size}px`,
              animation: `bounce ${item.duration}s ease-in-out ${item.delay}s infinite`,
            }}
          >
            <Image
              src="/images/Paddle.png"
              alt="Background paddle"
              width={item.size}
              height={item.size}
            />
          </div>
        ))}
        
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center gap-10 relative z-10">
          <div className="flex-1 text-left">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#0a56a7]">
              Experience PicklePlay in Action
            </h2>
            <p className="text-gray-700 mb-6">
              PICKLEPLAY — Your New Pickleball Playground. Get ready to serve, volley, and smash
              your way to victory at the heart of Cebu's newest and most thrilling pickleball
              destination.
            </p>
          </div>

          <div className="flex-1 w-full max-w-xl">
            <div className="relative bg-gray-200 rounded-xl overflow-hidden shadow-lg aspect-video">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/banner5-SwAiVYRMsfUCqZMBq1uTm9yK0DsC3F.png"
                alt="PicklePlay Experience"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
