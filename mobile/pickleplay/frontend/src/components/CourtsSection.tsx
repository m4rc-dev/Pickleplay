"use client";

import CourtCard from "./CourtCard";
import CurvedLoop from "../animate/CurvedLoop";

const courts = [
  {
    name: "Banawa Community Court",
    location: "Banawa, Cebu City",
    distance: "2.3 km",
    courts: 4,
    players: 45,
    image: "https://pickleplay.ph/pickleball-court.jpg",
  },
  {
    name: "Downtown Sports Complex",
    location: "Downtown, Cebu City",
    distance: "4.1 km",
    courts: 6,
    players: 78,
    image: "https://pickleplay.ph/sports-complex.jpg",
  },
  {
    name: "Riverside Recreation Center",
    location: "Riverside, Cebu City",
    distance: "5.8 km",
    courts: 3,
    players: 32,
    image: "https://pickleplay.ph/recreation-center.jpg",
  },
];

export default function CourtsSection() {
  return (
    <section className="py-16 md:py-24 bg-gray-50 relative overflow-hidden">
      {/* Curved Loop Background */}
      <div className="absolute inset-0 -top-10 opacity-20">
        <CurvedLoop 
          marqueeText="PicklePlay     PicklePlay     PicklePlay"
          speed={2}
          curveAmount={400}
          direction="right"
          interactive={false}
          textColor="#0a56a7"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#0a56a7]">
            Court Finder / Location Directory
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Discover pickleball courts near you and connect with your local community
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[#0a56a7]">
          {courts.map((court, idx) => (
            <CourtCard key={idx} {...court} />
          ))}
        </div>
      </div>
    </section>
  );
}
