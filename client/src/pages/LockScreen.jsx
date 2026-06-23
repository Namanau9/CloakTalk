import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LockScreen() {
  const { unlock, logout, user } = useAuth();
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef([]);

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError('');

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (value && index === 5) {
      const pinStr = [...newPin.slice(0, 5), value].join('');
      if (pinStr.length === 6) {
        setTimeout(() => handleSubmit(pinStr), 100);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!pin[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      const newPin = [...pin];
      newPin[index] = '';
      setPin(newPin);
    }
  };

  const handleSubmit = async (pinStr) => {
    if (!pinStr) {
      pinStr = pin.join('');
    }
    if (pinStr.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsLoading(true);
    try {
      const result = await unlock(pinStr);
      if (result.success) {
        toast.success('Session unlocked');
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setError(result.error);
        setPin(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();

        if (newAttempts >= 5) {
          toast.error('Too many failed attempts. Logging out.');
          setTimeout(() => logout(), 1000);
        }
      }
    } catch {
      setError('Failed to unlock');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="glass-card rounded-2xl p-8 space-y-8 animate-scale-in">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gradient">Session Locked</h2>
              <p className="text-dark-400 text-sm mt-1">
                Enter your 6-digit PIN to unlock
              </p>
              {user && (
                <p className="text-dark-500 text-xs mt-1">
                  Signed in as {user.name}
                </p>
              )}
            </div>
          </div>

          {/* PIN Input */}
          <div className="space-y-6">
            <div className="flex justify-center gap-3">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="pin-input text-center"
                  autoFocus={i === 0}
                  disabled={isLoading}
                />
              ))}
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center animate-fade-in">{error}</p>
            )}

            <button
              onClick={() => handleSubmit()}
              disabled={pin.join('').length !== 6 || isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Unlocking...
                </span>
              ) : (
                'Unlock'
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="text-center">
            <button
              onClick={logout}
              className="text-dark-500 hover:text-dark-300 text-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
