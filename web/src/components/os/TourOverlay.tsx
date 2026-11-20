"use client";

import React from "react";
import { useTour, SYSTEM_ONBOARDING_TOUR } from "../../context/TourContext";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Compass,
  CheckCircle2,
  HelpCircle,
  Laptop,
} from "lucide-react";

export const TourOverlay: React.FC = () => {
  const {
    isSystemTourOpen,
    systemTourStep,
    nextSystemTourStep,
    prevSystemTourStep,
    closeSystemTour,
    activeAppTour,
    appTourStep,
    nextAppTourStep,
    prevAppTourStep,
    closeAppTour,
  } = useTour();

  // 1. App Tour Modal
  if (activeAppTour) {
    const step = activeAppTour.steps[appTourStep];
    const totalSteps = activeAppTour.steps.length;
    const isLast = appTourStep === totalSteps - 1;

    return (
      <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg bg-[#0d0e12] border border-[#ff69b4]/40 rounded-2xl shadow-2xl overflow-hidden shadow-[#ff69b4]/10">
          {/* Top Header Glow */}
          <div className="h-1 bg-gradient-to-r from-[#ff69b4] via-[#a855f7] to-[#3b82f6]" />

          {/* Modal Header */}
          <div className="p-6 pb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ff69b4]/10 border border-[#ff69b4]/30 flex items-center justify-center">
                <Compass className="w-5 h-5 text-[#ff69b4]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ff69b4]/15 text-[#ff69b4] border border-[#ff69b4]/30 uppercase tracking-wider font-semibold">
                    {activeAppTour.appName} Tour
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Step {appTourStep + 1} of {totalSteps}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">{step.title}</h3>
              </div>
            </div>

            <button
              onClick={closeAppTour}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close Tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="px-6 py-2 space-y-4">
            {step.tagline && (
              <p className="text-xs font-medium text-[#ff69b4]/90 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {step.tagline}
              </p>
            )}

            <p className="text-xs text-slate-300 leading-relaxed">{step.description}</p>

            {step.highlights && step.highlights.length > 0 && (
              <div className="bg-[#14151b] border border-[#23252f] rounded-xl p-3.5 space-y-2">
                <div className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider font-mono">
                  Key Capabilities
                </div>
                <ul className="space-y-1.5">
                  {step.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#27c93f] flex-shrink-0 mt-0.5" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-6 pt-4 flex items-center justify-between border-t border-[#1f202a] mt-3">
            {/* Dots Indicator */}
            <div className="flex items-center gap-1.5">
              {activeAppTour.steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === appTourStep
                      ? "w-6 bg-[#ff69b4]"
                      : "w-1.5 bg-slate-700 hover:bg-slate-500"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {appTourStep > 0 && (
                <button
                  onClick={prevAppTourStep}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-[#1a1b23] hover:bg-[#232532] border border-[#2e3142] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}

              <button
                onClick={nextAppTourStep}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[#ff69b4] to-[#a855f7] hover:brightness-110 rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isLast ? "Got It!" : "Next"}
                {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. System Onboarding Tour Modal
  if (isSystemTourOpen) {
    const step = SYSTEM_ONBOARDING_TOUR[systemTourStep];
    const totalSteps = SYSTEM_ONBOARDING_TOUR.length;
    const isLast = systemTourStep === totalSteps - 1;

    return (
      <div className="fixed inset-0 z-[99999] bg-black/65 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg bg-[#0b0c10] border border-[#ff69b4]/50 rounded-2xl shadow-2xl overflow-hidden shadow-[#ff69b4]/20">
          {/* Top Gradient Stripe */}
          <div className="h-1.5 bg-gradient-to-r from-[#ff69b4] via-[#c084fc] to-[#38bdf8]" />

          {/* Modal Header */}
          <div className="p-6 pb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#ff69b4]/15 border border-[#ff69b4]/40 flex items-center justify-center shadow-inner">
                <Laptop className="w-5 h-5 text-[#ff69b4]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ff69b4]/20 text-[#ff69b4] border border-[#ff69b4]/30 uppercase tracking-wider font-bold">
                    {step.badge || "System Tour"}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {systemTourStep + 1} / {totalSteps}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1 tracking-tight">{step.title}</h3>
              </div>
            </div>

            <button
              onClick={closeSystemTour}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Skip Tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="px-6 py-2 space-y-4">
            {step.tagline && (
              <p className="text-xs font-semibold text-[#ff69b4] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {step.tagline}
              </p>
            )}

            <p className="text-xs text-slate-300 leading-relaxed">{step.description}</p>

            {step.highlights && step.highlights.length > 0 && (
              <div className="bg-[#12141a] border border-[#212430] rounded-xl p-3.5 space-y-2">
                <div className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider font-mono">
                  Quick Highlights
                </div>
                <ul className="space-y-1.5">
                  {step.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#27c93f] flex-shrink-0 mt-0.5" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-6 pt-4 flex items-center justify-between border-t border-[#1b1d28] mt-4">
            {/* Tour Steps Progress */}
            <div className="flex items-center gap-1.5">
              {SYSTEM_ONBOARDING_TOUR.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === systemTourStep
                      ? "w-7 bg-[#ff69b4]"
                      : "w-1.5 bg-slate-700 hover:bg-slate-500"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={closeSystemTour}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Skip
              </button>

              {systemTourStep > 0 && (
                <button
                  onClick={prevSystemTourStep}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-[#161820] hover:bg-[#202330] border border-[#2a2d3d] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}

              <button
                onClick={nextSystemTourStep}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[#ff69b4] to-[#a855f7] hover:brightness-110 rounded-lg shadow-lg shadow-[#ff69b4]/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isLast ? "Explore MailOps" : "Next"}
                {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
