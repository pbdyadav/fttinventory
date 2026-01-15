import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabaseClient";

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
  EngineerRemarks: string;
};

const LaptopTest = () => {
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<LaptopForm>();
  const [nextMachineCode, setNextMachineCode] = useState<number>(101);
  const [testedBy, setTestedBy] = useState<string>("");
  const [testDate, setTestDate] = useState<string>("");
  const [qrUrl, setQrUrl] = useState<string>("");

  // ✅ Get user from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Fetch next machine code on mount
  // Fetch next machine code on mount
  useEffect(() => {
    const fetchNextCode = async () => {
      try {
        const { data, error } = await supabase.rpc("get_next_machine_code");

        if (error) throw error;

        const nextCode = data || 101;
        setNextMachineCode(nextCode);
        setValue("MashinCode", nextCode);
      } catch (err: any) {
        console.error("Error fetching machine code:", err.message);
        toast.error("Failed to fetch next machine code.");
        setNextMachineCode(101);
        setValue("MashinCode", 101);
      }
    };

    fetchNextCode();

    // ✅ Set test date and tester (moved inside same effect)
    const now = new Date();
    setTestDate(now.toISOString().slice(0, 10));

    supabase.auth.getUser().then(({ data }) => {
      setTestedBy(data?.user?.email || "");
    });
  }, [setValue]);


  // ✅ Handle form submit + auto add to inventory
  const onSubmit = async (data: LaptopForm) => {
    try {
      // ✅ Check for duplicate serial number before inserting
      const { data: existing, error: dupError } = await supabase
        .from("laptop_tests")
        .select("id")
        .eq("serialNo", data.SerialNo);

      if (dupError) throw dupError;
      if (existing && existing.length > 0) {
        alert("❌ Serial number already exists — duplicate entry prevented!");
        return;
      }

      // ✅ Save Laptop Test — add tested_by & tested_on
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("laptop_tests").insert([
        {
          ...data,
          tested_by: user?.id ?? null, // ✅ UUID only
          tested_on: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      // ✅ Auto-add to Inventory (if not exists)
      const { data: invExists } = await supabase
        .from("inventory")
        .select("id")
        .eq("serialNo", data.SerialNo);

      if (!invExists || invExists.length === 0) {
        const inventoryData = {
          mashincode: data.MashinCode,
          model: data.Model,
          serialNo: data.SerialNo,
          os: data.OS,
          cpu: data.CPU,
          RAM: data.RAM,
          storage: data.ssdHdd,
          SSDHealth: data.SSDHealth,
          touch: data.touch,
          displaysize: data.DisplaySize,
          ScreenResolutions: statusbar.ScreenResolutions,
          graphiccard: data.GraphicCard,
          location: "Warehouse A",
          quantity: 1,
          status: "In Stock",
        };
        const { error: invError } = await supabase.from("inventory").insert([inventoryData]);
        if (invError) throw invError;
      }


      // 2️⃣ Auto-add to Inventory
      const inventoryData = {
        mashincode: data.MashinCode,
        model: data.Model,
        serialNo: data.SerialNo,
        os: data.OS,
        cpu: data.CPU,
        RAM: data.RAM,
        storage: data.ssdHdd,
        SSDHealth: data.SSDHealth,
        touch: data.touch,
        DisplaySize: data.DisplaySize,
        GraphicCard: data.GraphicCard,
        location: "Warehouse A",
        quantity: 1,
        status: "In Stock",
      };

      const { error: invError } = await supabase.from("inventory").insert([inventoryData]);
      if (invError) throw invError;

      // Generate QR URL (client-side service)
      const payload = encodeURIComponent(JSON.stringify({ ...data, testDate, testedBy }));
      const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${payload}`;
      setQrUrl(qr);

      alert(`✅ Laptop test saved and added to inventory! Machine Code: ${data.MashinCode}`);

      {/*await supabase.auth.signOut();
localStorage.removeItem("user");
window.location.href = "/login"; */}

      // 🔒 Auto logout for security
      setTimeout(async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        alert("🔐 Session ended for security. Please log in again.");
        window.location.href = "/login";
      }, 2000);

      // Reset form and increment machine code
      const newCode = (nextMachineCode ?? 100) + 1;
      setNextMachineCode(newCode);
      reset();
      setValue("MashinCode", newCode);
    } catch (err: any) {
      alert("❌ Error saving test: " + err.message);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Furtherance Technotree Pvt Ltd - Laptop Test</h2>
      <div className="text-sm text-slate-700 mb-4 flex flex-wrap gap-4">
        <span>Date of Test: <span className="font-medium">{testDate || '-'}</span></span>
        <span>Tested by: <span className="font-medium">{testedBy || '-'}</span></span>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 max-h-[80vh] overflow-y-auto p-4 border rounded bg-white"
      >
        {/* 🔹 Basic Info */}
        <h3 className="text-lg font-semibold">Basic Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <input
            {...register("MashinCode", { required: true })}
            readOnly
            className="w-full border p-2 rounded bg-gray-100 text-gray-700"
            placeholder="Machine Code"
          />
          <input {...register("Model", { required: true })} placeholder="Model" className="w-full border p-2 rounded" />
          <input {...register("SerialNo", { required: true })} placeholder="Serial No." className="w-full border p-2 rounded" />
          <select {...register("OS", { required: true })} className="w-full border p-2 rounded">
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
          <select {...register("RAM", { required: true })} className="w-full border p-2 rounded">
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
          <select {...register("ssdHdd", { required: true })} className="w-full border p-2 rounded">
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
          <input {...register("SSDHealth")} placeholder="SSD Health %" className="w-full border p-2 rounded" />
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
            <option>1 GB</option>
            <option>2 GB</option>
            <option>3 GB</option>
            <option>4 GB</option>
            <option>6 GB</option>
            <option>8 GB</option>
            <option>Nil</option>
          </select>
          <input {...register("GraphicCardModel")} placeholder="Graphic Card Model" className="w-full border p-2 rounded" />
        </div>

        {/* 🔹 Display Tests */}
        <h3 className="text-lg font-semibold">Display Tests</h3>
        <div className="grid grid-cols-3 gap-2">
          <label><input type="checkbox" {...register("AvailableDeadPixels")} /> Available Dead Pixels</label>
          <label><input type="checkbox" {...register("NoDeadPixels")} /> No Dead Pixels</label>
          <label><input type="checkbox" {...register("ShowingLightShadowonScreen")} />Showing Light Shadow on Screen</label>
          <label><input type="checkbox" {...register("DisplayBroken")} /> Display Broken</label>
          <label><input type="checkbox" {...register("ScreenPatches")} /> Screen Patches</label>
          <label><input type="checkbox" {...register("KeyboardMarks")} /> Keyboard Marks</label>
          <label><input type="checkbox" {...register("HingesOK")} /> Hinges OK</label>
          <label><input type="checkbox" {...register("HingesHard")} /> Hinges Hard</label>
          <label><input type="checkbox" {...register("HingesLoose")} /> Hinges Loose</label>
        </div>

        {/* 🔹 Battery */}
        <h3 className="text-lg font-semibold">Battery</h3>
        <input {...register("batteryhealth")} placeholder="Battery Health %" className="w-full border p-2 rounded" />
        <input {...register("batteryreading")} placeholder="Battery Reading (mAh) / Cycle Count" className="w-full border p-2 rounded" />

        {/* 🔹 Ports & Connectivity */}
        <h3 className="text-lg font-semibold">Ports & Connectivity</h3>
        <div className="grid grid-cols-3 gap-2">
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
            <label key={key}><input type="checkbox" {...register(key as keyof LaptopForm)} /> {label}</label>
          ))}
        </div>

        {/* 🔹 Panels */}
        <h3 className="text-lg font-semibold">Panels</h3>
        <input {...register("APanel")} placeholder="A Panel" className="w-full border p-2 rounded" />
        <input {...register("BPanel")} placeholder="B Panel" className="w-full border p-2 rounded" />
        <input {...register("CPanel")} placeholder="C Panel" className="w-full border p-2 rounded" />
        <input {...register("DPanel")} placeholder="D Panel" className="w-full border p-2 rounded" />

        {/* 🔹 Function Keys & Features */}
        <h3 className="text-lg font-semibold">Function Keys & Features</h3>
        <div className="grid grid-cols-3 gap-2">
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

          ].map(({ key, label }) => (
            <label key={key}><input type="checkbox" {...register(key as keyof LaptopForm)} /> {label}</label>
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

        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
          Save Test
        </button>
        {/* ✅ Show QR Code after saving */}
        {qrUrl && (
          <div className="mt-4 p-3 bg-white rounded border inline-block">
            <div className="text-sm mb-2 text-gray-700">QR Code for this report:</div>
            <img src={qrUrl} alt="QR Code" className="w-44 h-44" />
          </div>

        )}
      </form>
    </div>
  );
};

export default LaptopTest;
