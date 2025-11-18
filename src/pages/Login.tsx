// src/pages/Login.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import FTTLogo from "@/assets/logo.png";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone, role, email")
          .eq("id", data.user.id)
          .single();

        const userData = {
          id: data.user.id,
          email: profile?.email || data.user.email,
          name: profile?.full_name || "Unknown User",
          phone: profile?.phone || "",
          role: profile?.role || "Staff",
        };

        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("user", JSON.stringify(userData));

        toast.success(`Welcome ${userData.name}`);
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error("Login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 rounded-xl shadow-lg bg-white">

        <div className="flex items-center gap-4 mb-6">
          <img src={FTTLogo} alt="FTT Logo" className="w-16 h-16" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              FTT Laptop Inventory
            </h1>
            <p className="text-sm text-gray-500">Login to continue</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            className="border rounded p-3 focus:ring-2 focus:ring-indigo-300 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="border rounded p-3 focus:ring-2 focus:ring-indigo-300 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-gray-500">
          Need help? Contact admin.
        </div>
      </div>
    </div>
  );
}
