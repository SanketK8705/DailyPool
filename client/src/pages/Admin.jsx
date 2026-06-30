import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import BorderGlow from '../components/ui/BorderGlow';
import StarBorder from '../components/ui/StarBorder';
import { Users, Car, ShieldAlert, Award, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';

export default function Admin() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'rides'
  const [msg, setMsg] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const fetchData = async () => {
    try {
      setLoading(true);
      setMsg('');
      
      const usersRes = await fetch(`${API_URL}/api/auth/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersData = await usersRes.json();
      if (usersData.success) {
        setUsers(usersData.users);
      }

      const ridesRes = await fetch(`${API_URL}/api/auth/admin/rides`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ridesData = await ridesRes.json();
      if (ridesData.success) {
        setRides(ridesData.rides);
      }
    } catch (err) {
      console.error(err);
      setMsg('Failed to load administrative logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleToggleVerify = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/admin/users/${userId}/verify`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, verified: data.user.verified } : u));
        setMsg(`Status modified for user ${data.user.name}`);
      }
    } catch (err) {
      console.error(err);
      setMsg('Operation failed');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 bg-transparent min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-[#007afc]" />
            Control Center Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">Satellite Console View — Midnight Management System</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg text-xs transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Reload Data
        </button>
      </div>

      {msg && (
        <div className="mb-6 bg-blue-950/40 border border-[#007afc]/40 px-4 py-2.5 rounded-lg text-xs text-[#007afc] font-semibold">
          {msg}
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex gap-4 mb-6 border-b border-gunmetal/60 pb-3">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider pb-1 transition-colors ${
            activeTab === 'users' ? 'text-[#007afc] border-b-2 border-[#007afc]' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Users size={16} />
          User Directory ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('rides')}
          className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider pb-1 transition-colors ${
            activeTab === 'rides' ? 'text-[#007afc] border-b-2 border-[#007afc]' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Car size={16} />
          Pooling Sessions ({rides.length})
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-slate-500">Querying directory servers...</p>
      ) : activeTab === 'users' ? (
        /* Users List */
        <BorderGlow className="w-full" borderRadius={24}>
          <div className="overflow-x-auto p-4">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gunmetal text-slate-400 uppercase tracking-widest font-bold text-[10px]">
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Entity Email</th>
                  <th className="py-3 px-4 text-center">Trust Index</th>
                  <th className="py-3 px-4 text-center">OTP Circle Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} className="border-b border-gunmetal/40 hover:bg-slate-900/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      {u.name}
                      <span className="block text-[10px] text-slate-500 font-medium mt-0.5">{u.companyName || 'Corporate'}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">{u.email}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-[#228a56] font-bold border border-[#228a56]/20">
                        {u.trustScore}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.verified ? 'bg-emerald-950 text-brand-accent' : 'bg-yellow-950/70 text-yellow-500'
                      }`}>
                        {u.verified ? 'VERIFIED' : 'UNVERIFIED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleVerify(u._id)}
                        className={`inline-flex items-center gap-1 text-xs font-semibold py-1 px-3 rounded-full transition-all ${
                          u.verified ? 'text-yellow-500 hover:bg-yellow-950/30' : 'text-[#007afc] hover:bg-[#007afc]/10'
                        }`}
                      >
                        {u.verified ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        {u.verified ? 'Unverify User' : 'Verify User'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BorderGlow>
      ) : (
        /* Rides List */
        <BorderGlow className="w-full" borderRadius={24}>
          <div className="overflow-x-auto p-4">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gunmetal text-slate-400 uppercase tracking-widest font-bold text-[10px]">
                  <th className="py-3 px-4">Commuters Pair</th>
                  <th className="py-3 px-4 text-center">Active Status</th>
                  <th className="py-3 px-4 text-center">Split Amount</th>
                  <th className="py-3 px-4">UPI Handle</th>
                  <th className="py-3 px-4 text-right">Session Details</th>
                </tr>
              </thead>
              <tbody>
                {rides.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-slate-500">
                      No active pooling records in database logs.
                    </td>
                  </tr>
                ) : (
                  rides.map(r => (
                    <tr key={r._id} className="border-b border-gunmetal/40 hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">Driver: {r.driverId?.name || 'Deleted Rider'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Passenger: {r.passengerId?.name || 'Deleted Rider'}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status === 'completed' ? 'bg-emerald-950 text-[#228a56]' : r.status === 'ongoing' ? 'bg-blue-950 text-[#007afc] animate-pulse' : 'bg-red-950/80 text-red-400'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-200">₹{r.splitAmount}</td>
                      <td className="py-3 px-4 text-slate-400 font-medium">{r.upiId || 'Not Configured'}</td>
                      <td className="py-3 px-4 text-right text-slate-500 font-mono text-[10px]">
                        ID: {r._id.slice(-8)}
                        <span className="block mt-0.5">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </BorderGlow>
      )}
    </div>
  );
}
