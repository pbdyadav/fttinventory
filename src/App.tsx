// src/App.tsx
import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Toaster } from "sonner";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import LaptopTest from "@/pages/LaptopTest";
import LaptopInventory from "@/pages/LaptopInventory";
import LaptopDetail from "@/pages/LaptopDetail";
import Transfer from "@/pages/InventoryTransfer";
import Returns from "@/pages/Returns";
import Reports from "@/pages/Reports";
import EditReport from "@/pages/EditReport";

import Navbar from "@/components/Navbar";
import AutoLogout from "@/components/AutoLogout";

// 🔒 NEW Protected Route (uses React state only)
function PrivateRoute({
  children,
  isLoggedIn,
  loading,
}: {
  children: JSX.Element;
  isLoggedIn: boolean;
  loading: boolean;
}) {
  if (loading) return null; // ⛔ don't redirect while loading session

  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 🔥 Load session ONCE on startup
  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data?.session) {
        setIsLoggedIn(true);
        localStorage.setItem("user", JSON.stringify(data.session.user));
      } else {
        setIsLoggedIn(false);
        localStorage.removeItem("user");
      }

      setLoading(false); // 🟢 Now safe to render
    };

    loadSession();

    // 🔄 Auth event listener (NO redirect here)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setIsLoggedIn(true);
          localStorage.setItem("user", JSON.stringify(session.user));
        } else {
          setIsLoggedIn(false);
          localStorage.removeItem("user");
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) {
    // ⛔ Prevent flicker — display static loading screen
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Auto Logout only when logged in */}
      {isLoggedIn && <AutoLogout timeout={15 * 60 * 1000} />}

      {isLoggedIn && <Navbar />}

      <main className="p-4">
        <Routes>
          {/* Public Login */}
          <Route path="/login" element={<Login />} />

          {/* Protected */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute isLoggedIn={isLoggedIn} loading={loading}>
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/laptop-test"
            element={
              <PrivateRoute isLoggedIn={isLoggedIn} loading={loading}>
                <LaptopTest />
              </PrivateRoute>
            }
          />

          <Route
            path="/laptop-inventory"
            element={
              <PrivateRoute isLoggedIn={isLoggedIn} loading={loading}>
                <LaptopInventory />
              </PrivateRoute>
            }
          />

          <Route
            path="/laptops/:id"
            element={
              <PrivateRoute isLoggedIn={isLoggedIn} loading={loading}>
                <LaptopDetail />
              </PrivateRoute>
            }
          />

          <Route
            path="/transfer/:id"
            element={
              <PrivateRoute isLoggedIn={isLoggedIn} loading={loading}>
                <Transfer />
              </PrivateRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <PrivateRoute isLoggedIn={isLoggedIn} loading={loading}>
                <Reports />
              </PrivateRoute>
            }
          />

          <Route
            path="/edit-report/:id"
            element={
              <PrivateRoute isLoggedIn={isLoggedIn} loading={loading}>
                <EditReport />
              </PrivateRoute>
            }
          />

          {/* Default */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
