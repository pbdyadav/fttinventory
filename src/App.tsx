// src/App.tsx
import React, { useEffect, useState } from "react";
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

// 🚫 Protect Routes
function PrivateRoute({ children }: { children: JSX.Element }) {
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const user = localStorage.getItem("user");

  return isLoggedIn && user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("isLoggedIn") === "true"
  );

  // ✅ Correct useEffect (NO nesting)
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("user", JSON.stringify(data.session.user));
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("user");
        setIsLoggedIn(false);
      }
    };

    checkSession();

    // 🔄 Listen for session changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          // Logged in
          localStorage.setItem("isLoggedIn", "true");
          localStorage.setItem("user", JSON.stringify(session.user));
          setIsLoggedIn(true);
        } else {
          // 🔴 Session revoked, expired, or logged in from another device
          localStorage.removeItem("isLoggedIn");
          localStorage.removeItem("user");
          setIsLoggedIn(false);
          window.location.href = "/login";
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* 🟢 Auto Logout After 15 Minutes */}
      <AutoLogout timeout={15 * 60 * 1000} />

      {isLoggedIn && <Navbar />}

      <main className="p-4">
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/laptop-test" element={<PrivateRoute><LaptopTest /></PrivateRoute>} />
          <Route path="/laptop-inventory" element={<PrivateRoute><LaptopInventory /></PrivateRoute>} />
          <Route path="/laptops/:id" element={<PrivateRoute><LaptopDetail /></PrivateRoute>} />
          <Route path="/transfer" element={<PrivateRoute><Transfer /></PrivateRoute>} />
          <Route path="/transfer/:id" element={<PrivateRoute><Transfer /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
          <Route path="/edit-report/:id" element={<PrivateRoute><EditReport /></PrivateRoute>} />

          {/* Default */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
