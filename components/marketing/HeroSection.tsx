import { AuthForms } from '@/components/auth/AuthForms';
import { WordWiseHeroSVG } from '@/components/marketing/WordWiseHeroSVG';

export function HeroSection() {
  return (
    <section className="min-h-screen flex items-center">
      <div className="container mx-auto px-12 lg:px-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left: Auth Forms */}
          <div>
            <h1 className="text-5xl font-bold mb-6">
              Write Better with AI<span className="animate-blink">_</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Write SEO-optimized blog posts with perfect grammar and readability with Wordwise AI.
            </p>
            <AuthForms />
          </div>
          
          {/* Right: Hero SVG Illustration */}
          <div className="hidden lg:block">
            <div className="max-w-2xl mx-auto">
              <WordWiseHeroSVG />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 