"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, Trash2, RefreshCw, Edit2, X, Check, User, Eye } from "lucide-react";
import { PLANS } from "@/lib/types";

interface UserWithCredits {
  id: string;
  username: string;
  status: string;
  current_plan: string;
  plan_started_at: number;
  plan_expires_at: number;
  created_at: number;
  role: string;
  total_voice_cloning_chars: number;
  used_voice_cloning_chars: number;
  remaining_voice_cloning_chars: number;
  total_tts_chars: number;
  used_tts_chars: number;
  remaining_tts_chars: number;
  total_audio_duration: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserWithCredits[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithCredits | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Create user form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPlan, setNewPlan] = useState("pro");
  const [creating, setCreating] = useState(false);

  // Custom plan fields
  const [customVoiceCloning, setCustomVoiceCloning] = useState("1000000");
  const [customTts, setCustomTts] = useState("1000000");
  const [customDurationDays, setCustomDurationDays] = useState("30");

  // Edit form
  const [editPlan, setEditPlan] = useState("");
  const [editVoiceCloning, setEditVoiceCloning] = useState("");
  const [editTts, setEditTts] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");

    try {
      const body: any = {
        username: newUsername,
        password: newPassword,
        plan: newPlan
      };

      // If custom plan, include custom credits and duration
      if (newPlan === "custom") {
        body.customCredits = {
          voiceCloning: parseInt(customVoiceCloning),
          tts: parseInt(customTts),
        };
        body.customDurationDays = parseInt(customDurationDays);
      }

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setShowCreateForm(false);
        setNewUsername("");
        setNewPassword("");
        setNewPlan("pro");
        setCustomVoiceCloning("1000000");
        setCustomTts("1000000");
        setCustomDurationDays("30");
        fetchUsers();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This will delete all their data and recordings.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to delete user");
    }
  };

  const handleRenewPlan = async (userId: string, plan: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "renew", plan }),
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to renew plan");
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_status" }),
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to toggle status");
    }
  };

  const handleUpdateCredits = async () => {
    if (!selectedUser) return;

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_credits",
          credits: {
            voiceCloning: parseInt(editVoiceCloning),
            tts: parseInt(editTts),
          },
        }),
      });

      if (res.ok) {
        setShowEditModal(false);
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to update credits");
    }
  };

  const openEditModal = (user: UserWithCredits) => {
    setSelectedUser(user);
    setEditPlan(user.current_plan);
    setEditVoiceCloning(user.total_voice_cloning_chars.toString());
    setEditTts(user.total_tts_chars.toString());
    setShowEditModal(true);
  };

  const openDetailsModal = (user: UserWithCredits) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Admin Panel
            </h1>
            <p className="text-muted-foreground mt-1">Manage users and subscriptions</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => router.push("/")} variant="outline">
              Go to App
            </Button>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Create User Button */}
        <div className="mb-6">
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Create New User
          </Button>
        </div>

        {/* Create User Form */}
        {showCreateForm && (
          <div className="mb-6 bg-card border border-border rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Username</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Plan</label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Object.keys(PLANS).filter(plan => plan !== 'enterprise').map((plan) => (
                      <option key={plan} value={plan}>
                        {PLANS[plan].name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Plan Fields */}
              {newPlan === "custom" && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-purple-500">Custom Plan Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Voice Cloning Credits (chars)</label>
                      <input
                        type="number"
                        value={customVoiceCloning}
                        onChange={(e) => setCustomVoiceCloning(e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                        min="0"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {(parseInt(customVoiceCloning) / 1000).toFixed(0)}k chars
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">TTS Credits (chars)</label>
                      <input
                        type="number"
                        value={customTts}
                        onChange={(e) => setCustomTts(e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                        min="0"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {(parseInt(customTts) / 1000).toFixed(0)}k chars
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Duration (days)</label>
                      <input
                        type="number"
                        value={customDurationDays}
                        onChange={(e) => setCustomDurationDays(e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                        min="1"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Testing: use 1-7 days
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create User"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Plan</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Voice Cloning</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">TTS</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Audio Time</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Expires</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => {
                  const daysUntilExpiry = Math.ceil((user.plan_expires_at - Date.now()) / (24 * 60 * 60 * 1000));
                  const vcPercentage = (user.used_voice_cloning_chars / user.total_voice_cloning_chars) * 100;
                  const ttsPercentage = (user.used_tts_chars / user.total_tts_chars) * 100;

                  return (
                    <tr key={user.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{user.username}</p>
                            {user.role === 'admin' && (
                              <span className="text-xs text-primary">Admin</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.status === "active"
                              ? "bg-green-500/10 text-green-500"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium">{PLANS[user.current_plan]?.name || user.current_plan}</p>
                      </td>
                      <td className="px-6 py-4">
                        {user.role === 'admin' ? (
                          <div className="space-y-1">
                            <div className="text-xs text-primary font-semibold">UNLIMITED</div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Used:</span>
                              <span>{(user.used_voice_cloning_chars / 1000).toFixed(0)}k</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Used:</span>
                              <span>{(user.used_voice_cloning_chars / 1000).toFixed(0)}k</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Remaining:</span>
                              <span className="text-primary">{(user.remaining_voice_cloning_chars / 1000).toFixed(0)}k</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  vcPercentage >= 90 ? 'bg-red-500' : vcPercentage >= 70 ? 'bg-amber-500' : 'bg-primary'
                                }`}
                                style={{ width: `${vcPercentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.role === 'admin' ? (
                          <div className="space-y-1">
                            <div className="text-xs text-purple-500 font-semibold">UNLIMITED</div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Used:</span>
                              <span>{(user.used_tts_chars / 1000).toFixed(0)}k</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Used:</span>
                              <span>{(user.used_tts_chars / 1000).toFixed(0)}k</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Remaining:</span>
                              <span className="text-purple-500">{(user.remaining_tts_chars / 1000).toFixed(0)}k</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  ttsPercentage >= 90 ? 'bg-red-500' : ttsPercentage >= 70 ? 'bg-amber-500' : 'bg-purple-500'
                                }`}
                                style={{ width: `${ttsPercentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm">{(user.total_audio_duration / 60).toFixed(1)} min</p>
                      </td>
                      <td className="px-6 py-4">
                        {user.role === 'admin' ? (
                          <div className="text-xs text-green-500 font-semibold">NEVER</div>
                        ) : (
                          <div>
                            <p className="text-sm">{new Date(user.plan_expires_at).toLocaleDateString()}</p>
                            <p className={`text-xs ${daysUntilExpiry <= 7 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                              {daysUntilExpiry} days
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDetailsModal(user)}
                            title="View user details"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(user)}
                            title="Edit credits"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          {user.role !== 'admin' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRenewPlan(user.id, user.current_plan)}
                                title="Renew plan for 30 days"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleStatus(user.id)}
                                title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                              >
                                {user.status === 'active' ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteUser(user.id, user.username)}
                                title="Delete user"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Details Modal */}
        {showDetailsModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">User Details</h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDetailsModal(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* User Info Section */}
                <div className="bg-muted/30 rounded-xl p-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    User Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Username</p>
                      <p className="font-medium">{selectedUser.username}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">User ID</p>
                      <p className="font-mono text-sm">{selectedUser.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Role</p>
                      <p className="font-medium capitalize">{selectedUser.role}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          selectedUser.status === "active"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {selectedUser.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Created</p>
                      <p className="font-medium">{new Date(selectedUser.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Plan Details Section */}
                <div className="bg-muted/30 rounded-xl p-4">
                  <h3 className="text-lg font-semibold mb-3">Plan Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Plan</p>
                      <p className="font-medium text-primary">{PLANS[selectedUser.current_plan]?.name || selectedUser.current_plan}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Plan Started</p>
                      <p className="font-medium">{new Date(selectedUser.plan_started_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Plan Expires</p>
                      {selectedUser.role === 'admin' ? (
                        <p className="font-medium text-green-500">Never (Admin)</p>
                      ) : (
                        <div>
                          <p className="font-medium">{new Date(selectedUser.plan_expires_at).toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground">
                            ({Math.ceil((selectedUser.plan_expires_at - Date.now()) / (24 * 60 * 60 * 1000))} days remaining)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Voice Cloning Credits */}
                <div className="bg-muted/30 rounded-xl p-4">
                  <h3 className="text-lg font-semibold mb-3">Voice Cloning Credits</h3>
                  {selectedUser.role === 'admin' ? (
                    <div className="space-y-2">
                      <p className="text-primary font-semibold">UNLIMITED ACCESS</p>
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Used</p>
                          <p className="font-medium">{(selectedUser.used_voice_cloning_chars / 1000).toFixed(2)}k characters</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total</p>
                          <p className="font-medium">{(selectedUser.total_voice_cloning_chars / 1000).toFixed(2)}k characters</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Used</p>
                          <p className="font-medium">{(selectedUser.used_voice_cloning_chars / 1000).toFixed(2)}k characters</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Remaining</p>
                          <p className="font-medium text-primary">{(selectedUser.remaining_voice_cloning_chars / 1000).toFixed(2)}k characters</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Usage</span>
                          <span>{((selectedUser.used_voice_cloning_chars / selectedUser.total_voice_cloning_chars) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              (selectedUser.used_voice_cloning_chars / selectedUser.total_voice_cloning_chars) * 100 >= 90
                                ? 'bg-red-500'
                                : (selectedUser.used_voice_cloning_chars / selectedUser.total_voice_cloning_chars) * 100 >= 70
                                ? 'bg-amber-500'
                                : 'bg-primary'
                            }`}
                            style={{ width: `${(selectedUser.used_voice_cloning_chars / selectedUser.total_voice_cloning_chars) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* TTS Credits */}
                <div className="bg-muted/30 rounded-xl p-4">
                  <h3 className="text-lg font-semibold mb-3">Text-to-Speech Credits</h3>
                  {selectedUser.role === 'admin' ? (
                    <div className="space-y-2">
                      <p className="text-purple-500 font-semibold">UNLIMITED ACCESS</p>
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Used</p>
                          <p className="font-medium">{(selectedUser.used_tts_chars / 1000).toFixed(2)}k characters</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total</p>
                          <p className="font-medium">{(selectedUser.total_tts_chars / 1000).toFixed(2)}k characters</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Used</p>
                          <p className="font-medium">{(selectedUser.used_tts_chars / 1000).toFixed(2)}k characters</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Remaining</p>
                          <p className="font-medium text-purple-500">{(selectedUser.remaining_tts_chars / 1000).toFixed(2)}k characters</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Usage</span>
                          <span>{((selectedUser.used_tts_chars / selectedUser.total_tts_chars) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              (selectedUser.used_tts_chars / selectedUser.total_tts_chars) * 100 >= 90
                                ? 'bg-red-500'
                                : (selectedUser.used_tts_chars / selectedUser.total_tts_chars) * 100 >= 70
                                ? 'bg-amber-500'
                                : 'bg-purple-500'
                            }`}
                            style={{ width: `${(selectedUser.used_tts_chars / selectedUser.total_tts_chars) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Audio Usage */}
                <div className="bg-muted/30 rounded-xl p-4">
                  <h3 className="text-lg font-semibold mb-3">Audio Usage</h3>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Audio Duration</p>
                    <p className="font-medium text-lg">{(selectedUser.total_audio_duration / 60).toFixed(2)} minutes</p>
                    <p className="text-xs text-muted-foreground mt-1">({selectedUser.total_audio_duration.toFixed(0)} seconds)</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={() => setShowDetailsModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">Edit User: {selectedUser.username}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Plan</label>
                  <select
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Object.keys(PLANS).filter(plan => plan !== 'enterprise').map((plan) => (
                      <option key={plan} value={plan}>
                        {PLANS[plan].name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Voice Cloning Credits (chars)</label>
                  <input
                    type="number"
                    value={editVoiceCloning}
                    onChange={(e) => setEditVoiceCloning(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">TTS Credits (chars)</label>
                  <input
                    type="number"
                    value={editTts}
                    onChange={(e) => setEditTts(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <Button onClick={handleUpdateCredits}>Save Changes</Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRenewPlan(selectedUser.id, editPlan)}
                  >
                    Renew Plan (30 days)
                  </Button>
                  <Button variant="outline" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
