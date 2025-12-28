"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, RefreshCw, Eye, EyeOff } from "lucide-react";
import { PLANS } from "@/lib/types";

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    plan: "starter"
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create user");
        setLoading(false);
        return;
      }

      setSuccess(`User "${formData.username}" created successfully!`);
      setFormData({ username: "", password: "", plan: "starter" });
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Admin Panel
            </h1>
            <p className="text-muted-foreground mt-1">Manage users and database</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={fetchUsers} variant="outline" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Create User Form */}
        {showForm && (
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter username"
                    required
                    minLength={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                      placeholder="Enter password"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Plan</label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(PLANS).map(([key, plan]) => (
                      <option key={key} value={key}>
                        {plan.name} - {(plan.voiceCloningChars / 1000).toFixed(0)}K chars
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={loading}>
                  Create User
                </Button>
                <Button type="button" onClick={() => setShowForm(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-2xl font-semibold">All Users ({users.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Username</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Plan</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">VC Credits</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">TTS Credits</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Expires</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => {
                  const daysLeft = Math.ceil((user.plan_expires_at - Date.now()) / (24 * 60 * 60 * 1000));
                  const isExpired = daysLeft < 0;
                  const isExpiringSoon = daysLeft <= 7 && daysLeft >= 0;

                  return (
                    <tr key={user.id} className="hover:bg-muted/20">
                      <td className="px-6 py-4 font-medium">{user.username}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium">
                          {PLANS[user.current_plan]?.name || user.current_plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          user.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="text-muted-foreground">
                          {user.remaining_voice_cloning_chars?.toLocaleString()} / {user.total_voice_cloning_chars?.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="text-muted-foreground">
                          {user.remaining_tts_chars?.toLocaleString()} / {user.total_tts_chars?.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={
                          isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-500' : 'text-muted-foreground'
                        }>
                          {new Date(user.plan_expires_at).toLocaleDateString()}
                          <div className="text-xs">({daysLeft} days)</div>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
