import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import LaptopTest from "@/pages/LaptopTest";
import LaptopInventory from "@/pages/LaptopInventory";
import LaptopDetail from "@/pages/LaptopDetail";
import Transfer from "@/pages/InventoryTransfer";
import Returns from "@/pages/Returns";
import Reports from "@/pages/Reports";
import EditReport from "@/pages/EditReport";
{/* import Settings from "@/pages/Settings"; */}

import Navbar from "@/components/Navbar";
import { Toaster } from "sonner";

// ✅ Protect routes if not logged in
function PrivateRoute({ children }: { children: JSX.Element }) {
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const isLoggedIn = localStorage.getItem("isLoggedIn");

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      {isLoggedIn && <Navbar />}
      <main className="p-4">
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={ <PrivateRoute> <Dashboard /> </PrivateRoute> } />
          <Route path="/laptop-test" element={ <PrivateRoute> <LaptopTest /> </PrivateRoute> } />
          <Route path="/laptop-inventory" element={<PrivateRoute><LaptopInventory /></PrivateRoute>} />
          <Route path="/laptops/:id" element={ <PrivateRoute> <LaptopDetail /> </PrivateRoute> } />
          <Route path="/transfer" element={ <PrivateRoute> <Transfer /> </PrivateRoute> } />
          <Route path="/transfer/:id" element={<PrivateRoute><Transfer /></PrivateRoute>} />
          
          <Route path="/reports" element={ <PrivateRoute> <Reports /> </PrivateRoute> } />
          {/* <Route path="/settings" element={ <PrivateRoute> <Settings /> </PrivateRoute> } /> */}
          
          <Route path="/edit-report/:id" element={<EditReport />} />
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
