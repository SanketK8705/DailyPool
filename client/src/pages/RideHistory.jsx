import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import SpotlightCard from '../components/ui/SpotlightCard';
import StarBorder from '../components/ui/StarBorder';
import { Calendar, Clock, DollarSign, User, Star, CheckCircle, ShieldAlert, Award, MessageSquare } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function RideHistory() {
  const { user, token } = useAuth();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState(null);

  // Review states
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [reviewError, setReviewError] = useState('');

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/rides/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRides(data.rides);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedRide) return;

    setReviewLoading(true);
    setReviewSuccess('');
    setReviewError('');

    try {
      const response = await fetch(`${API_URL}/api/rides/${selectedRide._id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          score: ratingScore,
          comment: ratingComment,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setReviewSuccess('Thank you! Your review was recorded successfully.');
        setRatingComment('');
        fetchHistory();
        setTimeout(() => {
          setSelectedRide(null);
          setReviewSuccess('');
        }, 1500);
      } else {
        setReviewError(data.error || 'Failed to submit review');
      }
    } catch (err) {
      setReviewError('Connection error');
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-transparent min-h-[calc(100vh-4rem)]">
      <div className="mb-8">
        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Award className="text-brand-secondary" size={22} />
          Carpool Commute History
        </h2>
        <p className="text-slate-400 text-xs mt-1">Review your past rides, coordinate split costs, and rate your co-commuters.</p>
      </div>

      {loading ? (
        <p className="text-xs text-slate-500">Loading ride history logbook...</p>
      ) : rides.length === 0 ? (
        <div className="bg-slate-900/40 border border-brand-border/60 rounded-xl p-8 text-center max-w-xl mx-auto">
          <Calendar className="mx-auto text-slate-600 mb-3" size={32} />
          <p className="text-sm text-slate-400 font-semibold">No commute history found.</p>
          <p className="text-xs text-slate-500 mt-1.5">Once you complete a scheduled ride, its details will be logged here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {rides.map((ride) => {
            const isDriver = user._id === ride.driverId._id;
            const partner = isDriver ? ride.passengerId : ride.driverId;
            const rideDate = new Date(ride.createdAt).toLocaleDateString(undefined, {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            const rideTime = new Date(ride.createdAt).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            });

            // Check if user already rated this ride
            const myRating = ride.ratings?.find(
              (r) => r.fromUserId.toString() === user._id.toString()
            );

            return (
              <SpotlightCard
                key={ride._id}
                className="border border-brand-border bg-brand-card/50 rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Calendar size={12} /> {rideDate} • {rideTime}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      ride.status === 'completed'
                        ? 'bg-emerald-950 text-brand-accent border border-brand-accent/20'
                        : ride.status === 'cancelled'
                        ? 'bg-red-950 text-red-400 border border-red-800/20'
                        : 'bg-indigo-950 text-indigo-300 animate-pulse border border-indigo-500/20'
                    }`}>
                      {ride.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 py-1">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                      <span className="text-xs font-bold text-slate-300">{partner.name.substring(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                        {isDriver ? 'Passenger' : 'Driver'}
                      </p>
                      <h3 className="text-sm font-bold text-white mt-0.5">{partner.name}</h3>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-0.5"><DollarSign size={13} className="text-brand-accent" /> Split cost: ₹{ride.splitAmount}</span>
                    <span className="capitalize">Role: {isDriver ? 'Driver' : 'Passenger'}</span>
                  </div>
                </div>

                {/* Rating trigger */}
                {ride.status === 'completed' && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80">
                    {myRating ? (
                      <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-800/60">
                        <span className="flex items-center gap-1 font-medium">
                          <CheckCircle size={14} className="text-brand-accent" /> Rated co-commuter
                        </span>
                        <span className="flex items-center gap-0.5 font-bold text-yellow-500">
                          {myRating.score} <Star size={12} fill="currentColor" />
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedRide(ride)}
                        className="w-full bg-brand-border hover:bg-slate-800 text-slate-300 font-semibold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
                      >
                        <MessageSquare size={13} /> Rate Commute Partner
                      </button>
                    )}
                  </div>
                )}
              </SpotlightCard>
            );
          })}
        </div>
      )}

      {/* Review Modal Dialog Overlay */}
      {selectedRide && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-brand-border max-w-md w-full animate-scale-in">
            <h3 className="text-sm font-extrabold text-white tracking-wider uppercase mb-1">Rate Carpool Partner</h3>
            <p className="text-[11px] text-slate-400 mb-5">Submitting a review directly impacts your commuter partner's trust score.</p>

            {reviewSuccess && <div className="mb-4 bg-emerald-950/40 border border-emerald-800/80 px-4 py-2.5 rounded-lg text-xs text-emerald-300">{reviewSuccess}</div>}
            {reviewError && <div className="mb-4 bg-red-950/40 border border-red-800/80 px-4 py-2.5 rounded-lg text-xs text-red-300">{reviewError}</div>}

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Star selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Rating Score</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingScore(star)}
                      className="p-1 text-slate-400 hover:text-yellow-500 transition-colors"
                    >
                      <Star
                        size={28}
                        fill={star <= ratingScore ? 'currentColor' : 'none'}
                        className={star <= ratingScore ? 'text-yellow-500' : 'text-slate-600'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Feedback / Comments</label>
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="On-time pickup, polite conversations, split UPI payment settled instantly..."
                  rows="3"
                  className="w-full bg-slate-950/80 border border-brand-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setSelectedRide(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <StarBorder
                  type="submit"
                  disabled={reviewLoading}
                  className="disabled:opacity-50"
                >
                  {reviewLoading ? 'Submitting...' : 'Submit Review'}
                </StarBorder>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
