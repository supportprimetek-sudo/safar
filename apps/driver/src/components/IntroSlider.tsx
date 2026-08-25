import React, { useState } from 'react';
import { ArrowRight, Check, DollarSign, Navigation, ShieldCheck, Car } from 'lucide-react';

interface Slide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  imageUrl: string;
  icon: React.ElementType;
}

interface IntroSliderProps {
  onFinish: () => void;
}

export const IntroSlider: React.FC<IntroSliderProps> = ({ onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides: Slide[] = [
    {
      id: 1,
      title: 'High Earnings & Low Commission',
      subtitle: 'Keep 100% Cash & Direct Payments',
      description: 'Earn top rates per kilometer across Moto, Auto, Sedan, & SUV categories with instant settlement tracking.',
      category: 'Driver Earnings',
      imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80',
      icon: DollarSign,
    },
    {
      id: 2,
      title: 'Smart Dispatch Radar',
      subtitle: '15-Second Instant Trip Popups',
      description: 'Receive nearby passenger trip requests automatically with exact pickup distance, destination & fare estimate.',
      category: 'Instant Requests',
      imageUrl: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=800&q=80',
      icon: Navigation,
    },
    {
      id: 3,
      title: 'Verified Partner Portal',
      subtitle: 'Work Your Way with 1-Tap Online Switch',
      description: 'Upload Aadhaar & Licence for fast KYC approval. Go online whenever you want and control your driving schedule.',
      category: 'Flexible Work',
      imageUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80',
      icon: ShieldCheck,
    },
  ];

  const currentSlide = slides[currentIndex];
  const Icon = currentSlide.icon;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      localStorage.setItem('safar_driver_intro_seen', 'true');
      onFinish();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('safar_driver_intro_seen', 'true');
    onFinish();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#11151D] flex flex-col justify-between p-5 pt-[max(2.5rem,env(safe-area-inset-top,36px))] pb-[max(2.25rem,env(safe-area-inset-bottom,28px))] max-w-lg mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex justify-between items-center pt-2 relative z-10">
        <div className="flex items-center space-x-2 bg-[#202631] px-3.5 py-1.5 rounded-full border border-white/10 text-xs font-bold text-[#35D0B0]">
          <Car className="w-4 h-4" />
          <span>SAFAR Driver Partner</span>
        </div>

        <button
          onClick={handleSkip}
          className="text-xs font-extrabold text-[#A8AFBA] hover:text-white px-3 py-1.5 rounded-xl hover:bg-[#202631] transition-all"
        >
          Skip Intro
        </button>
      </div>

      {/* Center Image & Card Carousel */}
      <div className="my-auto space-y-5 relative z-10 py-2">
        {/* Main Slide Image Container */}
        <div className="relative h-64 sm:h-72 w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#151A23]">
          <img
            src={currentSlide.imageUrl}
            alt={currentSlide.title}
            className="w-full h-full object-cover transition-all duration-500 transform scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#11151D] via-[#11151D]/40 to-transparent" />

          <div className="absolute top-4 left-4 bg-[#202631]/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-[#35D0B0] border border-white/10 uppercase flex items-center space-x-1">
            <Icon className="w-3 h-3 mr-1" />
            <span>{currentSlide.category}</span>
          </div>
        </div>

        {/* Slide Content Card */}
        <div className="bg-[#202631] p-5 sm:p-6 rounded-3xl border border-white/10 shadow-2xl space-y-2 text-center">
          <h2 className="text-xl sm:text-2xl font-black text-white">{currentSlide.title}</h2>
          <p className="text-xs font-extrabold text-[#35D0B0] uppercase tracking-wider">{currentSlide.subtitle}</p>
          <p className="text-xs text-[#A8AFBA] leading-relaxed pt-1">{currentSlide.description}</p>
        </div>
      </div>

      {/* Bottom Controls & Indicators */}
      <div className="space-y-4 pb-2 relative z-10">
        {/* Dot Indicators */}
        <div className="flex justify-center items-center space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === currentIndex ? 'w-8 bg-[#35D0B0]' : 'w-2.5 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Action Button */}
        <button
          onClick={handleNext}
          className="w-full py-4 bg-[#35D0B0] hover:brightness-110 active:scale-95 text-[#11151D] font-black text-base rounded-2xl shadow-xl flex items-center justify-center space-x-2 transition-all"
        >
          <span>{currentIndex === slides.length - 1 ? 'Start Driving Now' : 'Next'}</span>
          {currentIndex === slides.length - 1 ? <Check className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};
