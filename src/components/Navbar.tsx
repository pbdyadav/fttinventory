import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <nav className="flex items-center justify-between bg-gray-900 text-white p-4">
      <h1 className="text-xl font-semibold">FTT Laptop Inventory</h1>
      <div className="flex gap-4 items-center">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/laptop-test">Laptop Test</Link> {/* ✅ Added correctly */}
        <Link to="/laptop-inventory">Laptop Inventory</Link>
        {/* <Link to="/transfer">Transfers</Link> */}
        <Link to="/reports">Reports</Link>
        {/* <Link to="/settings">Settings</Link>*/}
        
        <span className="text-gray-300 text-sm">({user.role || "User"})</span>
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
