// quick test to calculate actual positions and find a guaranteed threat
import * as sat from 'satellite.js';

// test debris from conjunction.ts
const debris = [
  {
    name: "COSMOS-1408 DEB",
    line1: "1 49863U 21117A   23001.00000000  .00000000  00000+0  00000+0 0  9999",
    line2: "2 49863  82.5000   0.0000 0010000   0.0000   0.0000 15.10000000    09"
  },
  {
    name: "SL-16 R/B DEB",
    line1: "1 25544U 98067A   23001.00000000  .00000000  00000+0  00000+0 0  9999",
    line2: "2 25544  51.6000  45.0000 0005000  90.0000 180.0000 15.54000000    09"
  },
  {
    name: "BREEZE-M DEB",
    line1: "1 40002U 14033B   23001.00000000  .00000000  00000+0  00000+0 0  9999",
    line2: "2 40002  55.0000 120.0000 0100000  45.0000 270.0000  2.00000000    09"
  }
];

// simplified user satellite position calculator (from conjunction.ts)
const MU_EARTH = 398600.4418;

function userSatEciAt(semiMajor, ecc, incDeg, tSec) {
  const a = semiMajor;
  const e = Math.max(0, Math.min(0.1, ecc));
  const i = (incDeg * Math.PI) / 180;
  
  const n = Math.sqrt(MU_EARTH / Math.pow(a, 3));
  const M = n * tSec;
  const E = M + e * Math.sin(M);
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  
  const x_op = a * (cosE - e);
  const y_op = a * Math.sqrt(1 - e * e) * sinE;
  
  const x = x_op;
  const y = y_op * Math.cos(i);
  const z = y_op * Math.sin(i);
  return [x, y, z];
}

function distKm(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// test each debris at current time
const now = new Date();
console.log('\n=== DEBRIS POSITIONS AT CURRENT TIME ===');

debris.forEach(d => {
  const rec = sat.twoline2satrec(d.line1, d.line2);
  const pv = sat.propagate(rec, now);
  if (pv && pv.position) {
    const pos = pv.position;
    const posKm = [pos.x, pos.y, pos.z]; // already in km
    console.log(`\n${d.name}:`);
    console.log(`  Position: [${posKm[0].toFixed(2)}, ${posKm[1].toFixed(2)}, ${posKm[2].toFixed(2)}] km`);
    console.log(`  Distance from Earth center: ${Math.sqrt(posKm[0]**2 + posKm[1]**2 + posKm[2]**2).toFixed(2)} km`);
    
    // now try different user satellite parameters to match this position
    console.log('\n  Testing user satellite matches:');
    
    // try matching semi-major axis and inclination from TLE
    const line2 = d.line2.split(/\s+/);
    const incl = parseFloat(line2[2]);
    const meanMotion = parseFloat(line2[7]);
    const semiMajor = Math.pow(MU_EARTH / Math.pow(meanMotion * 2 * Math.PI / 86400, 2), 1/3);
    
    console.log(`  Calculated semi-major axis: ${semiMajor.toFixed(2)} km`);
    console.log(`  Inclination: ${incl}°`);
    
    // test at t=0 (epoch time)
    const userPos = userSatEciAt(semiMajor, 0.001, incl, 0);
    const dist = distKm(userPos, posKm);
    console.log(`  User sat at t=0: [${userPos[0].toFixed(2)}, ${userPos[1].toFixed(2)}, ${userPos[2].toFixed(2)}]`);
    console.log(`  Distance between them: ${dist.toFixed(2)} km`);
  }
});

console.log('\n\n=== TESTING OVER 2 HOUR PERIOD ===');

// find the closest approach for a satellite matching first debris
const testDebris = debris[0];
const rec = sat.twoline2satrec(testDebris.line1, testDebris.line2);
const line2 = testDebris.line2.split(/\s+/);
const incl = parseFloat(line2[2]);
const meanMotion = parseFloat(line2[7]);
const semiMajor = Math.pow(MU_EARTH / Math.pow(meanMotion * 2 * Math.PI / 86400, 2), 1/3);

console.log(`\nTest satellite: ${semiMajor.toFixed(2)} km, ${incl}°, 0.001 ecc`);
console.log('vs COSMOS-1408 DEB\n');

let minDist = Infinity;
let minTime = null;

for (let mins = 0; mins <= 120; mins += 5) {
  const t = new Date(now.getTime() + mins * 60 * 1000);
  const dtSec = (t.getTime() - now.getTime()) / 1000;
  
  const userPos = userSatEciAt(semiMajor, 0.001, incl, dtSec);
  const pv = sat.propagate(rec, t);
  
  if (pv && pv.position) {
    const debrisPos = [pv.position.x, pv.position.y, pv.position.z]; // already in km
    const dist = distKm(userPos, debrisPos);
    
    if (dist < minDist) {
      minDist = dist;
      minTime = mins;
    }
  }
}

console.log(`Closest approach: ${minDist.toFixed(2)} km at T+${minTime} minutes`);

if (minDist < 100) {
  console.log('\n✅ THIS WILL TRIGGER A THREAT!');
  console.log('\nUSE THESE PARAMETERS:');
  console.log(`Name: THREAT-TEST`);
  console.log(`Semi-major axis: ${semiMajor.toFixed(0)}`);
  console.log(`Eccentricity: 0.001`);
  console.log(`Inclination: ${incl}`);
} else {
  console.log('\n❌ This will NOT trigger a threat (too far)');
  console.log('\nThe issue is the simplified orbital mechanics - trying alternate approach...');
  
  // try to reverse engineer parameters that would work
  console.log('\n=== FINDING WORKING PARAMETERS ===');
  
  // pick a time in the future
  const futureTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const pv = sat.propagate(rec, futureTime);
  
  if (pv && pv.position) {
    const targetPos = [pv.position.x, pv.position.y, pv.position.z]; // already in km
    const targetDist = Math.sqrt(targetPos[0]**2 + targetPos[1]**2 + targetPos[2]**2);
    
    console.log(`\nDebris will be at: [${targetPos[0].toFixed(2)}, ${targetPos[1].toFixed(2)}, ${targetPos[2].toFixed(2)}]`);
    console.log(`Distance from center: ${targetDist.toFixed(2)} km`);
    
    // try to match this with user satellite
    // our simplified model: x=a(cosE-e), y=a*sqrt(1-e²)*sinE*cos(i), z=a*sqrt(1-e²)*sinE*sin(i)
    // distance = sqrt(x²+y²+z²) ≈ a for circular orbit
    
    console.log(`\nTry semi-major axis: ${targetDist.toFixed(0)} km`);
    
    // calculate what inclination would give us the right z component
    const rXY = Math.sqrt(targetPos[0]**2 + targetPos[1]**2);
    const calcIncl = Math.atan2(Math.abs(targetPos[2]), rXY) * 180 / Math.PI;
    
    console.log(`Calculated inclination for z-match: ${calcIncl.toFixed(1)}°`);
  }
}
