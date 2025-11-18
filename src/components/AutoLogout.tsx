import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AutoLogout({ timeout = 15 * 60 * 1000 }) {
  useEffect(() => {
    let timer: any;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await supabase.auth.signOut();
        localStorage.removeItem("user");
        window.location.href = "/login";
      }, timeout);
    };

    // Activity events that reset timer
    const events = ["mousemove", "keypress", "click", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
      clearTimeout(timer);
    };
  }, [timeout]);

  return null;
}
