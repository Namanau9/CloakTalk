import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function PinSetup() {
  const navigate = useNavigate();
  const { user, setupKeys } = useAuth();
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState('create'); // 'create' | 'confirm' | 'loading'
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  const handlePinChange = (index, value, isConfirm) => {
    if (value && !/^\d$/.test(value)) return;

    const currentPin = isConfirm ? confirmPin : pin;
    const setter = isConfirm ? setConfirmPin : setPin;

    const newPin = [...currentPin];
    newPin[index] = value;
    setter(newPin);

    setError('');

    // Auto-advance to next input
    if (value && index < 5) {
      const nextIndex = index + 1;
      const ref = isConfirm
        ? inputRefs.current[6 + nextIndex]
        : inputRefs.current[nextIndex];
      ref?.focus();
    }
  };

  const handleKeyDown = (index, e, isConfirm) => {
    if (e.key === 'Backspace') {
      const currentPin = isConfirm ? confirmPin : pin;
      const setter = isConfirm ? setConfirmPin : setPin;

      if (!currentPin[index] && index > 0) {
        const ref = isConfirm
          ? inputRefs.current[6 + index - 1]
          : inputRefs.current[index - 1];
        ref?.focus();
      }

      const newPin = [...currentPin];
      newPin[index] = '';
      setter(newPin);
    }
  };

  const handleContinue = async () => {
    const pinStr = pin.join('');
    if (pinStr.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setStep('confirm');
    // Focus first confirm input
    setTimeout(() => inputRefs.current[6]?.focus(), 100);
  };

  const handleConfirm = async () => {
    const pinStr = pin.join('');
    const confirmStr = confirmPin.join('');

    if (confirmStr.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    if (pinStr !== confirmStr) {
      setError('PINs do not match. Try again.');
      setConfirmPin(['', '', '', '', '', '']);
      setStep('create');
      setPin(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      return;
    }

    setStep('loading');
    try {
      const result = await setupKeys(pinStr);
      if (result.success) {
        toast.success('Session PIN set successfully!');
        navigate('/', { replace: true });
      } else {
        toast.error(result.error);
        setStep('create');
      }
    } catch (err) {
      toast.error('Failed to set up encryption keys');
      setStep('create');
    }
  };

  const handleBack = () => {
    setStep('create');
    setConfirmPin(['', '', '', '', '', '']);
    setError('');
  };

  const renderPinInputs = (isConfirm = false) => {
    const currentPin = isConfirm ? confirmPin : pin;
    const offset = isConfirm ? 6 : 0;

    return currentPin.map((digit, i) => (
      <input
        key={i}
        ref={(el) => (inputRefs.current[offset + i] = el)}
        type="password"
        inputMode="numeric"
        maxLength={1}
        value={digit}
        onChange={(e) => handlePinChange(i, e.target.value, isConfirm)}
        onKeyDown={(e) => handleKeyDown(i, e, isConfirm)}
        className="pin-input text-center"
        autoFocus={!isConfirm && i === 0}
        disabled={step === 'loading'}
      />
    ));
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-dark-400">Setting up encryption keys...</p>
          <p className="text-dark-500 text-sm mt-2">This generates your ECDH key pair</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="glass-card rounded-2xl p-8 space-y-8 animate-fade-in">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gradient">
              {step === 'create' ? 'Set Your Session PIN' : 'Confirm Your PIN'}
            </h2>
            <p className="text-dark-400 text-sm">
              {step === 'create'
                ? 'This 6-digit PIN locks your session and encrypts your private key'
                : 'Enter the same PIN again to confirm'}
            </p>
          </div>

          {/* PIN Inputs */}
          <div className="space-y-6">
            <div className="flex justify-center gap-3">
              {step === 'create' ? renderPinInputs(false) : renderPinInputs(true)}
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center animate-fade-in">{error}</p>
            )}

            {/* Actions */}
            <div className="space-y-3">
              {step === 'create' ? (
                <button
                  onClick={handleContinue}
                  disabled={pin.join('').length !== 6}
                  className="btn-primary w-full"
                >
                  Continue
                </button>
              ) : (
                <div className="flex gap-3">
                  <button onClick={handleBack} className="btn-secondary flex-1">
                    Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={confirmPin.join('').length !== 6}
                    className="btn-primary flex-1"
                  >
                    Confirm & Secure
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="bg-dark-800/60 rounded-xl p-4 border border-dark-700/50">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <p className="text-xs text-dark-400">
                Your PIN never leaves your device. It's used to encrypt your private key locally. 
                If you forget your PIN, you'll need to generate new keys and start fresh conversations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
