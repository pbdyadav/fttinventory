// src/components/Navbar.tsx
import { Link, useNavigate } from "react-router-dom";
import FTTLogo from "@/assets/logo.png";

export default function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <nav className="flex items-center justify-between bg-gray-900 text-white p-4 shadow">
      {/* Left Section: Logo + Title */}
      <div className="flex items-center gap-3">
        <img src={FTTLogo} alt="FTT" className="w-9 h-9" />
        <span className="text-xl font-semibold">FTT Laptop Inventory</span>
      </div>

      {/* Right Section: Menu */}
      <div className="flex gap-5 items-center">
        <Link to="/dashboard" className="hover:text-gray-400">Dashboard</Link>
        <Link to="/laptop-test" className="hover:text-gray-400">Laptop Test</Link>
        <Link to="/laptop-inventory" className="hover:text-gray-400">Laptop Inventory</Link>
        <Link to="/reports" className="hover:text-gray-400">Reports</Link>

        <span className="text-gray-300 text-sm">
          {user.name ? `${user.name} (${user.role || "User"})` : ""}
        </span>

        <button
          onClick={handleLogout}
          className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
