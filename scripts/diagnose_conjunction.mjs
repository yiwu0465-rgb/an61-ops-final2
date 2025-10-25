import * as sat from 'satellite.js';

const CELESTRAK_TLE = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle';

function parseTLE(txt, limit=50){
  const lines = txt.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const out=[];
  for(let i=0;i+2<lines.length && out.length<limit;){
    const name=lines[i++]; const l1=lines[i++]; const l2=lines[i++];
    if(l1.startsWith('1 ') && l2.startsWith('2 ')) out.push({name, line1:l1, line2:l2});
  }
  return out;
}

function userSatEciAt(s, tSinceEpochSec){
  const MU_EARTH = 398600.4418;
  const a = s.semiMajorAxisKm; const e = Math.max(0, Math.min(0.1, s.eccentricity||0));
  const i = (s.inclinationDeg||0) * Math.PI/180;
  const n = Math.sqrt(MU_EARTH / Math.pow(a,3));
  const M = n * tSinceEpochSec;
  const E = M + e * Math.sin(M);
  const cosE=Math.cos(E), sinE=Math.sin(E);
  const x_op = a * (cosE - e);
  const y_op = a * Math.sqrt(1 - e*e) * sinE;
  const x = x_op; const y = y_op * Math.cos(i); const z = y_op * Math.sin(i);
  return [x,y,z];
}

function tleEciAt(tle, date){
  try{
    const rec = sat.twoline2satrec(tle.line1, tle.line2);
    const pv = sat.propagate(rec, date);
    if(!pv || !pv.position) return null; const pos = pv.position; return [pos.x, pos.y, pos.z];
  }catch(e){return null;}
}

function distKm(a,b){const dx=a[0]-b[0], dy=a[1]-b[1], dz=a[2]-b[2]; return Math.sqrt(dx*dx+dy*dy+dz*dz);}

(async ()=>{
  console.log('Fetching TLEs...');
  const res = await fetch(CELESTRAK_TLE);
  const txt = await res.text();
  const debris = parseTLE(txt, 200); // load 200
  console.log('Parsed debris:', debris.length);

  // sample user satellites - common LEO altitudes
  const userSats = [
    {name:'SAT-LEO-7000', semiMajorAxisKm: 7000, inclinationDeg: 51.6, eccentricity: 0.0005},
    {name:'SAT-LEO-6771', semiMajorAxisKm: 6771, inclinationDeg: 98, eccentricity: 0.0001},
    {name:'SAT-GEO', semiMajorAxisKm: 42164, inclinationDeg: 0, eccentricity: 0.0001}
  ];

  const now = new Date();
  const HORIZON_HOURS = 2; const STEP_SEC = 5*60; const THRESHOLD_KM=500;
  const end = new Date(now.getTime() + HORIZON_HOURS*3600*1000);

  for(const u of userSats){
    let best={d:Infinity, when:null, tle:null};
    for(let t=new Date(now); t<=end; t=new Date(t.getTime()+STEP_SEC*1000)){
      const dtSec=(t.getTime()-now.getTime())/1000;
      const pUser = userSatEciAt(u, dtSec);
      for(const tle of debris){
        const pDeb = tleEciAt(tle, t);
        if(!pDeb) continue; const d=distKm(pUser,pDeb);
        if(d<best.d){best={d, when:new Date(t), tle}};
      }
    }
    console.log(`${u.name}: closest ${best.d.toFixed(2)} km at ${best.when?.toISOString()} (threshold ${THRESHOLD_KM})`);
  }
})();
