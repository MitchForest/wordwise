import { AuthForms } from '@/components/auth/AuthForms';

export function HeroSection() {
  return (
    <section className="min-h-screen flex items-center">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
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
          
          {/* Right: Hero Image */}
          <div className="hidden lg:block">
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg p-8 shadow-xl">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="h-64 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 