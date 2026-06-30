import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useJsApiLoader, Autocomplete, GoogleMap, MarkerF } from '@react-google-maps/api';
import { MapPin, Clock, Calendar, Check, Users, ArrowRight, CheckSquare, Sparkles, Navigation } from 'lucide-react';
import Stepper from '../components/ui/Stepper';
import BorderGlow from '../components/ui/BorderGlow';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const GOOGLE_LIBRARIES = ['places'];

export default function PostRoute() {
  const { token } = useAuth();
  const navigate = useNavigate();

  // Load Google Maps script
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_LIBRARIES,
  });

  // Autocomplete refs
  const originAutocompleteRef = useRef(null);
  const destAutocompleteRef = useRef(null);

  // Form states
  const [fromAddress, setFromAddress] = useState('');
  const [fromLat, setFromLat] = useState(0);
  const [fromLng, setFromLng] = useState(0);

  const [toAddress, setToAddress] = useState('');
  const [toLat, setToLat] = useState(0);
  const [toLng, setToLng] = useState(0);

  const [departureTime, setDepartureTime] = useState('08:30');
  const [role, setRole] = useState('driver'); // 'driver' or 'passenger'
  const [mode, setMode] = useState('car'); // 'car', 'auto', 'cab_split'
  const [seats, setSeats] = useState(1);
  const [selectedDays, setSelectedDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [mapClickTarget, setMapClickTarget] = useState('from'); // 'from' or 'to'

  React.useEffect(() => {
    window.mapClickTarget = 'from';
    return () => {
      try {
        delete window.mapClickTarget;
      } catch (e) {}
    };
  }, []);

  const changeMapTarget = (target) => {
    setMapClickTarget(target);
    window.mapClickTarget = target;
  };

  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

  const handleMapClick = (event) => {
    if (!window.google) return;
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    setError('');

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      let resolvedAddress = '';
      if (status === 'OK' && results[0]) {
        resolvedAddress = results[0].formatted_address;
      } else {
        resolvedAddress = `Selected Map Coordinates (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
      }

      const activeTarget = window.mapClickTarget || 'from';
      if (activeTarget === 'from') {
        setFromAddress(resolvedAddress);
        setFromLat(lat);
        setFromLng(lng);
      } else {
        setToAddress(resolvedAddress);
        setToLat(lat);
        setToLng(lng);
      }
    });
  };

  const handleBeforeStepAdvance = (stepNum) => {
    if (stepNum === 1) {
      if (!fromAddress.trim()) {
        return { success: false, error: 'Pickup starting location address is required.' };
      }
      if (!fromLat || !fromLng) {
        return { success: false, error: 'Please choose a valid pickup starting location using autocomplete or clicking the map.' };
      }
      if (!toAddress.trim()) {
        return { success: false, error: 'Drop-off destination address is required.' };
      }
      if (!toLat || !toLng) {
        return { success: false, error: 'Please choose a valid drop-off destination using autocomplete or clicking the map.' };
      }
    }
    if (stepNum === 2) {
      if (!departureTime) {
        return { success: false, error: 'Departure time is required.' };
      }
      if (selectedDays.length === 0) {
        return { success: false, error: 'Please pick at least one weekday schedule.' };
      }
    }
    return { success: true };
  };

  const onOriginChanged = () => {
    if (originAutocompleteRef.current) {
      const place = originAutocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        setFromAddress(place.formatted_address || place.name || '');
        setFromLat(place.geometry.location.lat());
        setFromLng(place.geometry.location.lng());
      }
    }
  };

  const onDestChanged = () => {
    if (destAutocompleteRef.current) {
      const place = destAutocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        setToAddress(place.formatted_address || place.name || '');
        setToLat(place.geometry.location.lat());
        setToLng(place.geometry.location.lng());
      }
    }
  };

  // Toggle day selection
  const handleDayToggle = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  // Auto-complete presets for quick local testing (if Google script block happens or key is throttled)
  const applyMockPreset = (type) => {
    if (type === 'whitefield') {
      setFromAddress('Whitefield, Bengaluru, Karnataka, India');
      setFromLat(12.9698);
      setFromLng(77.7499);
      setToAddress('Koramangala, Bengaluru, Karnataka, India');
      setToLat(12.9352);
      setToLng(77.6244);
    } else {
      setFromAddress('Marathahalli, Bengaluru, Karnataka, India');
      setFromLat(12.9569);
      setFromLng(77.7011);
      setToAddress('Koramangala, Bengaluru, Karnataka, India');
      setToLat(12.9352);
      setToLng(77.6244);
    }
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (!fromLat || !toLat) {
      setError('Please select valid locations from the Google Autocomplete list.');
      return;
    }
    if (selectedDays.length === 0) {
      setError('Please select at least one day.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/routes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromAddress,
          fromLat,
          fromLng,
          toAddress,
          toLat,
          toLng,
          departureTime,
          days: selectedDays,
          seats,
          mode,
          role,
        }),
      });

      const data = await response.json();
      if (data.success) {
        navigate('/');
      } else {
        setError(data.error || 'Failed to submit route');
      }
    } catch (err) {
      setError('Backend connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 bg-transparent min-h-[calc(100vh-4rem)]">
      <BorderGlow
        className="w-full relative z-10"
        borderRadius={20}
        animated={false}
        backgroundColor="rgba(22, 31, 48, 0.5)"
      >
        <div className="p-8 w-full">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="text-brand-accent animate-bounce" size={20} />
              Post Daily Office Commute
            </h2>
            <p className="text-slate-400 text-xs mt-1">Configure your recurring commute setup to auto-calculate routes and matches.</p>
          </div>

          {error && (
            <div className="mb-5 bg-red-950/40 border border-red-800/80 px-4 py-3 rounded-lg text-xs text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            <Stepper
              onFinalStepCompleted={handleSubmit}
              onBeforeStepAdvance={handleBeforeStepAdvance}
              setError={setError}
              nextButtonText="Continue"
              backButtonText="Back"
            >
              {/* Step 1: Locations */}
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Starting Location (Pickup)
                  </label>
                  {isLoaded ? (
                    <Autocomplete
                      onLoad={(autocomplete) => (originAutocompleteRef.current = autocomplete)}
                      onPlaceChanged={onOriginChanged}
                    >
                      <input
                        type="text"
                        required
                        value={fromAddress}
                        onChange={(e) => setFromAddress(e.target.value)}
                        placeholder="Enter home society name, tech park, or sub-region..."
                        className="w-full bg-slate-950/80 border border-brand-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
                      />
                    </Autocomplete>
                  ) : (
                    <input
                      type="text"
                      required
                      value={fromAddress}
                      onChange={(e) => setFromAddress(e.target.value)}
                      placeholder="Loading maps integration..."
                      className="w-full bg-slate-950/80 border border-brand-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Destination (Office drop-off)
                  </label>
                  {isLoaded ? (
                    <Autocomplete
                      onLoad={(autocomplete) => (destAutocompleteRef.current = autocomplete)}
                      onPlaceChanged={onDestChanged}
                    >
                      <input
                        type="text"
                        required
                        value={toAddress}
                        onChange={(e) => setToAddress(e.target.value)}
                        placeholder="Enter office complex, tech park name (e.g. RMZ Ecospace)..."
                        className="w-full bg-slate-950/80 border border-brand-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
                      />
                    </Autocomplete>
                  ) : (
                    <input
                      type="text"
                      required
                      value={toAddress}
                      onChange={(e) => setToAddress(e.target.value)}
                      placeholder="Loading maps integration..."
                      className="w-full bg-slate-950/80 border border-brand-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                    />
                  )}
                </div>

                {/* Presets */}
                <div className="flex gap-2.5 pt-1.5">
                  <span className="text-[10px] text-slate-500 self-center font-medium">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyMockPreset('whitefield')}
                    className="bg-slate-900 border border-brand-border text-[10px] text-slate-400 px-2.5 py-1 rounded-md hover:text-white transition-colors"
                  >
                    Whitefield → Koramangala
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMockPreset('marathahalli')}
                    className="bg-slate-900 border border-brand-border text-[10px] text-slate-400 px-2.5 py-1 rounded-md hover:text-white transition-colors"
                  >
                    Marathahalli → Koramangala
                  </button>
                </div>

                {/* Map Click Selector */}
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Or click Map to place marker:
                    </span>
                    <div className="flex bg-slate-950 border border-brand-border rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => changeMapTarget('from')}
                        className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all ${
                          mapClickTarget === 'from'
                            ? 'bg-[#007afc] text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Set Pickup
                      </button>
                      <button
                        type="button"
                        onClick={() => changeMapTarget('to')}
                        className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all ${
                          mapClickTarget === 'to'
                            ? 'bg-[#007afc] text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Set Drop-off
                      </button>
                    </div>
                  </div>

                  {isLoaded ? (
                    <div className="w-full h-[220px] rounded-xl overflow-hidden border border-brand-border relative">
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={BENGALURU_CENTER}
                        zoom={11}
                        onClick={handleMapClick}
                        options={MAP_OPTIONS}
                      >
                        {fromLat && fromLng && (
                          <MarkerF
                            position={{ lat: fromLat, lng: fromLng }}
                            label={{ text: "S", color: "#ffffff", fontWeight: "bold" }}
                            title="Start location"
                          />
                        )}
                        {toLat && toLng && (
                          <MarkerF
                            position={{ lat: toLat, lng: toLng }}
                            label={{ text: "D", color: "#ffffff", fontWeight: "bold" }}
                            title="Destination location"
                          />
                        )}
                      </GoogleMap>
                    </div>
                  ) : (
                    <div className="w-full h-[220px] rounded-xl border border-brand-border flex items-center justify-center text-xs text-slate-500 bg-slate-950">
                      Loading Map helper...
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Schedule */}
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Departure Time
                  </label>
                  <div className="relative">
                    <Clock size={16} className="absolute left-3 top-3.5 text-slate-500" />
                    <input
                      type="time"
                      required
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="w-full bg-slate-950/80 border border-brand-border rounded-xl pl-9 pr-3 py-3 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Recurring Weekdays
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {weekdays.map((day) => {
                      const isSelected = selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleDayToggle(day)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                            isSelected
                              ? 'bg-brand-secondary border-brand-secondary text-white'
                              : 'bg-slate-950/80 border-brand-border text-slate-400 hover:text-white'
                          }`}
                        >
                          {day.substring(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Step 3: Vehicle Preferences */}
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Commuter Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-slate-950/80 border border-brand-border rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
                    >
                      <option value="driver">Driver (Offering seats)</option>
                      <option value="passenger">Passenger (Carpool / split)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Vehicle Type
                    </label>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                      className="w-full bg-slate-950/80 border border-brand-border rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
                    >
                      <option value="car">Car (Self/Cab)</option>
                      <option value="auto">Auto Split</option>
                      <option value="cab_split">Cab Split (Uber/Ola)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Seats Offered / Required
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    required
                    value={seats}
                    onChange={(e) => setSeats(parseInt(e.target.value))}
                    className="w-full bg-slate-950/80 border border-brand-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
                  />
                </div>
              </div>
            </Stepper>
          </form>
        </div>
      </BorderGlow>
    </div>
  );
}
