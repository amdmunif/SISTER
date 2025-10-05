
import React, { useState, useMemo } from 'react';
import { User, Siswa, Absensi, StatusKehadiran, StatusValidasi } from '../types';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { getLocalDateString } from '../utils/date';

interface DashboardWaliKelasProps {
  user: User;
  siswaData: Siswa[];
  absensiData: Absensi[];
}

const DashboardWaliKelas: React.FC<DashboardWaliKelasProps> = ({ user, siswaData, absensiData }) => {
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const isTodaySunday = new Date().getDay() === 0;

  const attendanceForClass = useMemo(() => {
    const studentsInClass = siswaData.filter(s => s.kelas === user.kelas);
    const attendanceOnDate = absensiData.filter(a => a.tanggal === selectedDate);
    
    return studentsInClass.map(siswa => {
      const attendanceRecord = attendanceOnDate.find(a => a.id_siswa === siswa.id_siswa);
      return {
        siswa,
        absen: attendanceRecord || null,
      };
    });
  }, [selectedDate, user.kelas, siswaData, absensiData]);
  
  const overallStatus = useMemo(() => {
    if (attendanceForClass.length > 0 && attendanceForClass.every(item => item.absen !== null)) {
      return attendanceForClass[0].absen!.status_validasi;
    }
    return null;
  }, [attendanceForClass]);

  const getStatusBadge = (status: StatusKehadiran) => {
    switch (status) {
      case StatusKehadiran.HADIR: return <Badge color="green">Hadir</Badge>;
      case StatusKehadiran.SAKIT: return <Badge color="yellow">Sakit</Badge>;
      case StatusKehadiran.IZIN: return <Badge color="blue">Izin</Badge>;
      case StatusKehadiran.ALFA: return <Badge color="red">Alfa</Badge>;
      case StatusKehadiran.TERLAMBAT: return <Badge color="yellow">Terlambat</Badge>;
      default: return <Badge color="gray">N/A</Badge>;
    }
  };

  if (isTodaySunday) {
    return (
        <Card title={`Monitoring Kelas ${user.kelas}`}>
            <div className="text-center p-8 bg-blue-50 rounded-lg">
                <h2 className="text-2xl font-bold text-blue-800">Selamat Hari Minggu! 🏖️</h2>
                <p className="mt-4 text-gray-700 max-w-md mx-auto">
                    Anak-anak juga lagi libur. Nikmati istirahatmu, Bapak/Ibu Guru!
                </p>
            </div>
        </Card>
    );
  }

  return (
    <Card title={`Monitoring Absensi Kelas ${user.kelas}`}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <label htmlFor="date-filter" className="font-bold mr-2">Pilih Tanggal:</label>
          <input type="date" id="date-filter" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="p-2 border rounded"/>
        </div>
        {overallStatus && (
            <div className="flex items-center space-x-2">
                <span className="font-semibold">Status Validasi:</span>
                {overallStatus === StatusValidasi.VALID ? <Badge color="green">Valid</Badge> : <Badge color="yellow">Belum Valid</Badge>}
            </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="py-3 px-4 uppercase font-semibold text-sm">NIS</th>
              <th className="py-3 px-4 uppercase font-semibold text-sm">Nama Siswa</th>
              <th className="py-3 px-4 uppercase font-semibold text-sm">Status Kehadiran</th>
              <th className="py-3 px-4 uppercase font-semibold text-sm">Keterangan</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {attendanceForClass.map(({ siswa, absen }, index) => (
              <tr key={siswa.id_siswa} className={index % 2 === 0 ? 'bg-gray-100' : ''}>
                <td className="py-3 px-4">{siswa.nis}</td>
                <td className="py-3 px-4">{siswa.nama}</td>
                <td className="py-3 px-4">
                  {absen ? getStatusBadge(absen.status) : <Badge color="gray">Belum Diabsen</Badge>}
                </td>
                <td className="py-3 px-4">{absen?.keterangan || '-'}</td>
              </tr>
            ))}
             {attendanceForClass.length === 0 && (
                <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-500">Tidak ada data siswa di kelas ini.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default DashboardWaliKelas;