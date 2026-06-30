import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Car, Mail, Lock, User as UserIcon, ShieldAlert, CheckCircle, HelpCircle } from 'lucide-react';
import BorderGlow from '../components/ui/BorderGlow';
import StarBorder from '../components/ui/StarBorder';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('male');
  const [companyName, setCompanyName] = useState('');
  
  // OTP state
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { login, register, verifyOTP, resendOTP } = useAuth();
  const navigate = useNavigate();

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (isRegister) {
      const res = await register(name, email, password, gender, companyName);
      if (res.success) {
        setSuccessMsg(res.message);
        setShowOtpScreen(true);
      } else {
        setErrorMsg(res.error || 'Registration failed');
      }
    } else {
      const res = await login(email, password);
      if (res.success) {
        navigate('/');
      } else {
        setErrorMsg(res.error || 'Invalid credentials');
      }
    }
    setLoading(false);
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    const res = await verifyOTP(otp);
    if (res.success) {
      setSuccessMsg(res.message);
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } else {
      setErrorMsg(res.error || 'OTP verification failed');
    }
    setLoading(false);
  };

  const handleGoogleOAuth = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    
    // Simulate real/mock Google login popup flow
    setTimeout(() => {
      const mockEmail = "corporate.commuter@google.com";
      const mockName = "Google Commuter";
      
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/google-oauth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mockEmail, name: mockName, companyName: 'Google' }),
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          localStorage.setItem('token', data.token);
          setSuccessMsg('Successfully authenticated via Google OAuth!');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          setErrorMsg(data.error || 'Google login failed');
        }
        setLoading(false);
      })
      .catch(err => {
        setErrorMsg('Connection failed during Google OAuth');
        setLoading(false);
      });
    }, 1200);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row items-center justify-center gap-12 px-6 py-12 relative overflow-hidden bg-transparent max-w-6xl mx-auto">
      {/* Dynamic Background Graphics */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-secondary/10 rounded-full filter blur-[120px] animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-accent/10 rounded-full filter blur-[120px] animate-pulse-slow"></div>

      {/* LEFT COLUMN: Product Marketing & BlaBlaCar Comparison */}
      <div className="flex-1 max-w-lg text-left space-y-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-secondary/10 border border-brand-secondary/35 text-brand-secondary text-xs font-semibold">
          <Car size={14} className="text-brand-accent animate-pulse" />
          <span>Next-Gen Intra-City Carpool</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl leading-tight font-sans">
          Daily Office Commutes, <span className="bg-gradient-to-r from-brand-secondary to-brand-accent bg-clip-text text-transparent">Reimagined.</span>
        </h1>
        <p className="text-slate-300 text-sm leading-relaxed font-light">
          DailyPool solves the daily tech-park commute gridlock in Bengaluru. Unlike long-distance ad-hoc carpooling apps, we build trusted commuter circles using automated route overlap rankings.
        </p>


        {/* Feature checks */}
        <div className="space-y-3 pt-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-brand-accent rounded-full shrink-0"></span>
            <span>OTP Verification establishes commuter trust circle</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-brand-accent rounded-full shrink-0"></span>
            <span>AI overlaps routes to calculate under 500m pickup detours</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-brand-accent rounded-full shrink-0"></span>
            <span>Dynamic Peer Trust Score logs protect commuter quality</span>
          </div>
        </div>

        {/* Social Proof Rail */}
        <div className="pt-6 border-t border-gunmetal/60">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-mapbox mb-3">
            TRUSTED BY COMMUTERS AT LEADING CORES
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-extrabold tracking-widest text-slate-mapbox/65 uppercase">
            <span>Microsoft</span>
            <span>Google</span>
            <span>BMW</span>
            <span>Infosys</span>
            <span>Intel</span>
            <span>Uber</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Auth Card */}
      <BorderGlow
        className="w-full max-w-md relative z-10 shrink-0"
        borderRadius={24}
        animated={true}
        backgroundColor="rgba(22, 31, 48, 0.7)"
      >
        <div className="p-8 w-full">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-tr from-brand-secondary to-brand-accent p-3 rounded-2xl text-slate-900 mb-3 shadow-lg shadow-brand-secondary/20">
              <Car size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {showOtpScreen
                ? 'Verify Your Account'
                : isRegister
                ? 'Create a Commuter Account'
                : 'Commute Smarter, Together'}
            </h2>
            <p className="text-sm text-slate-400 text-center mt-1">
              {showOtpScreen
                ? `We sent a 6-digit OTP code to ${email}`
                : isRegister
                ? 'Post recurring routes and match with verified colleagues'
                : 'Sign in to access your matches and active carpools'}
            </p>
          </div>

          {/* Error/Success Alerts */}
          {errorMsg && (
            <div className="mb-4 bg-red-950/40 border border-red-800/80 px-4 py-3 rounded-lg flex items-center gap-2.5 text-red-200 text-sm">
              <ShieldAlert size={16} className="text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-4 bg-emerald-950/40 border border-emerald-800/80 px-4 py-3 rounded-lg flex items-center gap-2.5 text-emerald-200 text-sm">
              <CheckCircle size={16} className="text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* OTP Input Form */}
          {showOtpScreen ? (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  One-Time Password
                </label>
                <input
                  type="text"
                  maxLength="6"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full bg-slate-950/80 border border-brand-border rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-[8px] text-white focus:outline-none focus:border-brand-accent transition-colors placeholder:tracking-normal placeholder:font-medium placeholder:text-sm"
                />
              </div>
              <StarBorder
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full text-slate-900 font-bold"
              >
                {loading ? 'Verifying OTP...' : 'Verify OTP & Continue'}
              </StarBorder>
              <div className="text-center mt-3 flex justify-between px-2">
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    setErrorMsg('');
                    setSuccessMsg('');
                    const res = await resendOTP(email);
                    if (res.success) {
                      setSuccessMsg('A new OTP has been sent to your email!');
                    } else {
                      setErrorMsg(res.error || 'Failed to resend OTP');
                    }
                    setLoading(false);
                  }}
                  className="text-xs text-brand-accent hover:underline font-semibold"
                >
                  Resend OTP Code
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="text-xs text-slate-400 hover:text-white transition-colors hover:underline font-semibold"
                >
                  Skip for now
                </button>
              </div>
            </form>
          ) : (
            /* Sign In / Register Form */
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {isRegister && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Rohit Sharma"
                        className="w-full bg-slate-950/80 border border-brand-border rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Gender
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full bg-slate-950/80 border border-brand-border rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Company / College
                      </label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Microsoft"
                        className="w-full bg-slate-950/80 border border-brand-border rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Work/College Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rohit@microsoft.com"
                    className="w-full bg-slate-950/80 border border-brand-border rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/80 border border-brand-border rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2">
                <StarBorder
                  type="submit"
                  disabled={loading}
                  className="w-full text-slate-900 font-bold"
                >
                  {loading ? 'Processing...' : isRegister ? 'Register & Verify Email' : 'Sign In'}
                </StarBorder>
              </div>

              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#1c1f24]"></div>
                </div>
                <span className="relative bg-[#15171b] px-3 text-[10px] uppercase font-bold text-slate-mapbox tracking-widest z-10">
                  Or
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoogleOAuth}
                className="w-full flex items-center justify-center gap-2 border border-slate-700/60 bg-transparent hover:bg-slate-900/40 text-xs font-bold text-white rounded-full py-2.5 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.74 14.9 1 12 1 7.35 1 3.39 3.65 1.5 7.5l3.6 2.8C6.01 7.21 8.79 5.04 12 5.04z"/>
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.67 2.84c2.14-1.98 3.76-4.9 3.76-8.57z"/>
                  <path fill="#FBBC05" d="M5.1 14.8c-.25-.76-.39-1.57-.39-2.4s.14-1.64.39-2.4L1.5 7.2C.54 9.12 0 11.24 0 13.5s.54 4.38 1.5 6.3l3.6-3z"/>
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.67-2.84c-1.11.75-2.53 1.19-4.29 1.19-3.21 0-5.99-2.17-6.96-5.26l-3.6 2.8C3.39 20.35 7.35 23 12 23z"/>
                </svg>
                Continue with Google
              </button>

              {/* Toggle tabs */}
              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  {isRegister
                    ? 'Already have an account? Sign In'
                    : "Don't have an account? Register"}
                </button>
              </div>
            </form>
          )}
        </div>
      </BorderGlow>
    </div>
  );
}
