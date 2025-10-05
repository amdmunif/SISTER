
import React, { useState } from 'react';
import { User, Role, AppSettings } from '../types';
import { HomeIcon, DocumentReportIcon, UserGroupIcon, CheckCircleIcon, ShieldCheckIcon, UsersIcon, CalendarIcon, XIcon, PrintIcon, ChevronDownIcon, ChevronUpIcon, ClipboardListIcon, CogIcon, IdCardIcon } from './icons/Icons';

interface SidebarProps {
    user: User;
    activePage: string;
    setActivePage: (page: string) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    appSettings: AppSettings | null;
}

const NavLink: React.FC<{ icon: React.ReactElement; label: string; isActive: boolean; onClick: () => void; }> = ({ icon, label, isActive, onClick }) => (
    <a
        href="#"
        onClick={(e) => { e.preventDefault(); onClick(); }}
        className={`flex items-center px-4 py-3 text-gray-100 hover:bg-primary-dark transition-colors duration-200 rounded-md ${isActive ? 'bg-primary-dark' : ''}`}
    >
        {icon}
        <span className="mx-4 font-medium">{label}</span>
    </a>
);


const Sidebar: React.FC<SidebarProps> = ({ user, activePage, setActivePage, isOpen, setIsOpen, appSettings }) => {
    const [openMenu, setOpenMenu] = useState('');

    const handleLinkClick = (page: string) => {
        setActivePage(page);
        if (window.innerWidth < 768) {
            setIsOpen(false);
        }
    }

    const getNavItems = () => {
        switch (user.role) {
            case Role.KETUA_KELAS_SISWA:
                 return [
                    { icon: <HomeIcon />, label: 'Input Absensi', page: 'Input Absensi' },
                    { icon: <DocumentReportIcon />, label: 'Laporan Pribadi', page: 'Laporan Pribadi' }
                ];
            case Role.SISWA:
                return [{ icon: <DocumentReportIcon />, label: 'Laporan Pribadi', page: 'Laporan Pribadi' }];
            case Role.GURU_BK:
                return [
                    { icon: <ShieldCheckIcon />, label: 'Dashboard', page: 'Dashboard' },
                    { icon: <CheckCircleIcon />, label: 'Validasi Absensi', page: 'Validasi Absensi' },
                    { icon: <ClipboardListIcon />, label: 'Catatan Kasus', page: 'Catatan Kasus'},
                    { icon: <HomeIcon />, label: 'Input Absensi', page: 'Input Absensi' },
                    { icon: <DocumentReportIcon />, label: 'Laporan', page: 'Laporan' },
                ];
            case Role.WALI_KELAS:
                return [
                    { icon: <ShieldCheckIcon />, label: 'Dashboard', page: 'Dashboard' },
                    { icon: <UserGroupIcon />, label: 'Monitoring Kelas', page: 'Monitoring Kelas' },
                    { icon: <ClipboardListIcon />, label: 'Catatan Kasus', page: 'Catatan Kasus'},
                    { icon: <HomeIcon />, label: 'Input Absensi', page: 'Input Absensi' },
                    { icon: <DocumentReportIcon />, label: 'Laporan', page: 'Laporan' }
                ];
            case Role.ADMIN:
                return [
                    { icon: <ShieldCheckIcon />, label: 'Dashboard', page: 'Dashboard' },
                    {
                        icon: <UsersIcon />,
                        label: 'Manajemen',
                        page: 'Manajemen', // Parent identifier
                        children: [
                            { label: 'Siswa', page: 'Siswa' },
                            { label: 'Guru', page: 'Guru' },
                            { label: 'Tahun Ajaran', page: 'Tahun Ajaran' },
                        ]
                    },
                    { icon: <DocumentReportIcon />, label: 'Laporan', page: 'Laporan' },
                    { icon: <ClipboardListIcon />, label: 'Catatan Kasus', page: 'Catatan Kasus'},
                    { icon: <HomeIcon />, label: 'Input Absensi', page: 'Input Absensi' },
                    { icon: <CheckCircleIcon />, label: 'Validasi Absensi', page: 'Validasi Absensi' },
                    {
                        icon: <PrintIcon />,
                        label: 'Cetak Kartu',
                        page: 'CetakKartu', // Parent identifier
                        children: [
                            { label: 'Kartu Siswa', page: 'Kartu Siswa' },
                            { label: 'Kartu Guru', page: 'Kartu Guru' },
                        ]
                    },
                    { icon: <CogIcon />, label: 'Setting Aplikasi', page: 'Setting Aplikasi' }
                ];
            case Role.KEPALA_SEKOLAH:
                return [
                    { icon: <ShieldCheckIcon />, label: 'Dashboard', page: 'Dashboard' },
                    { icon: <ClipboardListIcon />, label: 'Catatan Kasus', page: 'Catatan Kasus'},
                    { icon: <DocumentReportIcon />, label: 'Laporan', page: 'Laporan' },
                ];
            case Role.GURU:
                return [
                    { icon: <ShieldCheckIcon />, label: 'Dashboard', page: 'Dashboard' },
                    { icon: <DocumentReportIcon />, label: 'Laporan', page: 'Laporan' }
                ];
            default:
                return [];
        }
    };

    const navItems = getNavItems();

    const sidebarClasses = `
        flex flex-col w-64 bg-gray-800
        transform transition-transform duration-300 ease-in-out
        fixed inset-y-0 left-0 z-30 md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `;

    return (
        <div className={sidebarClasses}>
            <div className="flex items-center justify-between bg-gray-900 px-4 py-3">
                <div className="flex items-center">
                    {appSettings?.logo_sekolah && (
                        <img src={appSettings.logo_sekolah} alt="Logo" className="h-10 w-10 rounded-full object-cover" />
                    )}
                    <div className="ml-3">
                        <span className="text-white font-bold uppercase text-lg">SISTER</span>
                        <p className="text-gray-400 text-xs">{appSettings?.nama_sekolah || 'Nama Sekolah'}</p>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white md:hidden">
                    <XIcon />
                </button>
            </div>
            <div className="flex flex-col flex-1 overflow-y-auto">
                <nav className="flex-1 p-2">
                    {navItems.map(item => {
                        const itemWithChildren = item as any; // Type assertion
                        if (itemWithChildren.children) {
                            const isMenuOpen = openMenu === item.page;
                             const subItemIsActive = itemWithChildren.children.some((child: any) => activePage === child.page);
                            
                             // Automatically open dropdown if a child is active
                            if (subItemIsActive && !isMenuOpen) {
                                setOpenMenu(item.page);
                            }

                            return (
                                <div key={item.page}>
                                    <a
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); setOpenMenu(isMenuOpen ? '' : item.page); }}
                                        className={`flex items-center justify-between px-4 py-3 text-gray-100 hover:bg-primary-dark transition-colors duration-200 rounded-md ${subItemIsActive ? 'bg-primary-dark' : ''}`}
                                    >
                                        <div className="flex items-center">
                                            {item.icon}
                                            <span className="mx-4 font-medium">{item.label}</span>
                                        </div>
                                        {isMenuOpen ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                                    </a>
                                    {isMenuOpen && (
                                        <div className="pl-8 py-2 space-y-1">
                                            {itemWithChildren.children.map((child: any) => {
                                                let childIcon = <div className="w-6 h-6 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div></div>;
                                                // Specific icons for submenu items
                                                if (child.page === 'Siswa') childIcon = <UserGroupIcon />;
                                                if (child.page === 'Guru') childIcon = <UsersIcon />;
                                                if (child.page === 'Tahun Ajaran') childIcon = <CalendarIcon />;
                                                if (child.page === 'Kartu Siswa') childIcon = <IdCardIcon />;
                                                if (child.page === 'Kartu Guru') childIcon = <IdCardIcon />;
                                                
                                                return (
                                                    <NavLink
                                                        key={child.page}
                                                        icon={childIcon}
                                                        label={child.label}
                                                        isActive={activePage === child.page}
                                                        onClick={() => handleLinkClick(child.page)}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        return (
                            <NavLink
                                key={item.page}
                                icon={item.icon}
                                label={item.label}
                                isActive={activePage === item.page}
                                onClick={() => handleLinkClick(item.page)}
                            />
                        );
                    })}
                </nav>
            </div>
        </div>
    );
};

export default Sidebar;
