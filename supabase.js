/* =========================================================
   Supabase configuration
   Replace these values with your own Supabase Project URL
   and anon public key from Supabase Dashboard > Project Settings > API.
   ========================================================= */

const SUPABASE_URL = "https://hghdxpcdmoobuyozrrgh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_LfPRM8oiyzE2f4udIxOWvQ_QEX6tT5o";

if (!window.supabase) {
  throw new Error("Supabase CDN was not loaded. Check the script tag in HTML.");
}

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

const TRAINING_DAYS = [
  { value: "2026-07-08", label: "08 հուլիս 2026", dayName: "Չորեքշաբթի" },
  { value: "2026-07-09", label: "09 հուլիս 2026", dayName: "Հինգշաբթի" },
  { value: "2026-07-13", label: "13 հուլիս 2026", dayName: "Երկուշաբթի" },
  { value: "2026-07-15", label: "15 հուլիս 2026", dayName: "Չորեքշաբթի" },
  { value: "2026-07-16", label: "16 հուլիս 2026", dayName: "Հինգշաբթի" },
];

const TRAINING_SESSIONS = [
  { value: "11:00-12:00", label: "11:00–12:00" },
  { value: "15:00-16:00", label: "15:00–16:00" },
];

const TOTAL_SEATS = 14;
