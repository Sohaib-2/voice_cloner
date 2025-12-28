"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, User, Calendar, TrendingUp, Clock } from "lucide-react";
import { PLANS } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Load user data from localStorage
    const userData = localStorage.getItem("user");
    const creditsData = localStorage.getItem("credits");

    if (userData && creditsData) {
      setUser(JSON.parse(userData));
      setCredits(JSON.parse(creditsData));
    }

    setLoading(false);
  }, [router]);

  const handleLogout = async () => {
    try {
      // Call backend logout endpoint to clear HTTP-only cookie
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("credits");

    // Use window.location.href for hard redirect (clears all state)
    window.location.href = "/login";
  };

  const goToApp = () => {
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !credits) {
    return null;
  }

  const plan = PLANS[user.plan] || PLANS.starter;
  const isAdmin = user.role === 'admin';
  const daysUntilExpiry = Math.ceil((user.planExpiresAt - Date.now()) / (24 * 60 * 60 * 1000));
  const isPlanExpiringSoon = !isAdmin && daysUntilExpiry <= 7;
  const vcPercentage = (credits.voiceCloning.used / credits.voiceCloning.total) * 100;
  const ttsPercentage = (credits.tts.used / credits.tts.total) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              VoiceForge
            </h1>
            <p className="text-muted-foreground mt-1">Dashboard</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={goToApp} variant="outline">
              Go to App
            </Button>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Plan Expiry Warning */}
        {isPlanExpiringSoon && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              ⚠️ Your plan expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}. Please renew to continue using VoiceForge.
            </p>
          </div>
        )}

        {/* User Info Card */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">{user.username}</h2>
                <p className="text-muted-foreground">
                  {plan.name} • Status: <span className="text-green-500">Active</span>
                  {isAdmin && <span className="text-primary ml-2">(Admin)</span>}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Plan Expires:</span>
              </div>
              {isAdmin ? (
                <p className="text-lg font-semibold text-green-500">NEVER</p>
              ) : (
                <>
                  <p className="text-lg font-semibold">
                    {new Date(user.planExpiresAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {daysUntilExpiry} days remaining
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Credits Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Voice Cloning Credits */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-semibold">Voice Cloning</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Used:</span>
                <span className="font-mono">{credits.voiceCloning.used.toLocaleString()} chars</span>
              </div>
              {isAdmin ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining:</span>
                  <span className="font-mono text-primary font-semibold">UNLIMITED</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className="font-mono text-primary">{credits.voiceCloning.remaining.toLocaleString()} chars</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-mono">{credits.voiceCloning.total.toLocaleString()} chars</span>
                  </div>
                  <div className="mt-4">
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          vcPercentage >= 90 ? 'bg-red-500' : vcPercentage >= 70 ? 'bg-amber-500' : 'bg-primary'
                        }`}
                        style={{ width: `${vcPercentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {vcPercentage.toFixed(1)}% used
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* TTS Credits */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <h3 className="text-xl font-semibold">AI Voice (TTS)</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Used:</span>
                <span className="font-mono">{credits.tts.used.toLocaleString()} chars</span>
              </div>
              {isAdmin ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining:</span>
                  <span className="font-mono text-purple-500 font-semibold">UNLIMITED</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className="font-mono text-purple-500">{credits.tts.remaining.toLocaleString()} chars</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-mono">{credits.tts.total.toLocaleString()} chars</span>
                  </div>
                  <div className="mt-4">
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          ttsPercentage >= 90 ? 'bg-red-500' : ttsPercentage >= 70 ? 'bg-amber-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${ttsPercentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {ttsPercentage.toFixed(1)}% used
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-green-500" />
            <h3 className="text-xl font-semibold">Usage Statistics</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Audio Generated</p>
              <p className="text-2xl font-bold">
                {(credits.totalAudioDuration / 60).toFixed(1)} min
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Characters Used</p>
              <p className="text-2xl font-bold">
                {(credits.voiceCloning.used + credits.tts.used).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
              <p className="text-2xl font-bold">{plan.name}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
