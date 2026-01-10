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
  typesofscreenresolutions: string;
  graphiccard: string;
  graphicmodel: string;
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
  warranty: string;
  photoshoot: boolean;
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
            <option>9th</option>
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
          <input {...register("ssdHealth")} className="w-full border p-2 rounded" placeholder="SSD Health %" />
          <select {...register("touch")} className="w-full border p-2 rounded">
            <option value="">Touchscreen?</option>
            <option>Touch</option>
            <option>Non Touch</option>
          </select>
         <select {...register("displaysize")} className="w-full border p-2 rounded">
            <option value="">Display Size (inches)</option>
            <option>13"</option>
            <option>13.3"</option>
            <option>14"</option>
            <option>15"</option>
            <option>16"</option>
          </select>
          <select {...register("typesofscreenresolutions")} className="w-full border p-2 rounded">
            <option value="">Types of Screen Resolutions (SD/HD/HDR/FHD)</option>
            <option>SD"</option>
            <option>HD"</option>
            <option>HDR"</option>
            <option>FHD"</option>
            <option>4K"</option>
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
    { key: "hdmiport", label: "HDMI Port" },
    { key: "lanport", label: "LAN Port" },
    { key: "wifi", label: "Wi-Fi" },
    { key: "camera", label: "Camera" },
    { key: "mic", label: "Microphone" },
    { key: "keyboard", label: "Keyboard" },
    { key: "keypaint", label: "Key Paint" },
    { key: "touchpad", label: "Touchpad" },
    { key: "rclick", label: "Right Click" },
    { key: "lclick", label: "Left Click" },
    { key: "rspeaker", label: "Right Speaker" },
    { key: "lspeaker", label: "Left Speaker" },
    { key: "ajack", label: "Audio Jack" },
    { key: "usbpr", label: "USB Read" },
    { key: "usbpw", label: "USB Write" },
    { key: "pcp", label: "Power Charging Port" },
    { key: "Cport", label: "Type-C Port" },
  ].map(({ key, label }) => (
    <label key={key}><input type="checkbox" {...register(key as keyof LaptopForm)} className="mr-2" /> {label}</label>
  ))}
</div>

{/* 🔹 Panels */}
<h3 className="text-lg font-semibold mt-6 mb-2">Panels</h3>
<div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-gray-50">
  <input {...register("Apanel")} placeholder="A Panel" className="border p-2 rounded w-full" />
  <input {...register("Bpanel")} placeholder="B Panel" className="border p-2 rounded w-full" />
  <input {...register("Cpanel")} placeholder="C Panel" className="border p-2 rounded w-full" />
  <input {...register("Dpanel")} placeholder="D Panel" className="border p-2 rounded w-full" />
</div>

{/* 🔹 Function Keys & Features */}
<h3 className="text-lg font-semibold mt-6 mb-2">Function Keys & Features</h3>
<div className="grid grid-cols-3 gap-3 p-3 border rounded-lg bg-gray-50">
  {[
    { key: "brightness", label: "Brightness + / -" },
    { key: "volume", label: "Volume + / -" },
    { key: "Bluetooth", label: "Bluetooth" },
    { key: "fpl", label: "Fingerprint Lock" },
    { key: "bl", label: "Backlight" },
    { key: "sr", label: "Screen Rotate" },
    { key: "driveri", label: "Driver Installation" },
    { key: "softi", label: "Software Installation" },
    { key: "dl", label: "Digital License Check" },
    { key: "Photo Shoot Done", label: "Photo Shoot Done" },
  ].map(({ key, label }) => (
    <label key={key}><input type="checkbox" {...register(key as keyof LaptopForm)} className="mr-2" /> {label}</label>
  ))}
</div>

{/*warranty*/}
        <h3 className="text-lg font-semibold">Warranty Check</h3>
        <textarea {...register("warranty")} placeholder="Warranty Exp." className="w-full border p-2 rounded" />
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
