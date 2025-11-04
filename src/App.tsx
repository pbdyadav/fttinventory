// src/App.tsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Toaster } from "sonner";

// ✅ Page Imports
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import LaptopTest from "@/pages/LaptopTest";
import LaptopInventory from "@/pages/LaptopInventory";
import LaptopDetail from "@/pages/LaptopDetail";
import Transfer from "@/pages/InventoryTransfer";
import Returns from "@/pages/Returns";
import Reports from "@/pages/Reports";
import EditReport from "@/pages/EditReport";
// import Settings from "@/pages/Settings";

import Navbar from "@/components/Navbar";

// ✅ Protected Route Wrapper
function PrivateRoute({ children }: { children: JSX.Element }) {
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("isLoggedIn") === "true"
  );

  useEffect(() => {
    // 🟢 Check Supabase session on load
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("user", JSON.stringify(data.session.user));
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem("isLoggedIn");
        setIsLoggedIn(false);
      }
    };

    checkSession();

    // 🟢 Listen for login/logout state changes
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("user", JSON.stringify(session.user));
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("user");
        setIsLoggedIn(false);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      {isLoggedIn && <Navbar />}
      <main className="p-4">
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/laptop-test" element={<PrivateRoute><LaptopTest /></PrivateRoute>} />
          <Route path="/laptop-inventory" element={<PrivateRoute><LaptopInventory /></PrivateRoute>} />
          <Route path="/laptops/:id" element={<PrivateRoute><LaptopDetail /></PrivateRoute>} />
          <Route path="/transfer" element={<PrivateRoute><Transfer /></PrivateRoute>} />
          <Route path="/transfer/:id" element={<PrivateRoute><Transfer /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
          <Route path="/edit-report/:id" element={<PrivateRoute><EditReport /></PrivateRoute>} />
          {/* <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} /> */}

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
