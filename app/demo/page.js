'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle,
  Bot,
  ShieldCheck,
  MessageCircle,
  Package,
  ExternalLink,
} from 'lucide-react';
import Logo from '@/components/Logo';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  demoSteps,
  demoRecommendation,
} from '@/data/demo';

const TOTAL = demoSteps.length;

function DemoProgressBar({ step }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
          Step {step} of {TOTAL}
        </span>
        <span className="text-xs font-medium text-brand-600">{demoSteps[step - 1]?.title}</span>
      </div>
      <div className="h-1.5 rounded-full bg-line overflow-hidden">
        <div
          className="h-full rounded-full gradient-brand transition-all duration-500 ease-[var(--ease-out)]"
          style={{ width: `${(step / TOTAL) * 100}%` }}
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={TOTAL}
        />
      </div>
      <div className="flex justify-center gap-2 mt-4" aria-hidden="true">
        {demoSteps.map((s) => (
          <div
            key={s.id}
            className={[
              'h-1.5 rounded-full transition-all duration-300',
              s.id === step ? 'w-6 bg-brand-600' : s.id < step ? 'w-1.5 bg-brand-300' : 'w-1.5 bg-line',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}

function ChatPreviewShell({ children, subtitle = 'Powered by VapePass' }) {
  return (
    <Card className="w-full max-w-sm !p-0 shadow-lg overflow-hidden">
      <div className="px-4 py-3.5 flex items-center gap-3 bg-[#7c3aed]">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <Sparkles size={17} className="text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[15px] text-white tracking-[-0.01em] leading-tight">
            AI Shopping Assistant
          </p>
          <p className="text-[12px] text-purple-200 mt-0.5 leading-tight">{subtitle}</p>
        </div>
      </div>
      <div className="p-5 space-y-3 bg-white">{children}</div>
    </Card>
  );
}

function BotBubble({ children }) {
  return (
    <div className="rounded-2xl rounded-tl-md bg-canvas border border-line px-4 py-3 text-sm text-body leading-relaxed">
      {children}
    </div>
  );
}

function UserBubble({ children }) {
  return (
    <div className="rounded-2xl rounded-tr-md bg-brand-50 border border-brand-100 px-4 py-3 text-sm text-ink leading-relaxed ml-6">
      {children}
    </div>
  );
}

function FeatureList({ items }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2.5 text-sm text-ink">
          <CheckCircle size={16} className="text-brand-600 flex-shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function StepWelcome() {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-brand shadow-brand mb-6">
        <Sparkles size={28} className="text-white" aria-hidden="true" />
      </div>
      <h2 className="text-3xl sm:text-4xl font-bold text-ink tracking-tight mb-4">
        See how the AI Shopping Assistant works
      </h2>
      <p className="text-body text-lg max-w-lg mx-auto leading-relaxed">
        A quick tour of the customer journey — from opening the chatbot to getting a
        personalized product recommendation from your live inventory.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 text-left">
        {[
          { icon: Bot, label: 'Guided chat', desc: 'Customers answer a few simple questions' },
          { icon: ShieldCheck, label: 'Age-gated', desc: 'Verification before any product talk' },
          { icon: Package, label: 'Real inventory', desc: 'Recommendations from your store only' },
        ].map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="flex items-start gap-3 p-4 rounded-xl bg-brand-50/60 border border-brand-100"
          >
            <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
              <Icon size={18} className="text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{label}</p>
              <p className="text-xs text-body mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepOpenAssistant() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-4">
          Customers open the AI Shopping Assistant
        </h2>
        <p className="text-body leading-relaxed mb-6">
          On your store website, shoppers tap the assistant icon in the corner. A friendly
          invite appears first — then the chat opens so they can find the right product
          without digging through your full catalog.
        </p>
        <FeatureList
          items={[
            'Embeds on your authorized store domain',
            'Always available in the corner of the page',
            'No app download required',
          ]}
        />
      </div>

      <div className="relative flex justify-center">
        <div
          className="absolute inset-0 gradient-brand rounded-3xl blur-3xl opacity-15 scale-110"
          aria-hidden="true"
        />
        <div className="relative flex flex-col items-end gap-3 w-full max-w-xs">
          <div className="w-full rounded-2xl bg-white border border-line shadow-lg px-4 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#7c3aed] flex items-center justify-center flex-shrink-0">
              <Sparkles size={15} className="text-white" aria-hidden="true" />
            </div>
            <p className="text-sm text-ink font-medium leading-snug">
              Feeling overwhelmed by all the flavors? Let me help you find the perfect one 👀
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-[#7c3aed] shadow-brand flex items-center justify-center">
            <Sparkles size={22} className="text-white" aria-hidden="true" />
          </div>
          <p className="w-full text-center text-xs text-muted mt-1 flex items-center justify-center gap-1.5">
            <MessageCircle size={12} aria-hidden="true" /> Tap to start chatting
          </p>
        </div>
      </div>
    </div>
  );
}

function StepAgeVerify() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
      <div className="order-2 lg:order-1 flex justify-center">
        <ChatPreviewShell subtitle="Compliance first">
          <BotBubble>
            Before we get started — are you of legal age to purchase vape products in your region?
          </BotBubble>
          <div className="flex gap-2 pt-1">
            <span className="flex-1 h-10 rounded-full bg-[#7c3aed] text-white text-sm font-semibold flex items-center justify-center">
              Yes, I am
            </span>
            <span className="flex-1 h-10 rounded-full border border-line text-ink text-sm font-semibold flex items-center justify-center bg-white">
              No
            </span>
          </div>
          <p className="text-[11px] text-muted text-center pt-1">
            Age gate runs before any product recommendations.
          </p>
        </ChatPreviewShell>
      </div>
      <div className="order-1 lg:order-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-4">
          Age verification comes first
        </h2>
        <p className="text-body leading-relaxed mb-6">
          Every session starts with a clear age check. Until the customer confirms they meet
          the legal age for their region, the assistant will not discuss products or make
          recommendations.
        </p>
        <FeatureList
          items={[
            'Built-in age gate on every chat session',
            'Region-aware legal age messaging',
            'Blocks underage access to product talk',
          ]}
        />
      </div>
    </div>
  );
}

function StepCategory() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-4">
          Customers pick a product category
        </h2>
        <p className="text-body leading-relaxed mb-6">
          After age verification, the assistant asks what they&apos;re shopping for —
          disposables, pods, e-liquid, or another category available in your catalog —
          so recommendations stay relevant from the start.
        </p>
        <FeatureList
          items={[
            'Guided choices instead of a blank search box',
            'Categories pulled from your synced inventory',
            'Keeps the conversation focused and fast',
          ]}
        />
      </div>

      <div className="flex justify-center">
        <ChatPreviewShell>
          <BotBubble>What are you looking for today?</BotBubble>
          <UserBubble>Disposables</UserBubble>
        </ChatPreviewShell>
      </div>
    </div>
  );
}

function StepPreferences() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
      <div className="order-2 lg:order-1 flex justify-center">
        <ChatPreviewShell>
          <BotBubble>
            Nice — disposables it is. Tell me what you like: flavor style, cooling, nicotine
            level, or a brand you prefer.
          </BotBubble>
          <UserBubble>Something fruity with ice</UserBubble>
        </ChatPreviewShell>
      </div>
      <div className="order-1 lg:order-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-4">
          They share flavor &amp; product preferences
        </h2>
        <p className="text-body leading-relaxed mb-6">
          The assistant gathers the details that matter — flavor family, cooling, brand,
          nicotine preference, and more — so it can match shoppers to products they&apos;ll
          actually enjoy.
        </p>
        <FeatureList
          items={[
            'Flavor, cooling, brand, and more',
            'Natural conversation or quick-tap options',
            'Preferences saved for this shopping session',
          ]}
        />
      </div>
    </div>
  );
}

function StepRecommendation() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-4">
          AI recommends the best match from your inventory
        </h2>
        <p className="text-body leading-relaxed mb-6">
          VapePass analyzes their answers against your live product catalog — never invented
          SKUs — and surfaces the strongest match with clear reasons why it fits.
        </p>
        <FeatureList
          items={[
            'Matched to real in-stock products',
            'Explains why the pick fits their prefs',
            'Shoppers can view the recommended product',
          ]}
        />
      </div>

      <div className="flex justify-center">
        <ChatPreviewShell subtitle="Live inventory match">
          <BotBubble>
            Based on fruity + iced disposables, here&apos;s my top pick from your store:
          </BotBubble>
          <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{demoRecommendation.name}</p>
                <p className="text-xs text-muted mt-0.5">{demoRecommendation.brand}</p>
              </div>
              <span className="text-[11px] font-semibold text-brand-700 bg-white border border-brand-100 px-2 py-1 rounded-full flex-shrink-0">
                {demoRecommendation.match}
              </span>
            </div>
            <ul className="space-y-1.5 mb-3">
              {demoRecommendation.reasons.map((reason) => (
                <li key={reason} className="flex items-start gap-2 text-xs text-body">
                  <CheckCircle size={12} className="text-brand-600 flex-shrink-0 mt-0.5" />
                  {reason}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <span className="flex-1 h-9 rounded-full bg-[#7c3aed] text-white text-xs font-semibold flex items-center justify-center gap-1.5">
                <ExternalLink size={12} aria-hidden="true" /> View product
              </span>
            </div>
          </div>
        </ChatPreviewShell>
      </div>
    </div>
  );
}

function StepCta() {
  return (
    <div className="text-center py-4 sm:py-8">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-brand shadow-brand mb-6">
        <Sparkles size={28} className="text-white" aria-hidden="true" />
      </div>
      <h2 className="text-3xl sm:text-4xl font-bold text-ink tracking-tight mb-4">
        Ready to launch your AI Shopping Assistant?
      </h2>
      <p className="text-body text-lg max-w-lg mx-auto mb-10">
        Create your account, sync your inventory, and embed the assistant on your store —
        so every visitor gets a personalized recommendation in seconds.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button as={Link} href="/register" size="lg">
          Get Started <ArrowRight size={18} />
        </Button>
        <Button as={Link} href="/login" variant="secondary" size="lg">
          Sign In
        </Button>
      </div>
      <p className="text-xs text-muted mt-8">
        <Link href="/" className="text-brand-600 hover:text-brand-700 font-medium">
          ← Back to homepage
        </Link>
      </p>
    </div>
  );
}

const stepComponents = [
  StepWelcome,
  StepOpenAssistant,
  StepAgeVerify,
  StepCategory,
  StepPreferences,
  StepRecommendation,
  StepCta,
];

export default function DemoTour() {
  const [step, setStep] = useState(1);
  const [animKey, setAnimKey] = useState(0);

  const goTo = (next) => {
    setAnimKey((k) => k + 1);
    setStep(next);
  };

  const next = () => goTo(Math.min(step + 1, TOTAL));
  const prev = () => goTo(Math.max(step - 1, 1));

  const StepContent = stepComponents[step - 1];
  const isFirst = step === 1;
  const isLast = step === TOTAL;

  return (
    <div className="min-h-screen gradient-mesh flex flex-col">
      <header className="sticky top-0 z-50 glass border-b border-line/60">
        <nav
          className="container-app flex items-center justify-between h-16 max-w-5xl"
          aria-label="Demo navigation"
        >
          <Logo size={32} showText href="/" />
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-medium text-muted px-3 py-1.5 rounded-full bg-canvas border border-line">
              How it works
            </span>
            <Button as={Link} href="/register" size="sm">
              Get Started
            </Button>
          </div>
        </nav>
      </header>

      <main className="flex-1 container-app max-w-5xl py-8 sm:py-12 flex flex-col">
        <div className="mb-8 sm:mb-10">
          <DemoProgressBar step={step} />
        </div>

        <div
          key={animKey}
          className="flex-1 animate-fade-in"
          role="region"
          aria-label={`Demo step ${step}: ${demoSteps[step - 1]?.title}`}
        >
          <StepContent />
        </div>

        {!isLast && (
          <div className="flex items-center justify-between gap-4 mt-10 sm:mt-12 pt-6 border-t border-line">
            <Button
              variant="secondary"
              onClick={prev}
              disabled={isFirst}
              className={isFirst ? 'invisible' : ''}
            >
              <ArrowLeft size={16} /> Previous
            </Button>
            <Button onClick={next}>
              Next <ArrowRight size={16} />
            </Button>
          </div>
        )}

        {isLast && (
          <div className="flex justify-center mt-6">
            <Button variant="ghost" onClick={prev}>
              <ArrowLeft size={16} /> Back to tour
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
