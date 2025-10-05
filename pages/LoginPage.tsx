import React, { useState } from 'react';
import { AppSettings } from '../types';
import { ShieldCheckIcon } from '../components/icons/Icons';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; message?: string; }>;
  appSettings: AppSettings | null;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, appSettings }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (username && password) {
      setIsLoggingIn(true);
      const result = await onLogin(username, password);
      if (!result.success) {
        setError(result.message || 'Login gagal karena kesalahan yang tidak diketahui.');
      }
      setIsLoggingIn(false);
    } else {
      setError('Mohon masukkan username dan password.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-200 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-xl">
        <div className="flex flex-col items-center">
            {appSettings?.logo_sekolah ? (
                <img src={appSettings.logo_sekolah} alt="Logo Sekolah" className="h-24 w-24 object-contain mb-4"/>
            ) : (
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                    <ShieldCheckIcon />
                </div>
            )}
            <h2 className="text-2xl font-bold text-center text-gray-800">
                {appSettings?.nama_sekolah || "Sistem Absensi Siswa"}
            </h2>
            <p className="mt-2 text-sm text-center text-gray-600">
                Silakan login ke akun Anda
            </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label htmlFor="username" className="sr-only">
                Username atau NIS
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-none appearance-none rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Username atau NIS"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password-input" className="sr-only">
                Password
              </label>
              <input
                id="password-input"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-none appearance-none rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 my-2 text-sm text-red-800 bg-red-100 rounded-md border border-red-200" role="alert">
              <span className="font-semibold">{error}</span>
            </div>
          )}
          
          <div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="relative flex justify-center w-full px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md group bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400"
            >
              {isLoggingIn ? 'Memproses...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
