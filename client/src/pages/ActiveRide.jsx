import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  DirectionsRenderer,
} from '@react-google-maps/api';
import {
  AlertCircle,
  Bell,
  Clock,
  Compass,
  DollarSign,
  Heart,
  Navigation,
  Phone,
  Power,
  Shield,
  Star,
  Users,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
};

const GOOGLE_LIBRARIES = ['places'];
const BENGALURU_CENTER = { lat: 12.9716, lng: 77.5946 };

const MAP_OPTIONS = {
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#15171b' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8b96aa' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0e1012' }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1c1f24' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#23262d' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1c1f24' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1012' }] },
  ],
  disableDefaultUI: true,
  zoomControl: true,
};

export default function ActiveRide() {
  const { id: rideId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [ride, setRide] = useState(null);
  const [driverLoc, setDriverLoc] = useState(null);
  const [directions, setDirections] = useState(null);
  const [status, setStatus] = useState('scheduled'); // 'scheduled', 'ongoing', 'completed'
  const [sosActive, setSosActive] = useState(false);
  const [sosUser, setSosUser] = useState(null);

  // Simulation variables
  const [simulating, setSimulating] = useState(false);
  const simulationIntervalRef = useRef(null);
  const pathCoordinatesRef = useRef([]);
  const pathIndexRef = useRef(0);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_LIBRARIES,
  });

  // Watch current location if driver
  const locationWatchRef = useRef(null);

  // Callback mapping for socket events
  const onEventMap = useCallback({
    ride_started: (data) => {
      setStatus('ongoing');
      setDriverLoc(data.driverLocation);
    },
    location_updated: (data) => {
      setDriverLoc({ lat: data.lat, lng: data.lng });
    },
    emergency_alert: (data) => {
      setSosUser(data.userName);
      setSosActive(true);
    },
    ride_completed: () => {
      setStatus('completed');
      setSimulating(false);
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    },
  }, []);

  // Initialize socket hook
  const { emit } = useSocket(rideId, onEventMap);

  // Fetch initial ride details
  const fetchRideDetails = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/rides/${rideId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setRide(data.ride);
        setStatus(data.ride.status);
        if (data.ride.liveLocations && data.ride.liveLocations.length > 0) {
          const lastLoc = data.ride.liveLocations[data.ride.liveLocations.length - 1];
          setDriverLoc({ lat: lastLoc.lat, lng: lastLoc.lng });
        }
      }
    } catch (err) {
      console.error('Error loading ride:', err);
    }
  }, [rideId, token]);

  useEffect(() => {
    fetchRideDetails();
  }, [fetchRideDetails]);

  // Load directions polyline on mount
  useEffect(() => {
    if (!isLoaded || !ride) return;

    const directionsService = new window.google.maps.DirectionsService();

    const startLat = ride?.matchId?.driverRouteId?.fromCoords?.coordinates[1] || ride.liveLocations[0]?.lat || 12.9698;
    const startLng = ride?.matchId?.driverRouteId?.fromCoords?.coordinates[0] || ride.liveLocations[0]?.lng || 77.7499;
    const destLat = ride?.matchId?.driverRouteId?.toCoords?.coordinates[1] || 12.9352;
    const destLng = ride?.matchId?.driverRouteId?.toCoords?.coordinates[0] || 77.6244;

    directionsService.route(
      {
        origin: new window.google.maps.LatLng(startLat, startLng),
        destination: new window.google.maps.LatLng(destLat, destLng),
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
          // Store polyline points for driving simulation
          const points = result.routes[0].overview_path.map((p) => ({
            lat: p.lat(),
            lng: p.lng(),
          }));
          pathCoordinatesRef.current = points;
        }
      }
    );
  }, [ride, isLoaded]);

  // Handle Driver Location updates (Native Geolocation Watcher)
  const isDriver = ride && user && ride.driverId._id === user._id;

  const startSharingLocation = () => {
    if (navigator.geolocation) {
      locationWatchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setDriverLoc({ lat, lng });
          emit('share_location', { lat, lng });
        },
        (err) => console.error('Error sharing geolocation:', err),
        { enableHighAccuracy: true, distanceFilter: 10 }
      );
    }
  };

  const stopSharingLocation = () => {
    if (locationWatchRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    }
  };

  // Simulating route motion along the polyline path (Dev helper)
  const toggleSimulation = () => {
    if (simulating) {
      clearInterval(simulationIntervalRef.current);
      setSimulating(false);
      stopSharingLocation();
    } else {
      if (pathCoordinatesRef.current.length === 0) return;
      setSimulating(true);
      pathIndexRef.current = 0;

      simulationIntervalRef.current = setInterval(() => {
        const index = pathIndexRef.current;
        if (index >= pathCoordinatesRef.current.length) {
          // Finished route simulation
          clearInterval(simulationIntervalRef.current);
          setSimulating(false);
          handleEndRide();
          return;
        }

        const point = pathCoordinatesRef.current[index];
        setDriverLoc(point);
        emit('share_location', point);
        pathIndexRef.current = index + 1;
      }, 1500); // update marker every 1.5 seconds
    }
  };

  // Trigger: Leaving Now
  const handleLeavingNow = () => {
    const initialLoc = pathCoordinatesRef.current[0] || { lat: 12.9698, lng: 77.7499 };
    setDriverLoc(initialLoc);
    setStatus('ongoing');
    emit('leaving_now', initialLoc);

    if (isDriver) {
      startSharingLocation();
    }
  };

  // Trigger: SOS alarm
  const handleSOS = () => {
    const loc = driverLoc || { lat: 12.9698, lng: 77.7499 };
    emit('emergency_sos', { userId: user._id, lat: loc.lat, lng: loc.lng });
  };

  // Trigger: End Ride
  const handleEndRide = () => {
    stopSharingLocation();
    emit('end_ride');
    setStatus('completed');
  };

  useEffect(() => {
    return () => {
      stopSharingLocation();
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };
  }, []);

  if (!ride) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center text-sm text-slate-400">
        Syncing ride coordinates...
      </div>
    );
  }

  const partner = isDriver ? ride.passengerId : ride.driverId;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-transparent relative">
      {/* Emergency SOS pulsing red alert overlay */}
      {sosActive && (
        <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center px-6 text-center animate-pulse">
          <div className="bg-red-600 p-6 rounded-full text-white mb-5 animate-bounce shadow-lg shadow-red-600/50">
            <Shield size={48} className="animate-spin" />
          </div>
          <h1 className="text-3xl font-extrabold text-white uppercase tracking-wider">
            Emergency SOS Active
          </h1>
          <p className="text-sm text-red-200 mt-2 max-w-md leading-relaxed">
            {sosUser} tapped the SOS alarm. The driver's location is actively broadcasted, and the Bengaluru City Police hotline (112) is being notified.
          </p>
          <div className="flex gap-4 mt-8 w-full max-w-sm">
            <a
              href="tel:112"
              className="flex-1 bg-white hover:bg-slate-100 text-red-700 font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-1.5 transition-colors"
            >
              <Phone size={16} /> Call Police (112)
            </a>
            <button
              onClick={() => setSosActive(false)}
              className="flex-1 bg-red-800 hover:bg-red-700 border border-red-700 text-white font-bold py-3.5 rounded-xl text-sm transition-colors"
            >
              Dismiss Alarm
            </button>
          </div>
        </div>
      )}

      {/* Control panel */}
      <div className="w-full md:w-[400px] border-r border-brand-border/60 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto px-6 py-6 shrink-0 relative z-20">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-lg font-extrabold text-white tracking-tight">Active Commute</h2>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
            status === 'ongoing' ? 'bg-emerald-950 text-brand-accent animate-pulse border border-brand-accent/20' : 'bg-slate-900 text-slate-400 border border-slate-700'
          }`}>
            {status === 'ongoing' ? 'Ongoing Ride' : status === 'completed' ? 'Completed' : 'Scheduled'}
          </span>
        </div>

        {/* User Card info */}
        <div className="bg-brand-card/50 border border-brand-border p-4 rounded-xl flex items-center gap-3.5 mb-6">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
            <span className="text-sm font-bold text-slate-300">{partner.name.substring(0, 2).toUpperCase()}</span>
          </div>
          <div>
            <h4 className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              {isDriver ? 'Your Passenger' : 'Your Driver'}
            </h4>
            <h3 className="text-sm font-bold text-white mt-0.5">{partner.name}</h3>
            <span className="text-[10px] text-brand-accent flex items-center gap-0.5 mt-0.5 font-medium">
              Trust Score: {partner.trustScore}/100
            </span>
          </div>
        </div>

        {/* Main interactive triggers */}
        <div className="space-y-4 mb-6">
          {/* Driver specific triggers */}
          {isDriver && status === 'scheduled' && (
            <button
              onClick={handleLeavingNow}
              className="w-full bg-brand-accent hover:bg-brand-accentHover text-slate-900 font-bold py-3.5 rounded-xl text-sm transition-all shadow-md shadow-brand-accent/15"
            >
              Start Ride ("Leaving Now")
            </button>
          )}

          {isDriver && status === 'ongoing' && (
            <div className="space-y-3">
              <button
                onClick={toggleSimulation}
                className={`w-full py-3 rounded-xl text-xs font-semibold transition-all border ${
                  simulating
                    ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                    : 'bg-indigo-950/80 border-indigo-700 text-indigo-300'
                }`}
              >
                {simulating ? 'Stop Driving Simulation' : 'Simulate Drive Route'}
              </button>

              <button
                onClick={handleEndRide}
                className="w-full bg-slate-900 border border-brand-border hover:bg-slate-800 text-slate-200 font-semibold py-3.5 rounded-xl text-sm transition-all"
              >
                Mark Destination Reached
              </button>
            </div>
          )}

          {/* Passenger status alerts */}
          {!isDriver && status === 'scheduled' && (
            <div className="bg-slate-900/60 border border-brand-border/60 p-4 rounded-xl text-center text-xs text-slate-400">
              <Bell className="mx-auto text-slate-500 mb-2 animate-bounce" size={18} />
              <span>Waiting for {partner.name} to tap "Leaving Now". You will receive a live notification immediately.</span>
            </div>
          )}

          {/* SOS button (active for both driver and passenger) */}
          {status === 'ongoing' && (
            <button
              onClick={handleSOS}
              className="w-full bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 text-red-200 font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-1.5 transition-all animate-pulse shadow-lg shadow-red-950/20"
            >
              <Shield size={16} className="text-red-400" />
              Emergency SOS Button
            </button>
          )}
        </div>

        {/* UPI Split details drawer when completed */}
        {status === 'completed' && (
          <div className="mt-2 bg-emerald-950/30 border border-emerald-900/60 p-5 rounded-2xl flex flex-col items-center text-center animate-fade-in">
            <Heart className="text-brand-accent animate-bounce" size={24} />
            <h3 className="text-sm font-extrabold text-white mt-3">Ride Completed Successfully!</h3>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[280px]">
              Coordinate directly to settle payments. suggested UPI split amount is:
            </p>
            <div className="my-4 bg-slate-950/80 px-5 py-3 rounded-xl border border-brand-border flex items-center gap-2">
              <DollarSign className="text-brand-accent" size={18} />
              <span className="text-2xl font-black text-white">₹{ride.splitAmount}</span>
            </div>

            {/* Simulated UPI QR Code or link */}
            <a
              href={`upi://pay?pa=${ride.upiId}&pn=${ride.driverId.name}&am=${ride.splitAmount}&cu=INR`}
              className="w-full bg-brand-accent hover:bg-brand-accentHover text-slate-900 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 shadow-md shadow-brand-accent/5"
            >
              Pay via UPI Deep Link
            </a>
            <span className="text-[10px] text-slate-500 mt-2">UPI ID: {ride.upiId}</span>

            <button
              onClick={() => navigate('/')}
              className="mt-4 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </div>

      {/* Full-bleed map tracking area */}
      <div className="flex-1 h-[400px] md:h-[calc(100vh-4rem)] relative z-10">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={driverLoc || BENGALURU_CENTER}
            zoom={13}
            options={{
              styles: [
                { elementType: 'geometry', stylers: [{ color: '#161F30' }] },
                { elementType: 'labels.text.fill', stylers: [{ color: '#747D8C' }] },
                { elementType: 'labels.text.stroke', stylers: [{ color: '#1A2536' }] },
                { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2C3A4E' }] },
                { featureType: 'poi', stylers: [{ visibility: 'off' }] },
                { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#202D42' }] },
                { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2E3D55' }] },
                { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0F172A' }] },
              ],
            }}
          >
            {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />}

            {/* Driver Live Marker */}
            {driverLoc && (
              <Marker
                position={driverLoc}
                icon={{
                  url: 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36"><circle cx="12" cy="12" r="10" fill="%2310B981" stroke="%23FFFFFF" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="%23059669"/></svg>',
                  scaledSize: new window.google.maps.Size(36, 36),
                  anchor: new window.google.maps.Point(18, 18),
                }}
                title="Driver live location"
              />
            )}
          </GoogleMap>
        ) : (
          <div className="w-full h-full bg-slate-900 flex items-center justify-center text-sm text-slate-500">
            Connecting real-time map...
          </div>
        )}
      </div>
    </div>
  );
}
