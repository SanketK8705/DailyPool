import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  DirectionsRenderer,
} from '@react-google-maps/api';
import {
  MapPin,
  Clock,
  Users,
  Compass,
  ArrowRight,
  Star,
  Activity,
  Plus,
  HelpCircle,
} from 'lucide-react';
import SpotlightCard from '../components/ui/SpotlightCard';
import BorderGlow from '../components/ui/BorderGlow';
import StarBorder from '../components/ui/StarBorder';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
};

const BENGALURU_CENTER = {
  lat: 12.9716,
  lng: 77.5946,
};

const GOOGLE_LIBRARIES = ['places'];

export default function Dashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Data states
  const [routes, setRoutes] = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeRides, setActiveRides] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [directions, setDirections] = useState(null);
  const [loading, setLoading] = useState(true);

  // Map settings
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_LIBRARIES,
  });

  const [map, setMap] = useState(null);

  const onMapLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  const onMapUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Fetch all user dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      // Fetch user's posted routes
      const routeRes = await fetch(`${API_URL}/api/routes/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const routeData = await routeRes.json();
      if (routeData.success) {
        setRoutes(routeData.routes);
        if (routeData.routes.length > 0 && !selectedRoute) {
          setSelectedRoute(routeData.routes[0]);
        }
      }

      // Fetch matches
      const matchRes = await fetch(`${API_URL}/api/matches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const matchData = await matchRes.json();
      if (matchData.success) setMatches(matchData.matches);

      // Fetch active rides
      const rideRes = await fetch(`${API_URL}/api/rides/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rideData = await rideRes.json();
      if (rideData.success) setActiveRides(rideData.rides);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [token, selectedRoute]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle directions rendering when a route or match is clicked
  useEffect(() => {
    if (!isLoaded) return;

    let originCoords = null;
    let destCoords = null;

    if (selectedMatch) {
      const driverRoute = selectedMatch.driverRouteId;
      if (driverRoute) {
        originCoords = driverRoute.fromCoords.coordinates;
        destCoords = driverRoute.toCoords.coordinates;
      }
    } else if (selectedRoute) {
      originCoords = selectedRoute.fromCoords.coordinates;
      destCoords = selectedRoute.toCoords.coordinates;
    }

    if (!originCoords || !destCoords) {
      setDirections(null);
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: new window.google.maps.LatLng(originCoords[1], originCoords[0]),
        destination: new window.google.maps.LatLng(destCoords[1], destCoords[0]),
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
        } else {
          console.error(`Error fetching directions:`, status);
          setDirections(null);
        }
      }
    );
  }, [selectedMatch, selectedRoute, isLoaded]);

  // Accept Match Handler
  const handleAcceptMatch = async (matchId) => {
    try {
      const response = await fetch(`${API_URL}/api/matches/${matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'accepted' }),
      });
      const data = await response.json();
      if (data.success) {
        setSelectedMatch(null);
        fetchDashboardData();
      } else {
        alert(data.error || 'Failed to accept match');
      }
    } catch (err) {
      console.error('Error accepting match:', err);
    }
  };

  // Decline Match Handler
  const handleDeclineMatch = async (matchId) => {
    try {
      const response = await fetch(`${API_URL}/api/matches/${matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'declined' }),
      });
      const data = await response.json();
      if (data.success) {
        setSelectedMatch(null);
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Error declining match:', err);
    }
  };



  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-transparent relative">
      {/* LEFT PANEL: Control Center */}
      <div className="w-full md:w-[480px] border-r border-brand-border/60 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto px-6 py-6 shrink-0 relative z-20">


        {/* Ongoing / Active Ride notification banner */}
        {activeRides.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-brand-secondary/80 to-indigo-700/80 border border-brand-secondary p-4 rounded-xl relative overflow-hidden shadow-lg shadow-brand-secondary/20">
            <div className="flex items-center gap-3">
              <div className="bg-brand-bg/80 text-brand-accent p-2 rounded-lg animate-pulse">
                <Activity size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Active Carpool Scheduled</h4>
                <p className="text-xs text-slate-200 mt-0.5">
                  Split suggestion: ₹{activeRides[0].splitAmount} • {activeRides[0].driverId.name}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/active-ride/${activeRides[0]._id}`)}
              className="mt-3.5 w-full bg-white text-brand-secondary hover:bg-slate-100 font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
            >
              Track Ride / Open Map <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Section: My Routes */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">My Commute Routes</h3>
            <Link
              to="/post-route"
              className="bg-brand-border hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all"
            >
              <Plus size={14} /> Post Route
            </Link>
          </div>

          {routes.length === 0 ? (
            <div className="bg-slate-900/40 border border-brand-border/60 rounded-xl p-5 text-center">
              <p className="text-sm text-slate-400">No recurring commutes configured yet.</p>
              <p className="text-xs text-slate-500 mt-1">Post your home → office route once to get matches automatically.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {routes.map((route) => {
                const isSelected = selectedRoute && selectedRoute._id === route._id && !selectedMatch;
                return (
                  <div
                    key={route._id}
                    onClick={() => {
                      setSelectedRoute(route);
                      setSelectedMatch(null);
                    }}
                    className={`cursor-pointer transition-all border rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden ${
                      isSelected
                        ? 'bg-slate-900/90 border-brand-secondary shadow-lg shadow-brand-secondary/15 ring-2 ring-brand-secondary/35'
                        : 'bg-brand-card/40 border-brand-border hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        route.role === 'driver' ? 'bg-emerald-950 text-brand-accent border border-brand-accent/20' : 'bg-indigo-950 text-indigo-300 border border-indigo-500/20'
                      }`}>
                        {route.role === 'driver' ? 'Driver (Offering Seats)' : 'Passenger (Cab split / carpool)'}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={12} /> {route.departureTime}
                      </span>
                    </div>

                    <div className="space-y-1.5 mt-1">
                      <div className="flex items-center gap-2 text-xs text-slate-200">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full shrink-0"></span>
                        <span className="truncate">{route.fromAddress.split(',')[0]}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-200 font-medium">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0"></span>
                        <span className="truncate">{route.toAddress.split(',')[0]}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 mt-1 border-t border-[#1c1f24] pt-2 flex justify-between items-center">
                      <span>Days: {route.days.slice(0, 3).join(', ')}{route.days.length > 3 ? '...' : ''} | Seats: {route.seats}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const res = await fetch(`${API_URL}/api/routes/${route._id}/toggle`, {
                                method: 'PUT',
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              const data = await res.json();
                              if (data.success) {
                                setRoutes(prev => prev.map(r => r._id === route._id ? { ...r, active: data.route.active } : r));
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition-colors tracking-wider ${
                            route.active ? 'bg-emerald-950 text-brand-accent border border-brand-accent/20' : 'bg-red-950 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {route.active ? 'Active' : 'Paused'}
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this commute route?')) {
                              try {
                                const res = await fetch(`${API_URL}/api/routes/${route._id}`, {
                                  method: 'DELETE',
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                const data = await res.json();
                                if (data.success) {
                                  setRoutes(prev => prev.filter(r => r._id !== route._id));
                                  if (selectedRoute?._id === route._id) {
                                    setSelectedRoute(null);
                                  }
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }
                          }}
                          className="hover:text-red-400 text-slate-500 transition-colors p-0.5"
                          title="Delete route"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section: AI Match Rankings */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Smart Ride Recommendations</h3>
          {loading ? (
            <p className="text-xs text-slate-500">Recalculating AI routing similarities...</p>
          ) : matches.length === 0 ? (
            <div className="bg-slate-900/40 border border-brand-border/60 rounded-xl p-5 text-center">
              <p className="text-sm text-slate-400">No matches found nearby yet.</p>
              <p className="text-xs text-slate-500 mt-1">AI matches paths within 500m pickup. Post coordinates inside Whitefield/Outer Ring Road to trigger matches!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => {
                const partner = user._id === match.driverId._id ? match.passengerId : match.driverId;
                const isSelected = selectedMatch && selectedMatch._id === match._id;

                return (
                  <BorderGlow
                    key={match._id}
                    onClick={() => {
                      setSelectedMatch(match);
                    }}
                    animated={isSelected}
                    borderRadius={16}
                    backgroundColor={isSelected ? 'rgba(15, 23, 42, 0.9)' : 'rgba(22, 31, 48, 0.5)'}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? 'shadow-lg shadow-brand-accent/5 border-transparent'
                        : 'hover:border-slate-700 border-brand-border/40'
                    }`}
                  >
                    <div className="p-5 flex flex-col gap-3 w-full">
                      {/* Header */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                            <span className="text-xs font-bold text-slate-300">{partner.name.substring(0, 2).toUpperCase()}</span>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-1.5 font-sans">
                              {partner.name}
                            </h4>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                              {partner.companyName || 'Commuter'} • Trust Score: {partner.trustScore}/100
                            </span>
                          </div>
                        </div>

                        {/* AI Overlap Match Score badge */}
                        <div className="text-right">
                          <div className="bg-emerald-950/80 border border-brand-accent/20 px-2 py-0.5 rounded-full text-brand-accent text-xs font-extrabold flex items-center gap-1">
                            <span>{match.overlapScore}% match</span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">Detour ETA: {match.etaMinutes}m</span>
                        </div>
                      </div>

                      {/* Description Heuristics */}
                      <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 leading-relaxed font-light font-sans">
                        {match.aiExplanation}
                      </p>

                      {/* Action buttons (only displayed if user selected card) */}
                      {isSelected && match.status === 'pending' && (
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/60">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeclineMatch(match._id);
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 rounded-xl text-xs transition-colors"
                          >
                            Decline Match
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptMatch(match._id);
                            }}
                            className="bg-brand-accent hover:bg-brand-accentHover text-slate-900 font-bold py-2 rounded-xl text-xs transition-colors shadow-md shadow-brand-accent/10"
                          >
                            Accept Carpool
                          </button>
                        </div>
                      )}
                    </div>
                  </BorderGlow>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Embedded Map */}
      <div className="flex-1 h-[400px] md:h-[calc(100vh-4rem)] relative overflow-hidden z-10">
        {/* Mapbox styled vignette dissolve overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#0e1012] to-transparent z-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0e1012] to-transparent z-20 hidden md:block" />

        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={
              selectedMatch && selectedMatch.driverRouteId
                ? {
                    lat: selectedMatch.driverRouteId.fromCoords.coordinates[1],
                    lng: selectedMatch.driverRouteId.fromCoords.coordinates[0],
                  }
                : BENGALURU_CENTER
            }
            zoom={12}
            onLoad={onMapLoad}
            onUnmount={onMapUnmount}
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
              disableDefaultUI: false,
              zoomControl: true,
            }}
          >
            {/* Draw driver's polyline routes */}
            {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: false }} />}

            {/* Custom static markers if directions aren't calculated */}
            {!directions && selectedMatch && (
              <>
                {/* Driver Home Pin */}
                <Marker
                  position={{
                    lat: selectedMatch.driverRouteId.fromCoords.coordinates[1],
                    lng: selectedMatch.driverRouteId.fromCoords.coordinates[0],
                  }}
                  label="D"
                  title="Driver pickup"
                />
                {/* Passenger Home Pin */}
                <Marker
                  position={{
                    lat: selectedMatch.passengerRouteId.fromCoords.coordinates[1],
                    lng: selectedMatch.passengerRouteId.fromCoords.coordinates[0],
                  }}
                  label="P"
                  title="Passenger pickup"
                />
              </>
            )}
          </GoogleMap>
        ) : (
          <div className="w-full h-full bg-slate-900 flex items-center justify-center text-sm text-slate-500">
            Connecting to Google Map Services...
          </div>
        )}
      </div>
    </div>
  );
}
