// src/pages/EditReport.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useForm } from "react-hook-form";
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
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, reset } = useForm<LaptopForm>();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

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
    <div className="p-6 max-w-5xl mx-auto bg-white rounded shadow">
      <h2 className="text-2xl font-semibold mb-2">✏️ Edit Laptop Test Report</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-4 border rounded">
        {/* Full editable form (same as LaptopTest.tsx) */}
        <div className="grid grid-cols-2 gap-4">
          <input {...register("mashincode")} className="border p-2 rounded" placeholder="Machine Code" readOnly />
          <input {...register("model")} className="border p-2 rounded" placeholder="Model" />
          <input {...register("serialNo")} className="border p-2 rounded" placeholder="Serial No" />
          <input {...register("os")} className="border p-2 rounded" placeholder="OS" />
          <input {...register("cpu")} className="border p-2 rounded" placeholder="CPU" />
          <input {...register("gen")} className="border p-2 rounded" placeholder="Generation" />
          <input {...register("ram")} className="border p-2 rounded" placeholder="RAM" />
          <input {...register("ssdHdd")} className="border p-2 rounded" placeholder="Storage" />
          <input {...register("ssdHealth")} className="border p-2 rounded" placeholder="SSD Health" />
          <input {...register("touch")} className="border p-2 rounded" placeholder="Touch" />
          <input {...register("displaysize")} className="border p-2 rounded" placeholder="Display Size" />
          <input {...register("graphiccard")} className="border p-2 rounded" placeholder="Graphic Card" />
          <input {...register("graphicmodel")} className="border p-2 rounded" placeholder="Graphic Model" />
        </div>

        <textarea {...register("remarks")} className="border p-2 rounded w-full" placeholder="Remarks" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          💾 Save Changes
        </button>
      </form>
    </div>
  );
}
