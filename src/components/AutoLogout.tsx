import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AutoLogout({ timeout = 15 * 60 * 1000 }) {
  const user = localStorage.getItem("user");

  useEffect(() => {
    if (!user) return; // ⛔ do nothing if not logged-in

    let timer: any;

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        window.location.href = "/login";
      }, timeout);
    };

    ["mousemove", "keypress", "click", "scroll"].forEach((evt) =>
      window.addEventListener(evt, reset)
    );

    reset();

    return () => {
      ["mousemove", "keypress", "click", "scroll"].forEach((evt) =>
        window.removeEventListener(evt, reset)
      );
      clearTimeout(timer);
    };
  }, [user, timeout]);

  return null;
}
