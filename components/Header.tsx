import React from 'react';
import { User, Role, AppSettings } from '../types';
import { MenuIcon, LogoutIcon } from './icons/Icons';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  toggleSidebar: () => void;
  appSettings: AppSettings | null;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, toggleSidebar, appSettings }) => {

  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center flex-wrap gap-4 z-10">
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="text-gray-500 focus:outline-none md:hidden mr-4">
          <MenuIcon />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 hidden sm:block">
            {appSettings ? `Sistem Informasi Terpadu : ${appSettings.nama_sekolah}` : 'Sistem Informasi Terpadu'}
          </h1>
          <p className="text-sm text-gray-500">Hi, {user.nama || user.username}!</p>
        </div>
      </div>
      
      <div className="flex-1"></div>

      <div className="flex items-center space-x-4">
         <div className="text-right hidden sm:block">
             <p className="font-semibold">{user.nama || user.username}</p>
             <p className="text-xs text-gray-600 bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{user.role}</p>
         </div>
         <div className="flex items-center space-x-2">
            <button
                onClick={onLogout}
                className="hidden sm:inline-block px-4 py-2 text-sm font-medium text-white bg-danger border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
                Logout
            </button>
            <button
                onClick={onLogout}
                className="sm:hidden p-2 text-white bg-danger rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                aria-label="Logout"
            >
                <LogoutIcon />
            </button>
         </div>
      </div>
    </header>
  );
};

export default Header;