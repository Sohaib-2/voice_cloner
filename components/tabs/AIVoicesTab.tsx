"use client";

import { Sparkles, Loader2 } from "lucide-react";

export default function AIVoicesTab() {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Coming Soon Message */}
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center max-w-md mx-auto">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            AI Voices Coming Soon
          </h2>
          <p className="text-muted-foreground text-lg mb-6">
            We're currently working on bringing you 60+ premium AI voices in 8 languages. This feature will be available very soon!
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            Under Development
          </div>
        </div>
      </div>
    </div>
  );
}
