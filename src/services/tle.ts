// tle data service - fetches two-line element sets from celestrak for satellite tracking
export type TleRecord = { name: string; line1: string; line2: string };

// celestrak api endpoint for active satellites (tle format)
const CELESTRAK_TLE = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle";

// fetches tle data from celestrak and parses it into our format
// limit parameter controls how many satellites to load
export async function loadTLEs(limit = 8): Promise<TleRecord[]> {
  console.log('Fetching TLE data from CelesTrak...');
  const res = await fetch(CELESTRAK_TLE, { 
    cache: "no-store",
  });
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  
  const txt = await res.text();
  console.log(`Received ${txt.length} bytes of TLE data`);
  
  // tle format is: name on one line, then line1, then line2, repeating
  const lines = txt.split(/\r?\n/).filter(Boolean);
  const out: TleRecord[] = [];
  
  // parse through the text and extract tle sets
  for (let i = 0; i + 2 < lines.length && out.length < limit; ) {
    const name = lines[i++].trim();
    const line1 = lines[i++].trim();
    const line2 = lines[i++].trim();
    // verify this is actually a tle (line1 starts with "1 ", line2 with "2 ")
    if (line1.startsWith("1 ") && line2.startsWith("2 ")) {
      out.push({ name, line1, line2 });
    }
  }
  
  if (out.length === 0) {
    throw new Error('No valid TLE data parsed from response');
  }
  
  console.log(`Successfully loaded ${out.length} TLEs from CelesTrak`);
  return out;
}
