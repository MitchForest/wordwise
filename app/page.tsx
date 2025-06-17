import { HeroSection } from '@/components/marketing/HeroSection';
import { FeaturesSection } from '@/components/marketing/FeaturesSection';
import { PricingSection } from '@/components/marketing/PricingSection';
import { FAQSection } from '@/components/marketing/FAQSection';
import { Footer } from '@/components/marketing/Footer';
import { Header } from '@/components/marketing/Header';

export default function HomePage() {
  return (
    <>
      <Header />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <FAQSection />
      <Footer />
    </>
  );
}
