import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // 🧠 Fixed list of allowed users
  const users = [
    { id: "admin", password: "P@ssw0rd@10", role: "Admin" },
    { id: "Praveen", password: "Praveen12#", role: "Admin" },
    { id: "aditya", password: "Adi@123", role: "Admin" },
    { id: "akash", password: "Akash@123", role: "Staff" },
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = users.find(
      (u) => u.id === userId && u.password === password
    );

    if (foundUser) {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("user", JSON.stringify(foundUser));
      navigate("/dashboard");
    } else {
      setError("Invalid ID or Password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-md rounded-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-4 text-center text-gray-800">
          FTT Laptop Inventory Login
        </h1>
        {error && <p className="text-red-600 text-sm mb-3 text-center">{error}</p>}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="User ID"
            className="border rounded p-2"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="border rounded p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}