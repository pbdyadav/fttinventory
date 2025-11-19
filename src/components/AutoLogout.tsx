import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AutoLogout({ timeout = 15 * 60 * 1000 }) {
  useEffect(() => {
    let timer: any;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        window.location.href = "/login";
      }, timeout);
    };

    const events = ["mousemove", "keypress", "click", "scroll", "touchstart"];

    events.forEach((e) => window.addEventListener(e, resetTimer));

    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      clearTimeout(timer);
    };
  }, [timeout]);

  return null;
}
