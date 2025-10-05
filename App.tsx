
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Role, User, Siswa, Absensi, StatusValidasi, TahunAjaran, Semester, CatatanKasus, AppSettings } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import InputAbsensi from './pages/InputAbsensi';
import DashboardGuruBK from './pages/DashboardGuruBK';
import DashboardWaliKelas from './pages/DashboardWaliKelas';
import ManajemenSiswa from './pages/ManajemenSiswa';
import Laporan from './pages/Laporan';
import DashboardKepalaSekolah from './pages/DashboardKepalaSekolah';
import LoginPage from './pages/LoginPage';
import ManajemenUser from './pages/ManajemenUser';
import DashboardSiswa from './pages/DashboardSiswa';
import ManajemenTahunAjaran from './pages/ManajemenTahunAjaran';
import CetakKartu from './pages/CetakKartu';
import { useToast } from './contexts/ToastContext';
import Toasts from './components/Toasts';
import { getLocalDateString } from './utils/date';
import { fetchApi } from './utils/api';
import ManajemenKasus from './pages/ManajemenKasus';
import ManajemenSetting from './pages/ManajemenSetting';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<string>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { showToast } = useToast();

  const [siswaData, setSiswaData] = useState<Siswa[]>([]);
  const [absensiData, setAbsensiData] = useState<Absensi[]>([]);
  const [usersData, setUsersData] = useState<User[]>([]);
  const [tahunAjaranData, setTahunAjaranData] = useState<TahunAjaran[]>([]);
  const [catatanKasusData, setCatatanKasusData] = useState<CatatanKasus[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  const [activeTahunAjaranId, setActiveTahunAjaranId] = useState<number>(0);
  const [activeSemester, setActiveSemester] = useState<Semester>(Semester.GANJIL);
  
  const fetchData = useCallback(async (showSuccessToast = false) => {
    if (!isLoading) setIsLoading(true);
    try {
        const data = await fetchApi('get_all_data.php', 'GET');

        const typedSiswa = data.siswa.map((s: any) => ({ ...s, id_siswa: Number(s.id_siswa), isKetuaKelas: Boolean(Number(s.isKetuaKelas)) }));
        const typedUsers = data.users.map((u: any) => ({ ...u, id_user: Number(u.id_user) }));
        const typedAbsensi = data.absensi.map((a: any) => ({ ...a, id_absensi: Number(a.id_absensi), id_siswa: Number(a.id_siswa) }));
        const typedTA = data.tahun_ajaran.map((ta: any) => ({ ...ta, id: Number(ta.id) }));
        const typedKasus = data.catatan_kasus ? data.catatan_kasus.map((k: any) => ({ ...k, id_kasus: Number(k.id_kasus), id_siswa: Number(k.id_siswa), dilaporkan_oleh: Number(k.dilaporkan_oleh) })) : [];
        const typedSettings = data.settings || null;


        setSiswaData(typedSiswa);
        setUsersData(typedUsers);
        setAbsensiData(typedAbsensi);
        setTahunAjaranData(typedTA);
        setCatatanKasusData(typedKasus);
        setAppSettings(typedSettings);

        // Set default academic period only on initial load
        if (activeTahunAjaranId === 0 && typedTA.length > 0) {
            const today = getLocalDateString();
            const getAcademicPeriodForDate = (dateStr: string, taData: TahunAjaran[]): { tahunAjaran: TahunAjaran | null, semester: Semester | null } => {
                for (const ta of taData) {
                    if (dateStr >= ta.semester_ganjil_start && dateStr <= ta.semester_ganjil_end) return { tahunAjaran: ta, semester: Semester.GANJIL };
                    if (dateStr >= ta.semester_genap_start && dateStr <= ta.semester_genap_end) return { tahunAjaran: ta, semester: Semester.GENAP };
                }
                return { tahunAjaran: null, semester: null };
            };
            const { tahunAjaran: currentTA, semester: currentSemester } = getAcademicPeriodForDate(today, typedTA);
            if (currentTA && currentSemester) {
                setActiveTahunAjaranId(currentTA.id);
                setActiveSemester(currentSemester);
            } else {
                const latestTA = typedTA.reduce((latest: TahunAjaran, current: TahunAjaran) => new Date(latest.semester_genap_end) > new Date(current.semester_genap_end) ? latest : current);
                setActiveTahunAjaranId(latestTA.id);
                setActiveSemester(Semester.GANJIL);
            }
        }
        if (showSuccessToast) showToast('Data berhasil disinkronkan', 'success');
    } catch (error: any) {
        console.error("Failed to fetch initial data:", error);
        showToast(error.message || "Gagal memuat data dari server.", 'error');
    } finally {
        setIsLoading(false);
    }
  }, [showToast, isLoading, activeTahunAjaranId]);

  useEffect(() => {
    const loggedInUser = sessionStorage.getItem('currentUser');
    if (loggedInUser) {
        setCurrentUser(JSON.parse(loggedInUser));
    }
    fetchData();
  }, []);

  useEffect(() => {
    // Dynamically update favicon
    if (appSettings?.logo_sekolah) {
      const favicon = document.getElementById('favicon') as HTMLLinkElement;
      if (favicon) {
        favicon.href = appSettings.logo_sekolah;
      }
    }
    // Dynamically update title
    if (appSettings?.nama_sekolah) {
        document.title = `SISTER : ${appSettings.nama_sekolah}`;
    }
  }, [appSettings]);

  const handleApiRequest = useCallback(async (endpoint: string, method: 'POST' | 'PUT' | 'DELETE', body: any, successMessage: string) => {
      try {
          await fetchApi(endpoint, method, body);
          await fetchData();
          showToast(successMessage, 'success');
          return true;
      } catch (error: any) {
          console.error(`API request failed for ${method} ${endpoint}:`, error);
          showToast(error.message || 'Operasi gagal', 'error');
          return false;
      }
  }, [fetchData, showToast]);
  
  const handleLogin = async (username: string, password: string): Promise<{ success: boolean; message?: string; }> => {
    try {
        const result = await fetchApi('login_handler.php', 'POST', { username, password });
        
        const user = result.user;
        setCurrentUser(user);
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        
        let defaultPage = 'Dashboard';
        if (user.role === Role.SISWA || user.role === Role.KETUA_KELAS_SISWA) {
            defaultPage = 'Laporan Pribadi';
        }
        setActivePage(defaultPage);
        
        showToast(`Selamat datang, ${user.nama || user.username}!`, 'success');
        return { success: true };
    } catch (error: any) {
        console.error("Login failed:", error);
        return { success: false, message: error.message };
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('currentUser');
    showToast('Anda berhasil logout.', 'success');
  };

  const addAbsensi = (newAbsensiList: Omit<Absensi, 'id_absensi'>[]) => 
    handleApiRequest('absensi_handler.php', 'POST', { absensi: newAbsensiList }, 'Absensi berhasil dikirim!');

  const bulkUpdateAbsensi = (updatedAbsensiList: any[]) => 
    handleApiRequest('absensi_handler.php', 'PUT', { action: 'bulk-update', absensi: updatedAbsensiList }, 'Absensi berhasil diperbarui!');

  const updateAbsensi = (updatedAbsensi: Absensi) => 
    handleApiRequest('absensi_handler.php', 'PUT', updatedAbsensi, 'Status absensi diperbarui.');
  
  const validateAbsensiKelas = (kelas: string, tanggal: string) => 
    handleApiRequest('absensi_handler.php', 'PUT', { action: 'validate', kelas, tanggal }, `Absensi kelas ${kelas} berhasil divalidasi.`);
  
  const filteredAbsensiData = useMemo(() => {
    if (tahunAjaranData.length === 0) return [];
    const activeTA = tahunAjaranData.find(ta => ta.id === activeTahunAjaranId);
    if (!activeTA) return [];
    
    return absensiData.filter(absen => 
        absen.tahun_ajaran === activeTA.tahun_ajaran && absen.semester === activeSemester
    );
  }, [absensiData, activeTahunAjaranId, activeSemester, tahunAjaranData]);

  if (isLoading && !currentUser) {
      return <div className="flex items-center justify-center h-screen text-xl font-semibold">Memuat data aplikasi...</div>
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} appSettings={appSettings} />;
  }

  const renderContent = () => {
    const activeTahunAjaran = tahunAjaranData.find(ta => ta.id === activeTahunAjaranId);
    
    if (!activeTahunAjaran && tahunAjaranData.length > 0) {
        return <div className="p-4 text-red-500 font-semibold">Data Tahun Ajaran tidak ditemukan. Silakan hubungi Admin.</div>
    }
    
    if (currentUser.role === Role.SISWA || currentUser.role === Role.KETUA_KELAS_SISWA) {
        switch(activePage) {
            case 'Input Absensi':
                return currentUser.role === Role.KETUA_KELAS_SISWA ? <InputAbsensi user={currentUser} siswaData={siswaData} absensiData={absensiData} addAbsensi={addAbsensi} bulkUpdateAbsensi={bulkUpdateAbsensi} tahunAjaranData={tahunAjaranData} /> : null;
            case 'Laporan Pribadi':
            default:
                return activeTahunAjaran ? <DashboardSiswa user={currentUser} absensiData={absensiData} activeTahunAjaran={activeTahunAjaran} activeSemester={activeSemester} /> : null;
        }
    }

    if (currentUser.role === Role.ADMIN) {
        switch(activePage) {
            case 'Dashboard':
                return <DashboardKepalaSekolah absensiData={absensiData} filteredAbsensiData={filteredAbsensiData} siswaData={siswaData} />;
            case 'Siswa':
                return <ManajemenSiswa siswaData={siswaData} apiHandler={handleApiRequest} />;
            case 'Guru':
                return <ManajemenUser usersData={usersData} apiHandler={handleApiRequest} />;
            case 'Tahun Ajaran':
                return <ManajemenTahunAjaran tahunAjaranData={tahunAjaranData} apiHandler={handleApiRequest} />;
            case 'Laporan':
                return <Laporan absensiData={filteredAbsensiData} siswaData={siswaData} />;
            case 'Catatan Kasus':
                return <ManajemenKasus currentUser={currentUser} catatanKasusData={catatanKasusData} siswaData={siswaData} usersData={usersData} apiHandler={handleApiRequest} appSettings={appSettings} />;
            case 'Input Absensi':
                return <InputAbsensi user={currentUser} siswaData={siswaData} absensiData={absensiData} addAbsensi={addAbsensi} bulkUpdateAbsensi={bulkUpdateAbsensi} tahunAjaranData={tahunAjaranData} />;
            case 'Validasi Absensi':
                return <DashboardGuruBK currentUser={currentUser} siswaData={siswaData} absensiData={filteredAbsensiData} updateAbsensi={updateAbsensi} validateAbsensiKelas={validateAbsensiKelas} />;
            case 'Kartu Siswa':
                return <CetakKartu mode="siswa" siswaData={siswaData} />;
            case 'Kartu Guru':
                return <CetakKartu mode="guru" usersData={usersData} />;
            case 'Setting Aplikasi':
                return appSettings && (
                    <ManajemenSetting 
                        appSettings={appSettings} 
                        apiHandler={handleApiRequest}
                        tahunAjaranData={tahunAjaranData}
                        activeTahunAjaranId={activeTahunAjaranId}
                        setActiveTahunAjaranId={setActiveTahunAjaranId}
                        activeSemester={activeSemester}
                        setActiveSemester={setActiveSemester}
                    />
                );
            default:
                return <DashboardKepalaSekolah absensiData={absensiData} filteredAbsensiData={filteredAbsensiData} siswaData={siswaData} />;
        }
    }

    if (currentUser.role === Role.KEPALA_SEKOLAH) {
        switch(activePage) {
            case 'Laporan':
                 return <Laporan absensiData={filteredAbsensiData} siswaData={siswaData} />;
            case 'Catatan Kasus':
                return <ManajemenKasus currentUser={currentUser} catatanKasusData={catatanKasusData} siswaData={siswaData} usersData={usersData} apiHandler={handleApiRequest} appSettings={appSettings} />;
            case 'Dashboard':
            default:
                 return <DashboardKepalaSekolah absensiData={absensiData} filteredAbsensiData={filteredAbsensiData} siswaData={siswaData} />;
        }
    }
    
    if (currentUser.role === Role.WALI_KELAS) {
        switch(activePage) {
            case 'Monitoring Kelas':
                return <DashboardWaliKelas user={currentUser} siswaData={siswaData} absensiData={filteredAbsensiData} />;
            case 'Input Absensi':
                return <InputAbsensi user={currentUser} siswaData={siswaData} absensiData={absensiData} addAbsensi={addAbsensi} bulkUpdateAbsensi={bulkUpdateAbsensi} tahunAjaranData={tahunAjaranData} />;
            case 'Laporan':
                return <Laporan absensiData={filteredAbsensiData} siswaData={siswaData} user={currentUser} />;
            case 'Catatan Kasus':
                return <ManajemenKasus currentUser={currentUser} catatanKasusData={catatanKasusData} siswaData={siswaData} usersData={usersData} apiHandler={handleApiRequest} appSettings={appSettings} />;
            case 'Dashboard':
            default:
                return <DashboardWaliKelas user={currentUser} siswaData={siswaData} absensiData={filteredAbsensiData} />;
        }
    }

    if (currentUser.role === Role.GURU_BK) {
        switch(activePage) {
            case 'Dashboard':
                 return <DashboardGuruBK currentUser={currentUser} siswaData={siswaData} absensiData={filteredAbsensiData} updateAbsensi={updateAbsensi} validateAbsensiKelas={validateAbsensiKelas} />;
            case 'Input Absensi':
                return <InputAbsensi user={currentUser} siswaData={siswaData} absensiData={absensiData} addAbsensi={addAbsensi} bulkUpdateAbsensi={bulkUpdateAbsensi} tahunAjaranData={tahunAjaranData} />;
            case 'Laporan':
                return <Laporan absensiData={filteredAbsensiData} siswaData={siswaData} />;
            case 'Catatan Kasus':
                return <ManajemenKasus currentUser={currentUser} catatanKasusData={catatanKasusData} siswaData={siswaData} usersData={usersData} apiHandler={handleApiRequest} appSettings={appSettings} />;
            case 'Validasi Absensi':
            default:
                return <DashboardGuruBK currentUser={currentUser} siswaData={siswaData} absensiData={filteredAbsensiData} updateAbsensi={updateAbsensi} validateAbsensiKelas={validateAbsensiKelas} />;
        }
    }
    
    if (currentUser.role === Role.GURU) {
        switch(activePage) {
            case 'Laporan':
                 return <Laporan absensiData={filteredAbsensiData} siswaData={siswaData} />;
            case 'Dashboard':
            default:
                 return <DashboardKepalaSekolah absensiData={absensiData} filteredAbsensiData={filteredAbsensiData} siswaData={siswaData} />;
        }
    }

    return <div>Role tidak dikenali.</div>;
  };

  return (
    <>
      <Toasts />
      <div className={`relative flex h-screen bg-gray-100 transition-all duration-300`}>
        <Sidebar user={currentUser} activePage={activePage} setActivePage={setActivePage} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} appSettings={appSettings} />
        {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"></div>}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
              user={currentUser} 
              onLogout={handleLogout}
              toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              appSettings={appSettings}
          />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 p-4 md:p-6">
            {isLoading ? <div className="text-center py-10">Memuat data...</div> : renderContent()}
          </main>
        </div>
      </div>
    </>
  );
};

export default App;
