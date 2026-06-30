import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { ShieldCheck, User, Mail, MapPin, Building, Key, Award, Clock } from 'lucide-react';
import Counter from '../components/ui/Counter';
import BorderGlow from '../components/ui/BorderGlow';
import StarBorder from '../components/ui/StarBorder';

const GOOGLE_LIBRARIES = ['places'];

export default function Profile() {
  const { user, token, updateLocations } = useAuth();

  // Load Google Maps Autocomplete script
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_LIBRARIES,
  });

  const homeAutocompleteRef = useRef(null);
  const officeAutocompleteRef = useRef(null);

  // States
  const [homeAddress, setHomeAddress] = useState(user?.homeLocation?.address || '');
  const [homeLat, setHomeLat] = useState(user?.homeLocation?.lat || 0);
  const [homeLng, setHomeLng] = useState(user?.homeLocation?.lng || 0);

  const [officeAddress, setOfficeAddress] = useState(user?.officeLocation?.address || '');
  const [officeLat, setOfficeLat] = useState(user?.officeLocation?.lat || 0);
  const [officeLng, setOfficeLng] = useState(user?.officeLocation?.lng || 0);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const onHomeChanged = () => {
    if (homeAutocompleteRef.current) {
      const place = homeAutocompleteRef.current.getPlace();
      if (place.geometry) {
        setHomeAddress(place.formatted_address || place.name || '');
        setHomeLat(place.geometry.location.lat());
        setHomeLng(place.geometry.location.lng());
      }
    }
  };

  const onOfficeChanged = () => {
    if (officeAutocompleteRef.current) {
      const place = officeAutocompleteRef.current.getPlace();
      if (place.geometry) {
        setOfficeAddress(place.formatted_address || place.name || '');
        setOfficeLat(place.geometry.location.lat());
        setOfficeLng(place.geometry.location.lng());
      }
    }
  };

  const handleSaveLocations = async (e) => {
    e.preventDefault();
    if (!homeLat || !officeLat) {
      setError('Please select valid addresses from the Google suggestion list.');
      return;
    }
    setLoading(true);
    setSuccess('');
    setError('');

    const res = await updateLocations({
      homeAddress,
      homeLat,
      homeLng,
      officeAddress,
      officeLat,
      officeLng,
    });

    if (res.success) {
      setSuccess('Commute addresses updated successfully!');
    } else {
      setError(res.error || 'Failed to save locations.');
    }
    setLoading(false);
  };

  // Mocking nice audit logs of trust score based on user.verified and user.rideHistory
  const getTrustLogs = () => {
    const logs = [];
    logs.push({ event: 'Account Initialized', change: '+80', score: 80, date: 'Registration' });
    if (user?.verified) {
      logs.push({ event: 'Corporate Email Verified', change: '+20', score: 100, date: 'Verification' });
    }
    if (user?.rideHistory && user.rideHistory.length > 0) {
      let currentScore = user.verified ? 100 : 80;
      user.rideHistory.forEach((h, i) => {
        let change = '+1';
        if (h.status === 'cancelled') {
          change = '-5';
          currentScore = Math.max(0, currentScore - 5);
        } else if (h.role === 'driver') {
          change = '+2';
          currentScore = Math.min(100, currentScore + 2);
        } else {
          currentScore = Math.min(100, currentScore + 1);
        }
        logs.push({
          event: h.status === 'cancelled' ? 'Ride Cancelled (Penalty)' : `Completed ride as ${h.role}`,
          change,
          score: currentScore,
          date: new Date(h.date).toLocaleDateString(),
        });
      });
    }
    return logs.reverse();
  };

  const trustLogs = getTrustLogs();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-transparent min-h-[calc(100vh-4rem)]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Card Summary */}
        <BorderGlow
          className="w-full h-fit flex flex-col"
          borderRadius={20}
          animated={true}
          backgroundColor="rgba(22, 31, 48, 0.5)"
        >
          <div className="p-6 flex flex-col items-center text-center w-full">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 text-3xl font-extrabold text-white mb-4">
              {user?.name?.substring(0, 2).toUpperCase()}
            </div>
            <h2 className="text-lg font-bold text-white flex items-center gap-1.5 justify-center">
              {user?.name}
              {user?.verified && <ShieldCheck size={18} className="text-brand-accent" />}
            </h2>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{user?.companyName || 'Verified Commuter'}</p>
            
            <div className="w-full bg-slate-950/40 border border-brand-border/60 rounded-xl p-4 mt-6 flex justify-around items-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Verified</p>
                <p className={`text-xs font-bold mt-1 ${user?.verified ? 'text-brand-accent' : 'text-yellow-500'}`}>
                  {user?.verified ? 'Verified' : 'Unverified'}
                </p>
              </div>
              <div className="h-6 w-px bg-brand-border/60"></div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Trust Score</p>
                <div className="mt-1">
                  <Counter value={user?.trustScore || 100} fontSize={16} textColor="#228a56" />
                </div>
              </div>
            </div>
          </div>
        </BorderGlow>

        {/* Configurations Form & Address set */}
        <div className="md:col-span-2 space-y-6">
          <BorderGlow
            className="w-full"
            borderRadius={20}
            animated={false}
            backgroundColor="rgba(22, 31, 48, 0.5)"
          >
            <div className="p-6 w-full">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-5 flex items-center gap-2">
                <MapPin size={16} className="text-brand-secondary" />
                Commute Address Configurations
              </h3>

              {success && <div className="mb-4 bg-emerald-950/40 border border-emerald-800/80 px-4 py-2.5 rounded-lg text-xs text-emerald-300">{success}</div>}
              {error && <div className="mb-4 bg-red-950/40 border border-red-800/80 px-4 py-2.5 rounded-lg text-xs text-red-300">{error}</div>}

              <form onSubmit={handleSaveLocations} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Default Home Location Address
                  </label>
                  {isLoaded ? (
                    <Autocomplete
                      onLoad={(autocomplete) => (homeAutocompleteRef.current = autocomplete)}
                      onPlaceChanged={onHomeChanged}
                    >
                      <input
                        type="text"
                        required
                        value={homeAddress}
                        onChange={(e) => setHomeAddress(e.target.value)}
                        placeholder="Search Home society / address..."
                        className="w-full bg-slate-950/80 border border-brand-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
                      />
                    </Autocomplete>
                  ) : (
                    <input
                      type="text"
                      required
                      value={homeAddress}
                      onChange={(e) => setHomeAddress(e.target.value)}
                      placeholder="Loading Maps Autocomplete..."
                      className="w-full bg-slate-950/80 border border-brand-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Default Office Location Address
                  </label>
                  {isLoaded ? (
                    <Autocomplete
                      onLoad={(autocomplete) => (officeAutocompleteRef.current = autocomplete)}
                      onPlaceChanged={onOfficeChanged}
                    >
                      <input
                        type="text"
                        required
                        value={officeAddress}
                        onChange={(e) => setOfficeAddress(e.target.value)}
                        placeholder="Search Office tech park / building..."
                        className="w-full bg-slate-950/80 border border-brand-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
                      />
                    </Autocomplete>
                  ) : (
                    <input
                      type="text"
                      required
                      value={officeAddress}
                      onChange={(e) => setOfficeAddress(e.target.value)}
                      placeholder="Loading Maps Autocomplete..."
                      className="w-full bg-slate-950/80 border border-brand-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                    />
                  )}
                </div>

                <div className="pt-2">
                  <StarBorder
                    type="submit"
                    disabled={loading}
                    className="text-slate-900 font-bold px-6 py-2"
                  >
                    {loading ? 'Saving Address Settings...' : 'Save Commute Addresses'}
                  </StarBorder>
                </div>
              </form>
            </div>
          </BorderGlow>

          {/* Section: Trust Audit Logs */}
          <BorderGlow
            className="w-full"
            borderRadius={20}
            animated={false}
            backgroundColor="rgba(22, 31, 48, 0.5)"
          >
            <div className="p-6 w-full">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-5 flex items-center gap-2">
                <Award size={16} className="text-brand-accent" />
                Trust Score Progress Audit Log
              </h3>
              
              <div className="flow-root">
                <ul className="-mb-8">
                  {trustLogs.map((log, logIdx) => (
                    <li key={logIdx}>
                      <div className="relative pb-8">
                        {logIdx !== trustLogs.length - 1 ? (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-brand-border/40" aria-hidden="true" />
                        ) : null}
                        <div className="relative flex space-x-3 items-start">
                          <div>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-brand-bg ${
                              log.change.startsWith('+') ? 'bg-emerald-950/80 text-brand-accent' : 'bg-red-950/80 text-red-400'
                            }`}>
                              <Clock size={14} />
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-xs font-semibold text-white">{log.event}</p>
                              <span className="text-[10px] text-slate-500">{log.date}</span>
                            </div>
                            <div className="text-right text-xs">
                              <span className={`font-bold ${log.change.startsWith('+') ? 'text-brand-accent' : 'text-red-400'}`}>
                                {log.change}
                              </span>
                              <p className="text-[10px] text-slate-500 mt-0.5">Result: {log.score}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </BorderGlow>
        </div>

      </div>
    </div>
  );
}
