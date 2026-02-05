import Image from "next/image";
import { MapPin, Clock, Award, Users } from "lucide-react";

interface CourtCardProps {
  name: string;
  location: string;
  distance: string;
  courts: number;
  players: number;
  image: string;
}

export default function CourtCard({
  name,
  location,
  distance,
  courts,
  players,
  image,
}: CourtCardProps) {
  return (
    <div className="group bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-out cursor-pointer">
      <div className="relative h-40 md:h-48 bg-gray-200 overflow-hidden">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300"></div>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-[#0a56a7] transition-colors duration-200">{name}</h3>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 text-gray-500 group-hover:text-gray-700 transition-colors duration-200">
            <MapPin className="w-4 h-4 group-hover:scale-125 transition-transform duration-200" />
            <span className="text-sm">{location}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-500 group-hover:text-gray-700 transition-colors duration-200">
            <Clock className="w-4 h-4 group-hover:scale-125 transition-transform duration-200" />
            <span className="text-sm">{distance} away</span>
          </div>

          <div className="flex gap-4 pt-2">
            <div className="flex items-center gap-1">
              <Award className="w-4 h-4 text-[#0a56a7] group-hover:scale-125 transition-transform duration-200" />
              <span className="text-sm font-semibold text-gray-700">{courts} Courts</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-orange-500 group-hover:scale-125 transition-transform duration-200" />
              <span className="text-sm font-semibold text-gray-700">{players} Players</span>
            </div>
          </div>
        </div>

        <button className="w-full bg-[#0a56a7] text-white py-2 rounded-lg font-semibold hover:bg-[#0a56a7] hover:bg-[#a3ff01] hover:shadow-lg hover:text-[#0a56a7]  hover:scale-105 active:scale-95 transition-all duration-200">
          View Details
        </button>
      </div>
    </div>
  );
}
