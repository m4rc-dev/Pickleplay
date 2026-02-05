import Image from "next/image";
import { Facebook } from "lucide-react";

export default function Footer() {
  return (
    <footer className="text-white py-12 bg-[#0a56a7]" id="contact">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <Image
              src="https://pickleplay.ph/logo.jpg"
              alt="PicklePlay Logo"
              width={120}
              height={120}
              className="rounded-full mb-4"
            />
            <p className="text-white/80 text-sm">Find courts. Play pickleball. Build community.</p>
          </div>

          <div>
            <h4 className="font-bold mb-4">FIND</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <a href="#" className="hover:text-yellow-300 transition">
                  Find Courts
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-yellow-300 transition">
                  Map Search
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-yellow-300 transition">
                  Shop
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">LINKS</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <a href="#" className="hover:text-yellow-300 transition">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-yellow-300 transition">
                  Events
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-yellow-300 transition">
                  News
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li>Cebu City, Philippines</li>
              <li>0919 990 9642</li>
              <li>
                <a
                  href="https://www.facebook.com/pickleplayofficial/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-yellow-300 transition inline-flex items-center gap-2"
                >
                  <Facebook className="w-5 h-5" />
                  Facebook
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/20 pt-8 text-center text-sm text-white/80">
          <p>© 2025 PicklePlay. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
