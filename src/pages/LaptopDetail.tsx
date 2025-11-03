// src/pages/LaptopDetail.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

interface Laptop {
  id: string;
  mashincode: number;
  model: string;
  serial_no: string;
  os: string;
  gen: string;
  cpu: string;
  ram: string;
  ssd: string;
  hdd: string;
  condition: string;
  location: string;
  purchase_date: string;
  remarks: string;
}

export default function LaptopDetail() {
  const { id } = useParams();
  const [laptop, setLaptop] = useState<Laptop | null>(null);

  useEffect(() => {
    const fetchLaptop = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from("laptops")
        .select("*")
        .eq("id", id)
        .single();

      if (error) console.error(error);
      else setLaptop(data);
    };
    fetchLaptop();
  }, [id]);

  if (!laptop)
    return <p className="p-4 text-gray-600">Loading laptop details...</p>;

  return (
    <div className="max-w-3xl mx-auto mt-6 bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-semibold mb-4">
        {laptop.model} ({laptop.serial_no})
      </h1>
      <div className="grid grid-cols-2 gap-4 text-gray-700">
        <p><strong>Mashin Code:</strong> {laptop.mashincode}</p>
        <p><strong>OS:</strong> {laptop.os}</p>
        <p><strong>CPU:</strong> {laptop.cpu}</p>
        <p><strong>Generation:</strong> {laptop.gen}</p>
        <p><strong>RAM:</strong> {laptop.ram}</p>
        <p><strong>SSD:</strong> {laptop.ssd}</p>
        <p><strong>HDD:</strong> {laptop.hdd}</p>
        <p><strong>Condition:</strong> {laptop.condition}</p>
        <p><strong>Location:</strong> {laptop.location}</p>
        <p><strong>Purchase Date:</strong> {laptop.purchase_date}</p>
        <p className="col-span-2"><strong>Remarks:</strong> {laptop.remarks}</p>
      </div>
    </div>
  );
}
