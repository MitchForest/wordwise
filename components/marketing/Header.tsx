'use client';

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export function Header() {
  const [isVisible, setIsVisible] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const featuresSection = document.getElementById('features');
      
      if (featuresSection) {
        const featuresSectionTop = featuresSection.offsetTop;
        
        // Show header when scrolled past features section
        if (currentScrollY >= featuresSectionTop - 100) {
          // Hide when scrolling up, show when scrolling down
          if (currentScrollY < lastScrollY) {
            setIsVisible(false);
          } else {
            setIsVisible(true);
          }
        } else {
          setIsVisible(false);
        }
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.header
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          exit={{ y: -100 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50"
        >
          <div className="px-8 lg:px-16">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-blue-600" />
                <span className="text-xl font-semibold">WordWise</span>
              </div>

              {/* Navigation */}
              <nav className="hidden md:flex items-center gap-8">
                <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Features
                </a>
                <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Pricing
                </a>
                <a href="#faq" className="text-gray-600 hover:text-gray-900 transition-colors">
                  FAQ
                </a>
              </nav>

              {/* CTA */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    const heroSection = document.querySelector('section');
                    heroSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => {
                    const heroSection = document.querySelector('section');
                    heroSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </motion.header>
      )}
    </AnimatePresence>
  );
} 