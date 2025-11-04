// src/pages/EditReport.tsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

type LaptopForm = {
  mashincode: number;
  model: string;
  serialNo: string;
  os: string;
  gen: string;
  cpu: string;
  ram: string;
  ssdHdd: string;
  ssdHealth: string;
  touch: string;
  displaysize: string;
  graphiccard: string;
  graphicmodel: string;
  displaydotsA: boolean;
  displaydots: boolean;
  screenlightshadow: boolean;
  displaybrack: boolean;
  screenpatches: boolean;
  keyboardmarks: boolean;
  hingesok: boolean;
  hingesh: boolean;
  hingesl: boolean;
  batteryhealth: string;
  batteryreading: string;
  hdmiport: boolean;
  lanport: boolean;
  wifi: boolean;
  camera: boolean;
  mic: boolean;
  keyboard: boolean;
  keypaint: boolean;
  touchpad: boolean;
  rclick: boolean;
  lclick: boolean;
  rspeaker: boolean;
  lspeaker: boolean;
  ajack: boolean;
  usbpr: boolean;
  usbpw: boolean;
  pcp: boolean;
  Cport: boolean;
  Apanel: string;
  Bpanel: string;
  Cpanel: string;
  Dpanel: string;
  brightness: boolean;
  volume: boolean;
  bt: boolean;
  fpl: boolean;
  bl: boolean;
  sr: boolean;
  driveri: boolean;
  softi: boolean;
  dl: boolean;
  remarks: string;
};

export default function EditReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<LaptopForm>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      const { data, error } = await supabase
        .from("laptop_tests")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        toast.error("Error loading report: " + error.message);
      } else if (data) {
        reset(data);
      }
      setLoading(false);
    };
    fetchReport();
  }, [id, reset]);

  const onSubmit = async (formData: LaptopForm) => {
    try {
      const { error } = await supabase
        .from("laptop_tests")
        .update(formData)
        .eq("id", id);

      if (error) throw error;
      toast.success("✅ Report updated successfully!");
      navigate("/reports");
    } catch (err: any) {
      toast.error("❌ Error updating report: " + err.message);
    }
  };

  if (loading) return <p className="p-6 text-gray-500">Loading report...</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">✏️ Edit Laptop Test Report</h2>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 max-h-[80vh] overflow-y-auto p-4 border rounded bg-white"
      >
        {/* 🔹 Basic Info */}
        <h3 className="text-lg font-semibold">Basic Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <input {...register("mashincode")} readOnly className="w-full border p-2 rounded bg-gray-100" />
          <input {...register("model", { required: true })} className="w-full border p-2 rounded" placeholder="Model" />
          <input {...register("serialNo", { required: true })} className="w-full border p-2 rounded" placeholder="Serial No." />
          <select {...register("os")} className="w-full border p-2 rounded">
            <option value="">Select OS</option>
            <option>Win-10 Home</option>
            <option>Win-10 Pro</option>
            <option>Win-11 Home</option>
            <option>Win-11 Pro</option>
            <option>Mac OS</option>
            <option>Ubuntu</option>
          </select>
          <select {...register("cpu")} className="w-full border p-2 rounded">
            <option value="">Select CPU</option>
            <option>i3</option>
            <option>i5</option>
            <option>i7</option>
            <option>i9</option>
            <option>Ryzen 5</option>
            <option>Ryzen 7</option>
            <option>M-1 Air</option>
            <option>M-1 Pro</option>
            <option>M-2 Air</option>
            <option>M-2 Pro</option>
            <option>M-3 Air</option>
            <option>M-3 Pro</option>
          </select>
          <select {...register("gen")} className="w-full border p-2 rounded">
            <option value="">Select Generation</option>
            <option>6th</option>
            <option>7th</option>
            <option>8th</option>
            <option>10th</option>
            <option>11th</option>
            <option>12th</option>
            <option>13th</option>
          </select>
          <select {...register("ram")} className="w-full border p-2 rounded">
            <option value="">Select RAM</option>
            <option>8 GB</option>
            <option>10 GB</option>
            <option>12 GB</option>
            <option>16 GB</option>
            <option>20 GB</option>
            <option>32 GB</option>
            <option>40 GB</option>
            <option>64 GB</option>
            <option>128 GB</option>
          </select>
          <select {...register("ssdHdd")} className="w-full border p-2 rounded">
            <option value="">Select Storage</option>
            <option>128GB SSD</option>
            <option>256GB SSD</option>
            <option>512GB SSD</option>
            <option>1TB SSD</option>
            <option>2TB SSD</option>
            <option>4TB SSD</option>
            <option>8TB SSD</option>
            <option>128GB SSD + 500GB HDD</option>
            <option>128GB SSD + 1TB HDD</option>
            <option>256GB SSD + 500GB HDD</option>
            <option>256GB SSD + 1TB HDD</option>
          </select>
          <input {...register("ssdHealth")} className="w-full border p-2 rounded" placeholder="SSD Health %" />
          <select {...register("touch")} className="w-full border p-2 rounded">
            <option value="">Touchscreen?</option>
            <option>Touch</option>
            <option>Non Touch</option>
          </select>
          <select {...register("displaysize")} className="w-full border p-2 rounded">
            <option value="">Display Size</option>
            <option>13"</option>
            <option>14"</option>
            <option>15"</option>
          </select>
          <select {...register("graphiccard")} className="w-full border p-2 rounded">
            <option value="">Graphic Card</option>
            <option>2 GB</option>
            <option>4 GB</option>
            <option>8 GB</option>
            <option>Nil</option>
          </select>
          <input {...register("graphicmodel")} placeholder="Graphic Model" className="w-full border p-2 rounded" />
        </div>

        {/* 🔹 Display Tests */}
        <h3 className="text-lg font-semibold">Display Tests</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            "displaydotsA",
            "displaydots",
            "screenlightshadow",
            "displaybrack",
            "screenpatches",
            "keyboardmarks",
            "hingesok",
            "hingesh",
            "hingesl",
          ].map((field) => (
            <label key={field}>
              <input type="checkbox" {...register(field as keyof LaptopForm)} /> {field.replace(/([A-Z])/g, " $1")}
            </label>
          ))}
        </div>

        {/* 🔹 Battery */}
        <h3 className="text-lg font-semibold">Battery</h3>
        <input {...register("batteryhealth")} placeholder="Battery Health %" className="w-full border p-2 rounded" />
        <input {...register("batteryreading")} placeholder="Battery Reading (mAh)" className="w-full border p-2 rounded" />

        {/* 🔹 Ports & Connectivity */}
        <h3 className="text-lg font-semibold">Ports & Connectivity</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            "hdmiport",
            "lanport",
            "wifi",
            "camera",
            "mic",
            "keyboard",
            "keypaint",
            "touchpad",
            "rclick",
            "lclick",
            "rspeaker",
            "lspeaker",
            "ajack",
            "usbpr",
            "usbpw",
            "pcp",
            "Cport",
          ].map((field) => (
            <label key={field}>
              <input type="checkbox" {...register(field as keyof LaptopForm)} /> {field.replace(/([A-Z])/g, " $1")}
            </label>
          ))}
        </div>

        {/* 🔹 Panels */}
        <h3 className="text-lg font-semibold">Panels</h3>
        <div className="grid grid-cols-2 gap-2">
          <input {...register("Apanel")} placeholder="A Panel" className="border p-2 rounded" />
          <input {...register("Bpanel")} placeholder="B Panel" className="border p-2 rounded" />
          <input {...register("Cpanel")} placeholder="C Panel" className="border p-2 rounded" />
          <input {...register("Dpanel")} placeholder="D Panel" className="border p-2 rounded" />
        </div>

        {/* 🔹 Function Keys & Features */}
        <h3 className="text-lg font-semibold">Function Keys & Features</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            "brightness",
            "volume",
            "bt",
            "fpl",
            "bl",
            "sr",
            "driveri",
            "softi",
            "dl",
          ].map((field) => (
            <label key={field}>
              <input type="checkbox" {...register(field as keyof LaptopForm)} /> {field.replace(/([A-Z])/g, " $1")}
            </label>
          ))}
        </div>

        {/* 🔹 Remarks */}
        <h3 className="text-lg font-semibold">Remarks</h3>
        <textarea {...register("remarks")} placeholder="Engineer Remark" className="w-full border p-2 rounded" />

        {Object.keys(errors).length > 0 && (
          <div className="text-red-600 text-sm">Please fill all required fields.</div>
        )}

        <div className="flex justify-between">
          <button type="button" onClick={() => navigate("/reports")} className="bg-gray-300 px-4 py-2 rounded">
            ← Cancel
          </button>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            💾 Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
