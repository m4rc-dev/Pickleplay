"use client";

import { Zap, Users, Trophy, Clock } from "lucide-react";
import AnimatedContent from "../animate/AnimatedContent";

const features = [
  {
    icon: Zap,
    title: "Quick Matching",
    description: "Find available courts and players instantly",
  },
  {
    icon: Users,
    title: "Community",
    description: "Connect with local pickleball enthusiasts",
  },
  {
    icon: Trophy,
    title: "Tournaments",
    description: "Participate in organized competitions",
  },
  {
    icon: Clock,
    title: "Real-time Updates",
    description: "Get live court availability and scores",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-16 md:py-24 bg-blue-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#0a56a7]">Why Choose PicklePlay?</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, idx) => {
            const IconComponent = feature.icon;
            return (
              <AnimatedContent
                key={idx}
                distance={100}
                direction="vertical"
                duration={0.8}
                ease="power3.out"
                initialOpacity={0}
                animateOpacity
                scale={1}
                threshold={0.1}
                delay={idx * 0.15}
              >
                <div className="group bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-out cursor-pointer">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-[#0a56a7] text-white rounded-full group-hover:bg-[#a3ff01] group-hover:text-[#0a56a7] group-hover:scale-125 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                      <IconComponent className="w-8 h-8 group-hover:rotate-12 transition-transform duration-300" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-center text-gray-900 group-hover:text-[#0a56a7] transition-colors duration-200">{feature.title}</h3>
                  <p className="text-gray-600 text-center group-hover:text-gray-700 transition-colors duration-200">{feature.description}</p>
                </div>
              </AnimatedContent>
            );
          })}
        </div>
      </div>
    </section>
  );
}
