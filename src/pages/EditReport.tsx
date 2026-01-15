// src/pages/EditReport.tsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

type LaptopForm = {
  MashinCode: number;
  Model: string;
  SerialNo: string;
  OS: string;
  Gen: string;
  CPU: string;
  RAM: string;
  ssdHdd: string;
  SSDHealth: string;
  touch: string;
  DisplaySize: string;
  ScreenResolutions: string;
  GraphicCard: string;
  GraphicCardModel: string;
  AvailableDeadPixels: boolean;
  NoDeadPixels: boolean;
  ShowingLightShadowonScreen: boolean;
  DisplayBroken: boolean;
  ScreenPatches: boolean;
  KeyboardMarks: boolean;
  HingesOK: boolean;
  HingesHard: boolean;
  HingesLoose: boolean;
  batteryhealth: string;
  batteryreading: string;
  HDMIPort: boolean;
  LanPort: boolean;
  WiFi: boolean;
  Camera: boolean;
  Microphone: boolean;
  Keyboard: boolean;
  KeyPaint: boolean;
  TouchPad: boolean;
  RightClick: boolean;
  LeftClick: boolean;
  RightSpeaker: boolean;
  LeftSpeaker: boolean;
  AudioJack: boolean;
  USBRead: boolean;
  USBWrite: boolean;
  PowerChargingPort: boolean;
  TypeCPort: boolean;
  APanel: string;
  BPanel: string;
  CPanel: string;
  DPanel: string;
  Brightness: boolean;
  Volume: boolean;
  Bluetooth: boolean;
  FingerprintLock: boolean;
  BackLight: boolean;
  ScreenRotate: boolean;
  DriverInstallation: boolean;
  SoftwareInstallation: boolean;
  DigitalLicenseCheck: boolean;
  WarrantyExp: string;
  photoshoot: boolean;
  EngineerRemarks: string;
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
      toast.success("✅ Report updated successfully! Logging out for security...");

     {/*} await supabase.auth.signOut();
localStorage.removeItem("user");
window.location.href = "/login"; */}


      setTimeout(async () => {
      await supabase.auth.signOut();
      localStorage.clear();
      window.location.href = "/login";
      }, 2000);


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
          <input {...register("MashinCode")} readOnly className="w-full border p-2 rounded bg-gray-100" />
          <input {...register("Model", { required: true })} className="w-full border p-2 rounded" placeholder="Model" />
          <input {...register("SerialNo", { required: true })} className="w-full border p-2 rounded" placeholder="Serial No." />
          <select {...register("OS")} className="w-full border p-2 rounded">
            <option value="">Select OS</option>
            <option>Win-10 Home</option>
            <option>Win-10 Pro</option>
            <option>Win-11 Home</option>
            <option>Win-11 Pro</option>
            <option>Mac OS</option>
            <option>Ubuntu</option>
          </select>
          <select {...register("CPU")} className="w-full border p-2 rounded">
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
          <select {...register("Gen")} className="w-full border p-2 rounded">
            <option value="">Select Generation</option>
            <option>6th</option>
            <option>7th</option>
            <option>8th</option>
            <option>9th</option>
            <option>10th</option>
            <option>11th</option>
            <option>12th</option>
            <option>13th</option>
          </select>
          <select {...register("RAM")} className="w-full border p-2 rounded">
            <option value="">Select RAM</option>
            <option>8 GB</option>
            <option>10 GB</option>
            <option>12 GB</option>
            <option>16 GB</option>
            <option>20 GB</option>
            <option>24 GB</option>
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
          <input {...register("SSDHealth")} className="w-full border p-2 rounded" placeholder="SSD Health %" />
          <select {...register("touch")} className="w-full border p-2 rounded">
            <option value="">Touchscreen?</option>
            <option>Touch</option>
            <option>Non Touch</option>
          </select>
         <select {...register("DisplaySize")} className="w-full border p-2 rounded">
            <option value="">Display Size (inches)</option>
            <option>13"</option>
            <option>13.3"</option>
            <option>14"</option>
            <option>15"</option>
            <option>16"</option>
          </select>
          <select {...register("ScreenResolutions")} className="w-full border p-2 rounded">
            <option value="">Types of Screen Resolutions (SD/HD/HDR/FHD)</option>
            <option>SD"</option>
            <option>HD"</option>
            <option>HDR"</option>
            <option>FHD"</option>
            <option>4K"</option>
          </select>
          <select {...register("GraphicCard")} className="w-full border p-2 rounded">
            <option value="">Graphic Card</option>
            <option>2 GB</option>
            <option>4 GB</option>
            <option>8 GB</option>
            <option>Nil</option>
          </select>
          <input {...register("GraphicCardModel")} placeholder="Graphic Card Model" className="w-full border p-2 rounded" />
        </div>

        {/* 🔹 Display Tests */}
<h3 className="text-lg font-semibold mt-6 mb-2">Display Tests</h3>
<div className="grid grid-cols-3 gap-3 p-3 border rounded-lg bg-gray-50">
  <label><input type="checkbox" {...register("AvailableDeadPixels")} className="mr-2" /> Available Dead Pixels</label>
  <label><input type="checkbox" {...register("NoDeadPixels")} className="mr-2" /> No Dead Pixels</label>
  <label><input type="checkbox" {...register("ShowingLightShadowonScreen")} className="mr-2" /> Showing Light Shadow on Screen</label>
  <label><input type="checkbox" {...register("DisplayBroken")} className="mr-2" /> Display Broken</label>
  <label><input type="checkbox" {...register("ScreenPatches")} className="mr-2" /> Screen Patches</label>
  <label><input type="checkbox" {...register("KeyboardMarks")} className="mr-2" /> Keyboard Marks</label>
  <label><input type="checkbox" {...register("HingesOK")} className="mr-2" /> Hinges OK</label>
  <label><input type="checkbox" {...register("HingesHard")} className="mr-2" /> Hinges Hard</label>
  <label><input type="checkbox" {...register("HingesLoose")} className="mr-2" /> Hinges Loose</label>
</div>

{/* 🔹 Battery */}
<h3 className="text-lg font-semibold mt-6 mb-2">Battery</h3>
<div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-gray-50">
  <input {...register("batteryhealth")} placeholder="Battery Health %" className="border p-2 rounded w-full" />
  <input {...register("batteryreading")} placeholder="Battery Reading (mAh) / Cycle Count" className="border p-2 rounded w-full" />
</div>

{/* 🔹 Ports & Connectivity */}
<h3 className="text-lg font-semibold mt-6 mb-2">Ports & Connectivity</h3>
<div className="grid grid-cols-3 gap-3 p-3 border rounded-lg bg-gray-50">
  {[
    { key: "HDMIPort", label: "HDMI Port" },
    { key: "LanPort", label: "LAN Port" },
    { key: "WiFi", label: "Wi-Fi" },
    { key: "Camera", label: "Camera" },
    { key: "Microphone", label: "Microphone" },
    { key: "Keyboard", label: "Keyboard" },
    { key: "KeyPaint", label: "Key Paint" },
    { key: "TouchPad", label: "Touchpad" },
    { key: "RightClick", label: "Right Click" },
    { key: "LeftClick", label: "Left Click" },
    { key: "RightSpeaker", label: "Right Speaker" },
    { key: "LeftSpeaker", label: "Left Speaker" },
    { key: "AudioJack", label: "Audio Jack" },
    { key: "USBRead", label: "USB Read" },
    { key: "USBWrite", label: "USB Write" },
    { key: "PowerChargingPort", label: "Power Charging Port" },
    { key: "TypeCPort", label: "Type-C Port" },
  ].map(({ key, label }) => (
    <label key={key}><input type="checkbox" {...register(key as keyof LaptopForm)} className="mr-2" /> {label}</label>
  ))}
</div>

{/* 🔹 Panels */}
<h3 className="text-lg font-semibold mt-6 mb-2">Panels</h3>
<div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-gray-50">
  <input {...register("APanel")} placeholder="A Panel" className="border p-2 rounded w-full" />
  <input {...register("BPanel")} placeholder="B Panel" className="border p-2 rounded w-full" />
  <input {...register("CPanel")} placeholder="C Panel" className="border p-2 rounded w-full" />
  <input {...register("DPanel")} placeholder="D Panel" className="border p-2 rounded w-full" />
</div>

{/* 🔹 Function Keys & Features */}
<h3 className="text-lg font-semibold mt-6 mb-2">Function Keys & Features</h3>
<div className="grid grid-cols-3 gap-3 p-3 border rounded-lg bg-gray-50">
  {[
    { key: "Brightness", label: "Brightness + / -" },
    { key: "Volume", label: "Volume + / -" },
    { key: "Bluetooth", label: "Bluetooth" },
    { key: "FingerprintLock", label: "Fingerprint Lock" },
    { key: "BackLight", label: "Backlight" },
    { key: "ScreenRotate", label: "Screen Rotate" },
    { key: "DriverInstallation", label: "Driver Installation" },
    { key: "SoftwareInstallation", label: "Software Installation" },
    { key: "DigitalLicenseCheck", label: "Digital License Check" },
    { key: "Photo Shoot Done", label: "Photo Shoot Done" },
  ].map(({ key, label }) => (
    <label key={key}><input type="checkbox" {...register(key as keyof LaptopForm)} className="mr-2" /> {label}</label>
  ))}
</div>

{/*warranty*/}
        <h3 className="text-lg font-semibold">Warranty Check</h3>
        <textarea {...register("WarrantyExp")} placeholder="Warranty Exp." className="w-full border p-2 rounded" />
        {/* 🔹 Remarks */}
        <h3 className="text-lg font-semibold">Remarks</h3>
        <textarea {...register("EngineerRemarks")} placeholder="Engineer Remark" className="w-full border p-2 rounded" />

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
