// =============================================================
//  AJUSTES DE LA WEB (lo único que tienes que rellenar una vez)
// =============================================================
window.CONFIG = {
  // Supabase → Project Settings → API (o "Connect")
  SUPABASE_URL: "https://zhgvaufvhwsthtywkyih.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoZ3ZhdWZ2aHdzdGh0eXdreWloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU3MzIxMzgsImV4cCI6MjExMTMwODEzOH0.UpT56FxxDQB3wvLMpSJYWXAPor_mgbS395fdlCxN0kA",

  // Fecha y hora de la gala (formato AAAA-MM-DDTHH:MM). Déjalo en null si aún no hay fecha.
  FECHA_GALA: null,          // ej: "2027-01-03T21:00"
  // Fecha límite para votar (solo informativa; la votación se cierra de verdad desde Admin)
  FECHA_CIERRE: null,        // ej: "2027-01-02T23:59"

  // Una categoría con menos nominados que esto no aparece
  MIN_NOMINADOS: 3,
};
