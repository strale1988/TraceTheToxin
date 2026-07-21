// ═══════════════════════════════════════════════════════════════
// TraceTheToxin — hourly SEPA air quality collector
//
// Fetches the live station table from vazduh.sepa.gov.rs, parses it,
// and archives one row per station into air_quality_readings.
// Deploy with: supabase functions deploy collect-air-quality
// Schedule with the SQL at the bottom of this file (pg_cron).
// ═══════════════════════════════════════════════════════════════
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SEPA_URL = "https://vazduh.sepa.gov.rs/?view=desktop";

// Slug generator — must match the ids seeded in air_quality_stations.
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function num(text: string | null | undefined): number | null {
  if (!text) return null;
  const cleaned = text.trim().replace(",", ".");
  if (cleaned === "" || cleaned === "-") return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

Deno.serve(async () => {
  try {
    const res = await fetch(SEPA_URL, {
      headers: { "User-Agent": "TraceTheToxin-collector/1.0" },
    });
    if (!res.ok) {
      return new Response(`SEPA fetch failed: ${res.status}`, { status: 502 });
    }
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) return new Response("HTML parse failed", { status: 500 });

    // The station table is the first data table on the page:
    // columns: Indeks | Stanica | Mreža | PM10 | PM2.5 | SO2 | NO2 | O3
    const rows = Array.from(doc.querySelectorAll("table tbody tr"));
    if (!rows.length) {
      return new Response("No table rows found — SEPA markup may have changed", { status: 500 });
    }

    // Round down to the current hour, UTC — one snapshot bucket per run.
    const now = new Date();
    now.setUTCMinutes(0, 0, 0);
    const recordedAt = now.toISOString();

    const readings: Record<string, unknown>[] = [];
    const unknownStations: string[] = [];

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll("td")).map((c) => c.textContent?.trim() ?? "");
      if (cells.length < 8) continue;

      const [category, stationName, , pm10, pm25, so2, no2, o3] = cells;
      const id = slugify(stationName);

      readings.push({
        station_id: id,
        recorded_at: recordedAt,
        pm10: num(pm10),
        pm25: num(pm25),
        so2: num(so2),
        no2: num(no2),
        o3: num(o3),
        category: category || null,
      });
      unknownStations.push(id);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Guard against inserting readings for stations that don't exist yet
    // (new station added by SEPA, or a name/slug drift) — log instead of failing.
    const { data: knownStations } = await supabase
      .from("air_quality_stations")
      .select("id");
    const knownIds = new Set((knownStations ?? []).map((s) => s.id));

    const validReadings = readings.filter((r) => knownIds.has(r.station_id as string));
    const skipped = readings.length - validReadings.length;

    if (!validReadings.length) {
      return new Response(
        JSON.stringify({ inserted: 0, skipped, note: "No matching known stations — check slugs" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const { error } = await supabase
      .from("air_quality_readings")
      .upsert(validReadings, { onConflict: "station_id,recorded_at" });

    if (error) {
      return new Response(`Insert failed: ${error.message}`, { status: 500 });
    }

    return new Response(
      JSON.stringify({ inserted: validReadings.length, skipped, recordedAt }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(`Collector error: ${err}`, { status: 500 });
  }
});

/* ═══════════════════════════════════════════════════════════════
   SCHEDULING — run once in the Supabase SQL editor after deploying.
   Requires the pg_cron and pg_net extensions (enable them under
   Database → Extensions in the Supabase dashboard first).
═══════════════════════════════════════════════════════════════

select cron.schedule(
  'collect-air-quality-hourly',
  '5 * * * *',  -- 5 minutes past every hour, gives SEPA time to publish the hour's data
  $$
  select net.http_post(
    url := 'https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/collect-air-quality',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <YOUR-SERVICE-ROLE-KEY>',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- To check it's running:
-- select * from cron.job_run_details order by start_time desc limit 10;
=================================================================== */
