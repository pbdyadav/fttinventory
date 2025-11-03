// src/components/StockTable.tsx
import React from "react";

interface Laptop {
  id: number;
  brand: string;
  model: string;
  serial: string;
  status: string;
}

interface StockTableProps {
  laptops: Laptop[];
}

export default function StockTable({ laptops }: StockTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-300">
      <table className="min-w-full border-collapse bg-white text-left text-sm text-gray-600">
        <thead className="bg-gray-100 text-xs uppercase text-gray-500">
          <tr>
            <th className="p-2">ID</th>
            <th className="p-2">Brand</th>
            <th className="p-2">Model</th>
            <th className="p-2">Serial</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {laptops.map((laptop) => (
            <tr key={laptop.id} className="border-t hover:bg-gray-50">
              <td className="p-2">{laptop.id}</td>
              <td className="p-2">{laptop.brand}</td>
              <td className="p-2">{laptop.model}</td>
              <td className="p-2">{laptop.serial}</td>
              <td className="p-2">{laptop.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
