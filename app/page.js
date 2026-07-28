'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, ChevronRight } from 'lucide-react';
import Logo from '@/components/Logo';
import AnimateIn from '@/components/AnimateIn';
import SommelierPreview from '@/components/SommelierPreview';
import TwoEnginesSection from '@/components/TwoEnginesSection';
import ComplianceShieldSection from '@/components/ComplianceShieldSection';
import SommelierFeatureSection from '@/components/SommelierFeatureSection';
import PricingSection from '@/components/PricingSection';
import LandingChatPromo from '@/components/LandingChatPromo';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header — matches Base44: fixed translucent bar */}
      <AnimateIn as="header" variant="slide-down" immediate className="landing-header">
        <nav className="landing-header-nav" aria-label="Main navigation">
          <Logo showText variant="sparkle" landing />
          <div className="flex items-center gap-3">
            <Link href="/login" className="landing-header-ghost">
              Sign In
            </Link>
            <Link href="/register" className="landing-header-cta">
              Get Started
            </Link>
          </div>
        </nav>
      </AnimateIn>

      {/* Hero */}
      <section className="hero-gradient hero-section-font relative overflow-visible pt-32 pb-24 px-4">
        <div className="relative max-w-4xl w-full mx-auto text-center">
          <AnimateIn variant="slide-up" immediate delay={0}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6 sm:mb-8 bg-white/15 text-violet-100 border border-white/20">
              <Sparkles size={14} className="text-violet-100 flex-shrink-0" aria-hidden="true" />
              The AI-powered vape shop platform
            </div>
          </AnimateIn>

          <AnimateIn variant="slide-up" immediate delay={80}>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6 text-white">
              Your AI Flavor Sommelier
              <br />
              <span className="text-violet-300">Built for vape retail</span>
            </h1>
          </AnimateIn>

          <AnimateIn variant="slide-up" immediate delay={160}>
            <p className="text-lg text-violet-200 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed font-normal">
              Give every customer a personalized flavor recommendation the moment they walk in — compliant by design, powered by AI, and connected to your live inventory.
            </p>
          </AnimateIn>

          <AnimateIn variant="slide-up" immediate delay={240}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-10 sm:mb-12 md:mb-14">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 px-8 h-12 text-base font-bold text-violet-900 bg-white hover:bg-violet-50 rounded-full transition-all duration-200 shadow-xl min-w-[190px]"
              >
                Get Started
                <ArrowRight size={16} strokeWidth={2} className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link
                href="/demo"
                className="group inline-flex items-center justify-center gap-2 text-base font-medium text-violet-200 hover:text-white transition-colors duration-200"
              >
                <Sparkles size={14} aria-hidden="true" />
                See how it works
                <ChevronRight size={16} strokeWidth={2} className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </AnimateIn>

          <AnimateIn variant="slide-up" immediate delay={320} className="relative w-full flex justify-center mx-auto">
            <SommelierPreview />
          </AnimateIn>
        </div>

        {/* Spacer so card extends below fold on purple background */}
        <div className="h-16 sm:h-24 md:h-32" aria-hidden="true" />
      </section>

      <LandingChatPromo />

      <TwoEnginesSection />

      <ComplianceShieldSection />

      <SommelierFeatureSection />

      <PricingSection />

      <div className="gradient-mesh">
        <AnimateIn as="footer" variant="fade-in" className="border-t border-line bg-surface">
          <div className="container-app max-w-7xl py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Logo size={28} showText />
            <p className="text-body text-sm">© 2026 VapePass. All rights reserved.</p>
          </div>
        </AnimateIn>
      </div>
    </div>
  );
}
