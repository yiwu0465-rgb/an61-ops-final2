// orbit view component -> 3d visualization of satellites around earth using three.js
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sphere } from "@react-three/drei";
import { useStore } from "../store";

export function OrbitView() {
  const satellites = useStore((s) => s.satellites);

  return (
    <div style={{ 
      border: "1px solid var(--border-primary)", 
      padding: "2rem", 
      borderRadius: 4,
      background: 'var(--bg-secondary)'
    }}>
      <h2 style={{ marginBottom: '1.5rem' }}>ORBIT VIEW</h2>
      <div style={{ 
        height: 500, 
        border: '1px solid var(--border-primary)',
        borderRadius: 4,
        overflow: 'hidden',
        background: 'var(--bg-primary)'
      }}>
        {/* three.js canvas with camera positioned at 10 units on z-axis */}
        <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
          <color attach="background" args={['#000000']} />
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" />
          
          {/* orbit controls for camera manipulation */}
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />

          {/* earth rendered as wireframe sphere (1 unit radius = 6371 km) */}
          <Sphere args={[1, 32, 32]}>
            <meshStandardMaterial 
              color="#ffffff" 
              wireframe 
              opacity={0.15}
              transparent
            />
          </Sphere>

          {/* satellites rendered as white emissive spheres */}
          {satellites.map((sat, i) => {
            // scale satellite position based on altitude above earth
            // r = 1 (earth radius) + normalized altitude
            const r = 1 + (sat.semiMajorAxisKm - 6371) / 6371;
            
            // distribute satellites evenly around earth in 2d circle
            // (simplified view -> real orbits would need inclination/eccentricity)
            const angle = (i / satellites.length) * 2 * Math.PI;
            const x = r * Math.cos(angle);
            const y = r * Math.sin(angle);
            
            return (
              <mesh key={sat.name} position={[x, y, 0]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial 
                  color="#ffffff" 
                  emissive="#ffffff"
                  emissiveIntensity={0.5}
                />
              </mesh>
            );
          })}
        </Canvas>
      </div>
      
      {/* control instructions for user */}
      <div style={{ 
        marginTop: '1rem',
        fontSize: '0.7rem',
        color: 'var(--text-tertiary)',
        textAlign: 'center',
        fontFamily: 'JetBrains Mono, monospace',
        letterSpacing: '0.05em'
      }}>
        DRAG TO ROTATE • SCROLL TO ZOOM • RIGHT-CLICK TO PAN
      </div>
    </div>
  );
}
