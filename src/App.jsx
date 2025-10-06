import React, { useRef, useState, useEffect, Suspense, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Sphere, Html, Stars, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Wind, Droplets, Sun, Thermometer, Eye, Loader2, Activity, Zap, Minimize, Maximize, AlertCircle, ChevronRight, GripHorizontal } from 'lucide-react';
import { formatDateWithoutHyphen, formatDisplayDate } from './utils/formatter';
import { fetchNASAData } from './utils/fetchNASAData';
const baseUrl = import.meta.env.BASE_URL;

// === CONFIGURATION DATA (LOCATIONS AND SATELLITES) ===

/**
 * Defines the geographic locations (cities) to be displayed on the Earth model.
 * Each location has its name, coordinates (lat/lon), color, and district.
 */
const locations = [
  { name: 'Lima, Peru', lat: -12.0464, lon: -77.0428, color: '#08d8f6', district: 'Miraflores' },
  { name: 'New York, USA', lat: 40.7128, lon: -74.0060, color: '#08d8f6', district: 'Manhattan' },
  { name: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503, color: '#08d8f6', district: 'Shibuya' },
  { name: 'London, UK', lat: 51.5074, lon: -0.1278, color: '#08d8f6', district: 'Westminster' },
  { name: 'Sydney, Australia', lat: -33.8688, lon: 151.2093, color: '#08d8f6', district: 'CBD' },
  { name: 'Dubai, UAE', lat: 25.2048, lon: 55.2708, color: '#08d8f6', district: 'Downtown' },
];

/**
 * Defines the parameters for different satellites to be rendered in orbit.
 * - altitude: Relative radius (scaled from km to Three.js units).
 * - period: Orbital period in hours (converted from minutes/60).
 * - orbitInclination: Inclination angle in radians.
 * - model: Path to the GLB model file.
 * - scale: Scale factor for the 3D model.
 */
const satellites = [
  {
    id: 1,
    name: 'Satelite AQUA',
    altitude: 705 * 0.000314 + 2, // Scaled altitude + Earth radius (2)
    period: 98.8 / 60,
    color: '#ff4d4d',
    orbitInclination: (98.2 * Math.PI) / 180,
    eccentricity: 0.001,
    model: '/assets/satellites/AQUA.glb',
    scale: 0.008,
  },
  {
    id: 2,
    name: 'Satelite AQUARIOUS',
    altitude: 657 * 0.000314 + 2,
    period: 96 / 60,
    color: '#ffcc00',
    orbitInclination: (66 * Math.PI) / 180,
    eccentricity: 0.002,
    model: '/assets/satellites/AQUARIOUS.glb',
    scale: 0.018,
  },
  {
    id: 3,
    name: 'Satelite AURA',
    altitude: 705 * 0.000314 + 2,
    period: 98.8 / 60,
    color: '#33cc33',
    orbitInclination: (98.2 * Math.PI) / 180,
    eccentricity: 0.001,
    model: '/assets/satellites/AURA.glb',
    scale: 0.003,
  },
  {
    id: 4,
    name: 'Satelite CALIPSO',
    altitude: 705 * 0.000314 + 2,
    period: 98.8 / 60,
    color: '#ff66cc',
    orbitInclination: (98.2 * Math.PI) / 180,
    eccentricity: 0.001,
    model: '/assets/satellites/CALIPSO.glb',
    scale: 0.001,
  },
  {
    id: 5,
    name: 'Satelite Cloudsat',
    altitude: 705 * 0.000314 + 2,
    period: 98.8 / 60,
    color: '#ff9933',
    orbitInclination: (98.2 * Math.PI) / 180,
    eccentricity: 0.001,
    model: '/assets/satellites/Cloudsat.glb',
    scale: 0.02,
  },
  {
    id: 6,
    name: 'Satelite Global Precipitation Measurement',
    altitude: 407 * 0.000314 + 2,
    period: 93 / 60,
    color: '#9933ff',
    orbitInclination: (65 * Math.PI) / 180,
    eccentricity: 0.002,
    model: '/assets/satellites/Global-Precipitation-Measurement.glb',
    scale: 0.0005,
  },
  {
    id: 7,
    name: 'Satelite Landsat8',
    altitude: 705 * 0.000314 + 2,
    period: 99 / 60,
    color: '#00cc99',
    orbitInclination: (98.2 * Math.PI) / 180,
    eccentricity: 0.001,
    model: '/assets/satellites/Landsat8.glb',
    scale: 0.003,
  },
  {
    id: 8,
    name: 'Satelite OCO2',
    altitude: 705 * 0.000314 + 2,
    period: 98.8 / 60,
    color: '#ff3366',
    orbitInclination: (98.2 * Math.PI) / 180,
    eccentricity: 0.001,
    model: '/assets/satellites/OCO2.glb',
    scale: 0.003,
  },
  {
    id: 9,
    name: 'Satelite OSTM Jason 2',
    altitude: 1336 * 0.000314 + 2,
    period: 112 / 60,
    color: '#3399ff',
    orbitInclination: (66 * Math.PI) / 180,
    eccentricity: 0.0008,
    model: '/assets/satellites/OSTM-Jason-2.glb',
    scale: 0.1,
  },
  {
    id: 10,
    name: 'Satelite SMAP',
    altitude: 685 * 0.000314 + 2,
    period: 98.5 / 60,
    color: '#cc33cc',
    orbitInclination: (98.2 * Math.PI) / 180,
    eccentricity: 0.001,
    model: '/assets/satellites/SMAP.glb',
    scale: 0.012,
  },
];

// --- 3D Components ---

/**
 * Earth Component: Renders the Earth sphere, its glow, location markers, and satellites.
 * It handles the Earth's rotation animation.
 * @param {object} props - Component properties.
 * @param {function} props.onLocationClick - Handler for location marker clicks.
 * @param {object} props.selectedLocation - The currently selected location object.
 */
function Earth({ onLocationClick, selectedLocation }) {
  const meshRef = useRef();
  const glowRef = useRef();
  // Loads the Earth texture map from the asset path.
  const [colorMap] = useLoader(
  THREE.TextureLoader,
  [`${baseUrl}assets/textures/3d-earth-model-relief.jpg`]
);

  // Animation loop using useFrame (runs every frame)
  useFrame((state) => {
    // Rotate the Earth slowly around the Y-axis.
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
    // Synchronize the glow rotation and animate its scale for a pulse effect.
    if (glowRef.current) {
      glowRef.current.rotation.y = meshRef.current.rotation.y;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      glowRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group ref={meshRef}>
      {/* Outer atmosphere glow (rendered from inside out - BackSide) */}
      <Sphere ref={glowRef} args={[2.3, 64, 64]}>
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.1} side={THREE.BackSide} />
      </Sphere>
      
      {/* Main Earth sphere with texture and lighting properties */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial 
          map={colorMap} 
          emissive="#64ffda"
          emissiveIntensity={0.2}
          shininess={100}
          transparent
          opacity={0.9}
          bumpScale={0.05}
        />
      </mesh>
      
      {/* Inner atmosphere/wireframe effect (BackSide rendering) */}
      <Sphere args={[2.05, 64, 64]}>
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.15} side={THREE.BackSide} />
      </Sphere>
      
      {/* Map location data to LocationMarker components */}
      {locations.map((loc, idx) => (
        <LocationMarker
          key={idx}
          location={loc}
          onClick={onLocationClick}
          isSelected={selectedLocation?.name === loc.name}
        />
      ))}

      {/* Render all satellites in their orbits */}
      {satellites.map((sat) => (
        <Satellite key={sat.id} satellite={sat} />
      ))}

      <SpaceStation />

      {/* Fine wireframe layer for subtle detail */}
      <Sphere args={[2.01, 32, 32]}>
        <meshBasicMaterial color="#06b6d4" wireframe transparent opacity={0.1} />
      </Sphere>
    </group>
  );
}

/**
 * LocationMarker Component: Renders a spherical marker for a specific location on the Earth.
 * Handles interactive effects (hover, select) and position calculation.
 */
function LocationMarker({ location, onClick, isSelected }) {
  const meshRef = useRef();
  const ringRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  const radius = 2.02;
  // Convert lat/lon to spherical coordinates for placement on the globe.
  const phi = (90 - location.lat) * (Math.PI / 180);
  const theta = (location.lon + 180) * (Math.PI / 180);
  
  // Convert spherical coordinates to Cartesian (x, y, z).
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  // Animation loop for marker scaling and selected ring rotation.
  useFrame((state) => {
    if (meshRef.current) {
      if (isSelected) {
        // Pulse animation when selected.
        meshRef.current.scale.setScalar(Math.sin(state.clock.elapsedTime * 3) * 0.2 + 1.5);
      } else if (hovered) {
        meshRef.current.scale.setScalar(1.3);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }
    
    if (ringRef.current && isSelected) {
      ringRef.current.rotation.z += 0.05;
      ringRef.current.scale.setScalar(Math.sin(state.clock.elapsedTime * 2) * 0.3 + 1.5);
    }
  });

  return (
    <group position={[x, y, z]}>
      {/* Pulsating ring when location is selected */}
      {isSelected && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.08, 0.12, 32]} />
          <meshBasicMaterial color={location.color} transparent opacity={0.6} />
        </mesh>
      )}
      
      {/* Main interactive marker sphere */}
      <mesh
        ref={meshRef}
        onClick={() => onClick(location)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color={location.color} />
      </mesh>
      
      {/* Subtle, non-interactive glow sphere */}
      <mesh>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color={location.color} transparent opacity={0.3} />
      </mesh>
      
      {/* HTML label (tooltip) that appears on hover or selection */}
      {(hovered || isSelected) && (
        <Html distanceFactor={8} style={{ zIndex: 10 }}>
          <div 
            className="bg-gray-900/95 backdrop-blur-xl border-2 border-cyan-400/60 text-cyan-100 px-4 py-2 rounded-lg text-sm whitespace-nowrap pointer-events-none shadow-lg shadow-cyan-500/50"
            style={{ userSelect: 'none' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <span className="font-semibold">{location.name}</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * SatelliteModel Component: Loads and renders a GLB model for a satellite.
 * Clones and modifies the material for consistent styling (emissive color).
 */
function SatelliteModel({ modelPath, color, scale = 0.1 }) {
  const { scene } = useGLTF(modelPath);
  // Clone and modify the scene to apply custom materials and color.
  const modifiedScene = useMemo(() => {
    const clonedScene = scene.clone();
    
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        // Clone material to ensure each satellite instance is unique.
        child.material = child.material.clone(); 
        child.material.emissive = new THREE.Color(color);
        child.material.emissiveIntensity = 0.5;
        child.material.metalness = 0.8;
        child.material.roughness = 0.2;
      }
    });

    return clonedScene;
  }, [scene, color]);
  
  return <primitive object={modifiedScene} scale={scale} />;
}

/**
 * Satellite Component: Renders a satellite model and handles its orbital animation.
 * The orbit uses a simplified, inclined circular path.
 */
function Satellite({ satellite }) {
  const groupRef = useRef();
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  // Random initial angle for staggered starting positions.
  const [initialAngle] = useState(() => Math.random() * 2 * Math.PI);
  const orbitalRadius = satellite.altitude;
  // Calculate speed factor based on orbital period.
  const speedFactor = ((2 * Math.PI) / satellite.period) * 0.01;
  const inclination = satellite.orbitInclination;
  
  // Animation loop to update satellite position in its orbit.
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const time = clock.elapsedTime;
      const angle = time * speedFactor + initialAngle;

      // Calculate position in the orbital plane (x, y_base)
      const x = orbitalRadius * Math.cos(angle);
      const y_base = orbitalRadius * Math.sin(angle);
      
      // Apply orbital inclination to y and z coordinates (rotation around x-axis).
      const y = y_base * Math.cos(inclination);
      const z = y_base * Math.sin(inclination);
      
      groupRef.current.position.set(x, y, z);
      // Add slight self-rotation for visual effect.
      groupRef.current.rotation.y += 0.02;
      groupRef.current.rotation.x += 0.01;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <SatelliteModel 
          modelPath={satellite.model} 
          color={satellite.color}
          scale={satellite.scale}
        />
      </mesh>
      
      {/* Subtle glow sphere around the satellite */}
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color={satellite.color} transparent opacity={0.3} />
      </mesh>

      {/* HTML tooltip on hover */}
      {hovered && (
        <Html distanceFactor={10}>
          <div 
            className="text-xs whitespace-nowrap pointer-events-none px-2 py-1 rounded-md bg-gray-900/90 border-2 font-semibold" 
            style={{ 
              color: satellite.color,
              borderColor: satellite.color + '80',
              userSelect: 'none'
            }}
          >
            {satellite.name}
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * StationModel Component: Loads and prepares the 3D model for the space station.
 * Clones and applies custom material properties.
 */
function StationModel({ modelPath, color, scale = 0.1 }) {
  const { scene } = useGLTF(modelPath);

  const modifiedScene = useMemo(() => {
    const clonedScene = scene.clone();

    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone(); 
        child.material.emissive = new THREE.Color(color);
        child.material.emissiveIntensity = 0.5;
        child.material.metalness = 0.8;
        child.material.roughness = 0.2;
      }
    });
    return clonedScene;
  }, [scene, color]); // Dependencies

  return <primitive object={modifiedScene} scale={scale} />;
}

/**
 * Astronaut Component: Loads and places the astronaut model, relative to the SpaceStation.
 */
function Astronaut({ initialPosition }) {
  const astronautRef = useRef();
  const { scene: astronautScene } = useGLTF(`${baseUrl}/assets/characters/Spacesuit.glb`);

  // Clone and modify the astronaut scene for styling.
  const clonedAstronautScene = useMemo(() => {
    if (!astronautScene) return new THREE.Group(); 
    const clonedScene = astronautScene.clone();
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.emissive = new THREE.Color('#ffffff');
        child.material.emissiveIntensity = 0.3;
        child.material.metalness = 0.6;
        child.material.roughness = 0.4;
      }
    });
    return clonedScene;
  }, [astronautScene]); // Dependency on the loaded model

  // Set initial position once the component mounts or initialPosition changes.
  useEffect(() => {
    if (astronautRef.current && initialPosition) {
      astronautRef.current.position.copy(initialPosition);
    }
  }, [initialPosition]);

  return (
    <group ref={astronautRef}>
      <primitive object={clonedAstronautScene} scale={0.05} />
    </group>
  );
}

/**
 * SpaceStation Component: Renders the ISS model and handles its specific orbital parameters and animation.
 * Also includes the Astronaut component.
 */
function SpaceStation() {
  const groupRef = useRef();
  const stationRef = useRef();
  const orbitalRadius = 700 * 0.000314 + 2.5;
  const period = 92.68 / 60;
  const speedFactor = ((2 * Math.PI) / period) * 0.01;
  const inclination = (51.6 * Math.PI) / 180;

  // Animation loop for orbital movement.
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const time = clock.elapsedTime;
      const angle = time * speedFactor;
      // Circular motion in the base plane (x, z_base)
      const x_base = orbitalRadius * Math.cos(angle);
      const z_base = orbitalRadius * Math.sin(angle);

      const x = x_base;
      // Apply inclination to y and z based on the orbital angle.
      const y = z_base * Math.sin(inclination);
      const z = z_base * Math.cos(inclination);

      groupRef.current.position.set(x, y, z);
      stationRef.current.rotation.y += 0.005; // Station self-rotation
    }
  });

  const astronautInitialPosition = new THREE.Vector3(0.3, 0.3, 0.3);

  return (
    <group ref={groupRef}>
      <group ref={stationRef}>
        <StationModel
          modelPath={`${baseUrl}/assets/characters/International-Space-Station.glb`}
          color="#f6e0b5"
          scale={0.08}
        />
      </group>
      {/* Astronaut positioned relative to the station's local origin */}
      <Astronaut
        initialPosition={astronautInitialPosition}
        stationRef={stationRef}
      />
    </group>
  );
}

/**
 * Dashboard Component: Displays the weather and solar data for the selected location.
 * Manages data fetching, loading, and error states.
 * @param {object} props - Component properties.
 * @param {object} props.location - The selected location object (name, lat, lon).
 */
function Dashboard({ location }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Effect to fetch data whenever the selected location changes.
  useEffect(() => {
    if (location) {
      setLoading(true);
      setError(null);
      fetchNASAData(location.lat, location.lon)
        .then(({ parameters, radiations }) => {
          if (parameters?.properties?.parameter) {
            const params = parameters.properties.parameter;
            const allDates = Object.keys(params.T2M || {});
            // Filter out dates with missing values (-999).
            const validDates = allDates.filter(date => params.T2M?.[date] !== -999);
            
            if (validDates.length === 0) {
              throw new Error('No valid data available for this location');
            }
            
            // Limit chart data to the latest 7 days.
            const chartDates = validDates.slice(-7);
            const chartData = chartDates.map(date => {
              // Helper to safely extract and format NASA parameter data.
              const safeValueParameters = (param, date) => {
                const value = params[param]?.[date];
                return value !== -999 ? parseFloat(value.toFixed(1)) : null;
              };
              
              // Helper to calculate daily average radiation from hourly data or use NASA fallback.
              const safeValueRadiations = (param, date, fallback = null) => {
                if (!radiations || radiations.error || !radiations.hourly || !radiations.hourly[param]) {
                  const value = params[fallback]?.[date];
                  return value !== -999 ? parseFloat(value.toFixed(1)) : null;
                }
                // ... (Logic to find daily average from hourly data) ...
                const dateObj = new Date(
                  parseInt(date.slice(0, 4)),
                  parseInt(date.slice(4, 6)) - 1,
                  parseInt(date.slice(6, 8))
                );
                const targetDate = formatDateWithoutHyphen(dateObj);
                const indices = radiations.hourly.time
                  .map((time, index) => (time.startsWith(targetDate) ? index : -1))
                  .filter(index => index !== -1);
                if (indices.length === 0) return null;
                const values = indices.map(index => radiations.hourly[param][index]);
                const validValues = values.filter(val => val !== null && val !== undefined && !isNaN(val));
                if (validValues.length === 0) return null;
                const average = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
                const maxRadiation = 1000;
                // Represent solar radiation as a percentage of a max value.
                const percentage = (average / maxRadiation) * 100;
                return parseFloat(percentage.toFixed(1));
              };

              return {
                date: date.slice(4, 6) + '/' + date.slice(6, 8),
                temp: safeValueParameters('T2M', date),
                humidity: safeValueParameters('RH2M', date),
                wind: safeValueParameters('WS10M', date),
                solar: safeValueRadiations('diffuse_radiation_instant', date, "ALLSKY_SFC_SW_DWN"),
              };
            }).filter(item => item.temp !== null);
            
            const latestDate = chartDates[chartDates.length - 1];
            const latest = chartData[chartData.length - 1] || {};
            const currentData = {
              temp: latest.temp || 0,
              humidity: latest.humidity || 0,
              wind: latest.wind || 0,
              solar: latest.solar || 0,
            };
            
            setData({
              current: currentData,
              chart: chartData,
              latestDate: latestDate,
            });
          } else {
            throw new Error('Invalid data format received from API');
          }
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message || 'Failed to fetch data');
          setLoading(false);
        });
    }
  }, [location]);

  // Initial state: No location selected.
  if (!location) {
    return (
      <div className="h-full flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5"></div>
        <div className="text-center relative z-10 px-4">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full"></div>
            <Eye className="w-20 h-20 mx-auto text-cyan-400 relative animate-pulse" />
          </div>
          <p className="text-2xl font-bold text-cyan-100 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)] mb-2">
            SELECT COORDINATES
          </p>
          <p className="text-cyan-200 text-sm tracking-wider font-medium">CLICK ANY MARKER TO INITIALIZE SCAN</p>
        </div>
      </div>
    );
  }

  // Loading state: Data is being fetched.
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="relative text-center">
          <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full animate-pulse"></div>
          <Loader2 className="w-16 h-16 animate-spin text-cyan-400 relative mb-3" />
          <p className="text-cyan-100 text-sm relative font-semibold">RETRIEVING SATELLITE DATA...</p>
        </div>
      </div>
    );
  }

  // Error state: Data fetching failed.
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="bg-red-500/10 border-2 border-red-500/50 backdrop-blur-xl rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-red-100 mb-2">Error Loading Data</h3>
          <p className="text-red-200 text-sm mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-100 font-semibold transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Main Dashboard content display.
  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative z-10">
        {/* Header with location and coordinates */}
        <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 backdrop-blur-xl border-2 border-cyan-500/40 rounded-2xl p-6 mb-6 shadow-lg shadow-cyan-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-500/50"></div>
            <h2 className="text-3xl font-bold text-cyan-100 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
              {location.name}
            </h2>
          </div>
          <div className="flex items-center gap-4 text-cyan-100 text-sm font-mono font-semibold">
            <span className="bg-cyan-500/30 px-3 py-1 rounded-lg border-2 border-cyan-400/50">
              LAT: {location.lat.toFixed(4)}°
            </span>
            <span className="bg-purple-500/30 px-3 py-1 rounded-lg border-2 border-purple-400/50">
              LON: {location.lon.toFixed(4)}°
            </span>
          </div>
          <p className="text-xs text-cyan-200 mt-3 flex items-center justify-between font-medium">
            <span><Activity className="w-3 h-3 inline mr-1" /> NASA POWER | LIVE SATELLITE DATA</span>
            <span className="text-cyan-100 font-mono font-semibold">LAST UPDATE: {formatDisplayDate(data?.latestDate)}</span>
          </p>
        </div>

        {/* Metrics Grid: Temperature, Humidity, Wind Speed, Solar Radiation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Temperature */}
          <div className="group relative bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-xl p-5 rounded-2xl border-2 border-orange-500/40 hover:border-orange-400/60 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-500/30 rounded-xl border-2 border-orange-400/50">
                  <Thermometer className="w-6 h-6 text-orange-300" />
                </div>
                <div>
                  <p className="text-xs text-orange-100 tracking-wider font-semibold">TEMPERATURE</p>
                  <p className="text-3xl font-bold text-orange-100 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]">{data?.current.temp}°C</p>
                </div>
              </div>
              <div className="h-1 bg-orange-500/30 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full" style={{width: `${Math.min((data?.current.temp / 40) * 100, 100)}%`}}></div>
              </div>
            </div>
          </div>

          {/* Humidity Card */}
          <div className="group relative bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-xl p-5 rounded-2xl border-2 border-cyan-500/40 hover:border-cyan-400/60 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-cyan-500/30 rounded-xl border-2 border-cyan-400/50">
                  <Droplets className="w-6 h-6 text-cyan-300" />
                </div>
                <div>
                  <p className="text-xs text-cyan-100 tracking-wider font-semibold">HUMIDITY</p>
                  <p className="text-3xl font-bold text-cyan-100 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">{data?.current.humidity}%</p>
                </div>
              </div>
              <div className="h-1 bg-cyan-500/30 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{width: `${data?.current.humidity}%`}}></div>
              </div>
            </div>
          </div>
          
          {/* Secondary Metrics Container */}
          <div className="col-span-1 lg:col-span-2 grid grid-cols-2 gap-4">
            {/* Wind Speed Card */}
            <div className="group relative bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-xl p-5 rounded-2xl border-2 border-green-500/40 hover:border-green-400/60 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-500/30 rounded-xl border-2 border-green-400/50">
                    <Wind className="w-6 h-6 text-green-300" />
                  </div>
                  <div>
                    <p className="text-xs text-green-100 tracking-wider font-semibold">WIND SPEED</p>
                    <p className="text-3xl font-bold text-green-100 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">{data?.current.wind} m/s</p>
                  </div>
                </div>
                <div className="h-1 bg-green-500/30 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" style={{width: `${Math.min((data?.current.wind / 20) * 100, 100)}%`}}></div>
                </div>
              </div>
            </div>

            {/* Solar Radiation Card */}
            <div className="group relative bg-gradient-to-br from-yellow-500/20 to-amber-500/20 backdrop-blur-xl p-5 rounded-2xl border-2 border-yellow-500/40 hover:border-yellow-400/60 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-yellow-500/30 rounded-xl border-2 border-yellow-400/50">
                    <Sun className="w-6 h-6 text-yellow-300" />
                  </div>
                  <div>
                    <p className="text-xs text-yellow-100 tracking-wider font-semibold">SOLAR RADIATION</p>
                    <p className="text-3xl font-bold text-yellow-100 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]">{data?.current.solar}%</p>
                  </div>
                </div>
                <div className="h-1 bg-yellow-500/30 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full" style={{width: `${Math.min((data?.current.solar / 10) * 100, 100)}%`}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Temperature & Humidity Chart (Area Chart) */}
        <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 backdrop-blur-xl p-6 rounded-2xl border-2 border-cyan-500/40 mb-4 shadow-lg shadow-cyan-500/10">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-cyan-300" />
            <h3 className="text-lg font-bold text-cyan-100 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
              7-DAY ANALYSIS
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.chart}>
              {/* Gradient definitions for fill colors */}
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="humidityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="date" stroke="#94a3b8" style={{fontSize: '12px', fontWeight: '600'}} />
              <YAxis stroke="#94a3b8" style={{fontSize: '12px', fontWeight: '600'}} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '2px solid rgba(6, 182, 212, 0.4)', 
                  borderRadius: '12px',
                  backdropFilter: 'blur(8px)',
                  fontWeight: '600'
                }}
                labelStyle={{ color: '#06b6d4', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={2} fill="url(#tempGradient)" name="Temp (°C)" />
              <Area type="monotone" dataKey="humidity" stroke="#06b6d4" strokeWidth={2} fill="url(#humidityGradient)" name="Humidity (%)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Wind & Solar Chart (Line Chart) */}
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl p-6 rounded-2xl border-2 border-purple-500/40 shadow-lg shadow-purple-500/10">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-purple-300" />
            <h3 className="text-lg font-bold text-purple-100 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">
              WIND & SOLAR METRICS
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data?.chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="date" stroke="#94a3b8" style={{fontSize: '12px', fontWeight: '600'}} />
              <YAxis stroke="#94a3b8" style={{fontSize: '12px', fontWeight: '600'}} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '2px solid rgba(168, 85, 247, 0.4)', 
                  borderRadius: '12px',
                  backdropFilter: 'blur(8px)',
                  fontWeight: '600'
                }}
                labelStyle={{ color: '#a855f7', fontWeight: 'bold' }}
              />
              <Line type="monotone" dataKey="wind" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} name="Wind (m/s)" />
              <Line type="monotone" dataKey="solar" stroke="#eab308" strokeWidth={3} dot={{ fill: '#eab308', r: 4 }} name="Solar (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/**
 * App Component: The main container for the application.
 * Manages state for the selected location, dashboard visibility, and full-screen mode.
 * Renders the 3D Globe (Canvas) and the Data Dashboard.
 */
export default function App() {
  const [selectedLocation, setSelectedLocation] = useState(null); 
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const orbitControlsRef = useRef();

  // Function to toggle full-screen mode for the document.
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullScreen(true);
      }).catch((err) => {
        console.error('Error attempting to enable full-screen mode:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullScreen(false);
      }).catch((err) => {
        console.error('Error attempting to exit full-screen mode:', err);
      });
    }
  };

  // Handler for clicking a location marker on the globe.
  const handleLocationClick = (location) => {
    setSelectedLocation(location);
    setShowDashboard(true);
  };

  // Toggles the visibility of the data dashboard (desktop button).
  const toggleDashboard = () => {
    setShowDashboard(!showDashboard);
  };

  // Mobile drag handlers for toggling the dashboard (pull-up gesture).
  const handleTouchStart = (e) => {
    setDragStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = dragStartY - currentY;
    setDragOffset(diff);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // Determine whether to show/hide based on drag distance.
    if (dragOffset > 50) {
      setShowDashboard(true);
    } else if (dragOffset < -50) {
      setShowDashboard(false);
    }
    setDragOffset(0);
  };

  // Effect to listen for native full-screen changes (e.g., via ESC key).
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  return (
    <div className="w-full h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-cyan-950 flex flex-col lg:flex-row relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        {/* Background grid pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Full-screen toggle button */}
      <button
        onClick={toggleFullScreen}
        className="absolute top-4 right-6 z-50 p-3 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 backdrop-blur-xl border-2 border-cyan-500/40 rounded-full shadow-lg shadow-cyan-500/30 hover:bg-cyan-500/30 hover:scale-110 transition-all duration-300"
        title={isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}
      >
        {isFullScreen ? (
          <Minimize className="w-6 h-6 text-cyan-300" />
        ) : (
          <Maximize className="w-6 h-6 text-cyan-300" />
        )}
      </button>

      {/* Desktop Dashboard toggle button (fixed side tab) */}
      <button
        onClick={toggleDashboard}
        className={`hidden lg:flex fixed z-50 p-4 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 backdrop-blur-xl border-2 border-cyan-400/50 rounded-l-2xl shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] hover:scale-105 transition-all duration-500 items-center justify-center group ${
          showDashboard ? 'right-[550px]' : 'right-0'
        } top-1/2 transform -translate-y-1/2`}
        style={{ zIndex: 99999999 }}
        title={showDashboard ? 'Hide Dashboard' : 'Show Dashboard'}
      >
        <div className="relative">
          <div className="absolute inset-0 bg-cyan-400/30 blur-xl rounded-full animate-pulse"></div>
          <ChevronRight className={`w-7 h-7 text-cyan-100 relative transition-transform duration-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] ${
            !showDashboard ? 'rotate-180' : ''
          }`} />
        </div>
      </button>

      {/* Globe Section (3D Canvas) */}
      <div 
        className={`h-[60vh] lg:h-full relative transition-all duration-700 ease-out ${
          showDashboard ? 'lg:flex-none lg:w-[calc(100%-550px)]' : 'lg:w-[100%]'
        }`}
      >
        {/* Header/Logo */}
        <div className="absolute top-6 left-6 z-10">
          <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 backdrop-blur-xl border-2 border-cyan-500/40 rounded-2xl p-0 shadow-2xl shadow-cyan-500/30">
            <div className="flex items-start">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500/30 blur-lg rounded-full"></div>
                <img
                  className="relative"
                  src={`${baseUrl}logo-removebg.png`}
                  alt="Logo"
                  style={{ width: "100px", height: "100px" }}
                />
              </div>
              <div className="flex flex-col justify-evenly p-4">
                <h1 className="text-4xl font-bold text-cyan-100 drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]">
                  EARTH MONITOR
                </h1>
                <p className="text-cyan-200 font-mono text-sm tracking-wide mt-2 font-semibold">
                  NASA POWER | LIVE SATELLITE DATA
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Three.js Canvas */}
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <OrbitControls ref={orbitControlsRef} autoRotate speed={0.5} enableDamping dampingFactor={0.05} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          {/* Suspense is required for components using useLoader/useGLTF/useTexture */}
          <Suspense fallback={null}> 
            <Earth 
              onLocationClick={handleLocationClick}
              selectedLocation={selectedLocation}
            /> 
          </Suspense>
        </Canvas>

        {/* Mobile drag handle */}
        <div 
          className="lg:hidden absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-gray-900/80 to-transparent pt-6 pb-2 flex justify-center"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="bg-cyan-500/30 backdrop-blur-xl border-2 border-cyan-400/50 rounded-full p-2 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <GripHorizontal className="w-8 h-8 text-cyan-300" />
          </div>
        </div>
      </div>

      {/* Dashboard Section */}
      <div 
        className={`h-[40vh] lg:h-full lg:border-l bg-gradient-to-br from-gray-950/95 via-gray-900/95 to-cyan-950/95 backdrop-blur-xl border-cyan-500/30 shadow-2xl shadow-cyan-500/20 relative transition-all duration-700 ease-out ${
          showDashboard 
            ? 'w-full lg:w-[550px] translate-y-0 lg:translate-y-0 opacity-100' 
            : 'w-full lg:w-0 translate-y-full lg:translate-y-0 opacity-0'
        }`}
        style={{
          transform: showDashboard 
            ? 'perspective(1000px) rotateY(0deg)' 
            : 'perspective(1000px) rotateY(-15deg)',
          transformOrigin: 'left center',
        }}
      >
        {/* Holographic border effect (top and bottom pulsing lines) */}
        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${showDashboard ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse" style={{animationDelay: '0.5s'}}></div>
        </div>
        
        <Dashboard location={selectedLocation} />
      </div>
    </div>
  );
}