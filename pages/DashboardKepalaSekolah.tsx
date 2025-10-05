import React, { useMemo } from 'react';
import { Absensi, Siswa, StatusKehadiran } from '../types';
import Card from '../components/Card';
import Laporan from './Laporan';
import { getLocalDateString, formatIndonesianDate } from '../utils/date';
import { sortKelas } from '../utils/helpers';

interface DashboardKepalaSekolahProps {
  absensiData: Absensi[]; // Full unfiltered data for "Today's Stats"
  filteredAbsensiData: Absensi[]; // Filtered data for the embedded Report component
  siswaData: Siswa[];
}

const DashboardKepalaSekolah: React.FC<DashboardKepalaSekolahProps> = ({ absensiData, filteredAbsensiData, siswaData }) => {
  const today = getLocalDateString();
  const todayFormatted = useMemo(() => formatIndonesianDate(today), [today]);
  const isTodaySunday = new Date().getDay() === 0;

  const todayStats = useMemo(() => {
    const todayAbsensi = absensiData.filter(a => a.tanggal === today);
    const totalSiswa = siswaData.length;
    const totalHadir = todayAbsensi.filter(a => a.status === StatusKehadiran.HADIR || a.status === StatusKehadiran.TERLAMBAT).length;
    
    // FIX: Refactored stats calculation to be simpler and more robust, avoiding potential type inference issues.
    const statsByClass: { [key: string]: { hadir: number, total: number } } = {};

    // Initialize and count totals for all classes
    for (const siswa of siswaData) {
        if (!statsByClass[siswa.kelas]) {
            statsByClass[siswa.kelas] = { hadir: 0, total: 0 };
        }
        statsByClass[siswa.kelas].total++;
    }

    // Add hadir count from today's attendance
     for (const absen of todayAbsensi) {
        const siswa = siswaData.find(s => s.id_siswa === absen.id_siswa);
        if (siswa && (absen.status === StatusKehadiran.HADIR || absen.status === StatusKehadiran.TERLAMBAT)) {
             if (statsByClass[siswa.kelas]) {
                statsByClass[siswa.kelas].hadir++;
            }
        }
    }

    return {
      totalHadir,
      totalSiswa,
      attendanceRate: totalSiswa > 0 ? ((totalHadir / totalSiswa) * 100).toFixed(1) : 0,
      statsByClass
    };
  }, [absensiData, siswaData, today]);
  
  // Helper function to determine card color based on attendance percentage
  const getCardColorClasses = (percentage: number) => {
    if (percentage >= 95) {
      return 'bg-green-50 border-green-300 text-green-800'; // Excellent
    } else if (percentage >= 80) {
      return 'bg-yellow-50 border-yellow-300 text-yellow-800'; // Good
    } else if (percentage > 0) {
      return 'bg-red-50 border-red-300 text-red-800'; // Needs attention
    }
    return 'bg-gray-50 border-gray-200 text-gray-800'; // No data
  };

  if (isTodaySunday) {
    return (
      <Card title="Selamat Hari Minggu!">
        <div className="text-center p-8 bg-blue-50 rounded-lg">
          <h2 className="text-2xl font-bold text-blue-800">Saatnya Rebahan! 🏖️</h2>
          <p className="mt-4 text-gray-700 max-w-md mx-auto">
            Hari minggu, saatnya rebahan jangan pantengin terus sistem kehadiran ini. Nikmati hari liburmu, besok kita mulai lagi!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card title={`Ringkasan Absensi Global - ${todayFormatted}`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="bg-blue-100 p-4 rounded-lg">
                <p className="text-sm text-blue-700 font-semibold">Tingkat Kehadiran Hari Ini</p>
                <p className="text-3xl font-bold text-blue-900">{todayStats.attendanceRate}%</p>
            </div>
            <div className="bg-green-100 p-4 rounded-lg">
                <p className="text-sm text-green-700 font-semibold">Siswa Hadir</p>
                <p className="text-3xl font-bold text-green-900">{todayStats.totalHadir}</p>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-700 font-semibold">Total Siswa</p>
                <p className="text-3xl font-bold text-gray-900">{todayStats.totalSiswa}</p>
            </div>
        </div>
      </Card>
      
      <Card title="Tingkat Kehadiran per Kelas Hari Ini">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Object.keys(todayStats.statsByClass).length > 0 ? Object.keys(todayStats.statsByClass).sort(sortKelas).map((kelas) => {
            const stats = todayStats.statsByClass[kelas];
            const percentage = stats.total > 0 ? (stats.hadir / stats.total) * 100 : 0;
            const cardColorClasses = getCardColorClasses(percentage);
            return (
                <div key={kelas} className={`border p-4 rounded-lg shadow-sm text-center transform hover:scale-105 transition-transform duration-200 ${cardColorClasses}`}>
                    <h4 className="font-bold text-md">{kelas}</h4>
                    <p className="text-3xl font-bold my-1">{percentage.toFixed(0)}%</p>
                    <p className="text-xs text-current opacity-75">({stats.hadir} dari {stats.total} siswa)</p>
                </div>
            )
        }) : <p className="col-span-full text-center text-gray-500 py-4">Belum ada absensi untuk hari ini.</p>}
        </div>
      </Card>
      
      <Laporan absensiData={filteredAbsensiData} siswaData={siswaData} />
    </div>
  );
};

export default DashboardKepalaSekolah;
