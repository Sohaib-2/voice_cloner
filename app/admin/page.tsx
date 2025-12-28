"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, Trash2, RefreshCw, Edit2, X, Check, User } from "lucide-react";
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

  // Create user form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPlan, setNewPlan] = useState("pro");
  const [creating, setCreating] = useState(false);

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
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, password: newPassword, plan: newPlan }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowCreateForm(false);
        setNewUsername("");
        setNewPassword("");
        setNewPlan("pro");
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

  const handleLogout = () => {
    document.cookie = "token=; path=/; max-age=0";
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("credits");
    router.push("/login");
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
                    {Object.keys(PLANS).map((plan) => (
                      <option key={plan} value={plan}>
                        {PLANS[plan].name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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
                      </td>
                      <td className="px-6 py-4">
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
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm">{(user.total_audio_duration / 60).toFixed(1)} min</p>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm">{new Date(user.plan_expires_at).toLocaleDateString()}</p>
                          <p className={`text-xs ${daysUntilExpiry <= 7 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                            {daysUntilExpiry} days
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(user)}
                            title="Edit credits"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

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
                    {Object.keys(PLANS).map((plan) => (
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
