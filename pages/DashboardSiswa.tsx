import React, { useMemo } from 'react';
import { User, Absensi, StatusKehadiran, TahunAjaran, Semester } from '../types';
import Card from '../components/Card';
import Badge from '../components/Badge';
import DataTable, { type Column } from '../components/DataTable';
import { formatIndonesianDateShort } from '../utils/date';

interface DashboardSiswaProps {
  user: User;
  absensiData: Absensi[];
  activeTahunAjaran: TahunAjaran;
  activeSemester: Semester;
}

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

const DashboardSiswa: React.FC<DashboardSiswaProps> = ({ user, absensiData, activeTahunAjaran, activeSemester }) => {

  const personalAbsensi = useMemo(() => {
    return absensiData
      .filter(a => a.id_siswa === user.original_id)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [absensiData, user.original_id]);

  const summary = useMemo(() => {
    const filteredForSummary = personalAbsensi.filter(a =>
        a.tahun_ajaran === activeTahunAjaran.tahun_ajaran && a.semester === activeSemester
    );

    const summaryData = {
        [StatusKehadiran.HADIR]: 0,
        [StatusKehadiran.SAKIT]: 0,
        [StatusKehadiran.IZIN]: 0,
        [StatusKehadiran.ALFA]: 0,
        [StatusKehadiran.TERLAMBAT]: 0,
        total: filteredForSummary.length,
    };
    filteredForSummary.forEach(a => {
        summaryData[a.status]++;
    });
    return summaryData;
  }, [personalAbsensi, activeTahunAjaran, activeSemester]);

  const columns = useMemo<Column<Absensi>[]>(() => [
    { header: 'Tanggal', accessor: 'tanggal', sortable: true, cell: (row) => formatIndonesianDateShort(row.tanggal) },
    { header: 'T.A', accessor: 'tahun_ajaran', sortable: true },
    { header: 'Semester', accessor: 'semester', sortable: true },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      cell: (row: Absensi) => getStatusBadge(row.status)
    },
    { 
      header: 'Keterangan',
      accessor: 'keterangan',
      sortable: false,
      cell: (row: Absensi) => row.keterangan || '-'
    },
    { header: 'Validasi', accessor: 'status_validasi', sortable: true },
  ], []);
  
  return (
    <div className="space-y-6">
        <Card title="Informasi Siswa">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <p className="text-sm font-semibold text-gray-500">Nama Lengkap</p>
                    <p className="text-lg font-bold text-gray-800">{user.nama}</p>
                </div>
                 <div>
                    <p className="text-sm font-semibold text-gray-500">NIS</p>
                    <p className="text-lg font-bold text-gray-800">{user.username}</p>
                </div>
                 <div>
                    <p className="text-sm font-semibold text-gray-500">Kelas</p>
                    <p className="text-lg font-bold text-gray-800">{user.kelas}</p>
                </div>
                 <div>
                    <p className="text-sm font-semibold text-gray-500">Status</p>
                    <p className="text-lg font-bold text-gray-800">{user.role}</p>
                </div>
            </div>
        </Card>

        <Card title={`Rekapitulasi Absensi - T.A ${activeTahunAjaran.tahun_ajaran} Semester ${activeSemester}`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-center">
                <div className="bg-green-100 p-3 rounded-lg"><p className="font-semibold text-green-800">Hadir</p><p className="text-2xl font-bold">{summary.Hadir}</p></div>
                <div className="bg-yellow-100 p-3 rounded-lg"><p className="font-semibold text-yellow-800">Sakit</p><p className="text-2xl font-bold">{summary.Sakit}</p></div>
                <div className="bg-blue-100 p-3 rounded-lg"><p className="font-semibold text-blue-800">Izin</p><p className="text-2xl font-bold">{summary.Izin}</p></div>
                <div className="bg-red-100 p-3 rounded-lg"><p className="font-semibold text-red-800">Alfa</p><p className="text-2xl font-bold">{summary.Alfa}</p></div>
                <div className="bg-yellow-100 p-3 rounded-lg col-span-2 sm:col-span-1"><p className="font-semibold text-yellow-800">Terlambat</p><p className="text-2xl font-bold">{summary.Terlambat}</p></div>
            </div>
        </Card>
        
        <Card title="Seluruh Riwayat Absensi">
            <DataTable columns={columns} data={personalAbsensi} defaultSort={{ accessor: 'tanggal', direction: 'desc' }} />
        </Card>
    </div>
  );
};

export default DashboardSiswa;