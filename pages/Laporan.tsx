import React, { useState, useMemo } from 'react';
import { Siswa, Absensi, User, Role, StatusKehadiran, StatusValidasi } from '../types';
import Card from '../components/Card';
import { exportToExcel, exportToPdf } from '../utils/export';
import DataTable, { type Column } from '../components/DataTable';
import Badge from '../components/Badge';
import { getLocalDateString, getSchoolWeekRange, formatIndonesianDate, formatMonthYearIndonesian, formatIndonesianDateShort, formatShortDateForMatrix } from '../utils/date';
import { sortKelas } from '../utils/helpers';
import { useToast } from '../contexts/ToastContext';
import { EyeIcon } from '../components/icons/Icons';

interface LaporanProps {
  absensiData: Absensi[];
  siswaData: Siswa[];
  user?: User; // Optional user prop for role-specific filtering
}

type StudentSummaryRow = {
  siswa: Siswa;
  [StatusKehadiran.HADIR]: number;
  [StatusKehadiran.SAKIT]: number;
  [StatusKehadiran.IZIN]: number;
  [StatusKehadiran.ALFA]: number;
  [StatusKehadiran.TERLAMBAT]: number;
  total: number;
  persentase: number;
};

type ClassSummaryRow = {
  kelas: string;
  [StatusKehadiran.HADIR]: number;
  [StatusKehadiran.SAKIT]: number;
  [StatusKehadiran.IZIN]: number;
  [StatusKehadiran.ALFA]: number;
  [StatusKehadiran.TERLAMBAT]: number;
  totalAbsen: number;
  totalSiswaDiKelas: number;
  statusValidasi: 'Valid' | 'Belum Valid' | 'Campuran' | 'N/A';
};

type DetailedDailyRow = Absensi & { siswa: Siswa };

const statusToCode = {
    [StatusKehadiran.HADIR]: 'H',
    [StatusKehadiran.SAKIT]: 'S',
    [StatusKehadiran.IZIN]: 'I',
    [StatusKehadiran.ALFA]: 'A',
    [StatusKehadiran.TERLAMBAT]: 'T',
};

const Laporan: React.FC<LaporanProps> = ({ absensiData, siswaData, user }) => {
  const isWaliKelas = user?.role === Role.WALI_KELAS;
  const isGlobalRole = !isWaliKelas;
  
  const [view, setView] = useState<'summary' | 'detail'>('summary');
  const [detailContext, setDetailContext] = useState<string | null>(null);

  const [reportType, setReportType] = useState('harian');
  const [filterDate, setFilterDate] = useState(getLocalDateString());
  const [filterMonth, setFilterMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [filterKelas, setFilterKelas] = useState(isWaliKelas ? user.kelas! : 'Semua');
  const { showToast } = useToast();

  const availableKelas = useMemo(() => ['Semua', ...[...new Set(siswaData.map(s => s.kelas))].sort(sortKelas)], [siswaData]);

  const { data: baseFilteredData, weekRange } = useMemo(() => {
    let data = absensiData;
    let weekRange: { start: string; end: string } | null = null;
    const targetKelas = isWaliKelas ? user.kelas! : filterKelas;

    if (targetKelas !== 'Semua') {
      const siswaInClass = siswaData.filter(s => s.kelas === targetKelas).map(s => s.id_siswa);
      data = data.filter(a => siswaInClass.includes(a.id_siswa));
    }
    
    if (reportType === 'harian') {
        data = data.filter(a => a.tanggal === filterDate);
    } else if (reportType === 'mingguan') {
        weekRange = getSchoolWeekRange(new Date(filterDate + 'T00:00:00')); // Prevent timezone issues
        data = data.filter(a => a.tanggal >= weekRange!.start && a.tanggal <= weekRange!.end);
    } else if (reportType === 'bulanan') {
        data = data.filter(a => a.tanggal.startsWith(filterMonth));
    }
    
    const processedData = data.map(a => ({
        ...a,
        siswa: siswaData.find(s => s.id_siswa === a.id_siswa)
    })).filter((a): a is DetailedDailyRow => !!a.siswa);

    return { data: processedData, weekRange };
  }, [absensiData, siswaData, reportType, filterDate, filterMonth, filterKelas, isWaliKelas, user]);
  
  const matrixViewData = useMemo(() => {
    if (view !== 'detail') return { data: [], dates: [] };
    
    let dataForMatrix = baseFilteredData;
     if (isGlobalRole && detailContext) {
      dataForMatrix = dataForMatrix.filter(d => d.siswa.kelas === detailContext);
    } else if (isWaliKelas) {
      dataForMatrix = dataForMatrix.filter(d => d.siswa.kelas === user?.kelas);
    }

    const uniqueDates = [...new Set(dataForMatrix.map(d => d.tanggal))].sort();
    // FIX: Explicitly type `a` and `b` as Siswa to prevent them from being inferred as `unknown`.
    const siswaInContext = [...new Map(dataForMatrix.map(item => [item.siswa.id_siswa, item.siswa])).values()].sort((a: Siswa,b: Siswa) => a.nama.localeCompare(b.nama));

    // FIX: Explicitly type `siswa` as Siswa to prevent its properties from being inaccessible.
    const matrixData = siswaInContext.map((siswa: Siswa) => {
        const row: any = {
            'No': 0, // Placeholder for index
            'NIS': siswa.nis,
            'Nama Siswa': siswa.nama,
        };
        const rekap = { H: 0, S: 0, I: 0, A: 0, T: 0 };
        uniqueDates.forEach(date => {
            const absen = dataForMatrix.find(d => d.id_siswa === siswa.id_siswa && d.tanggal === date);
            const status = absen ? statusToCode[absen.status] : '-';
            row[date] = status;
            if (absen) {
                const code = statusToCode[absen.status] as keyof typeof rekap;
                if(rekap[code] !== undefined) rekap[code]++;
            }
        });
        row['Hadir'] = rekap.H;
        row['Sakit'] = rekap.S;
        row['Izin'] = rekap.I;
        row['Alfa'] = rekap.A;
        row['Terlambat'] = rekap.T;
        return row;
    });

    return { data: matrixData, dates: uniqueDates };
  }, [baseFilteredData, view, detailContext, isGlobalRole, isWaliKelas, user]);


  const studentSummaryData = useMemo<StudentSummaryRow[] | null>(() => {
    if (!isWaliKelas || reportType === 'harian') return null;

    const summary: { [siswaId: number]: Omit<StudentSummaryRow, 'persentase' | 'siswa'> & { siswa: Siswa } } = {};
    const relevantSiswa = siswaData.filter(s => s.kelas === filterKelas);

    relevantSiswa.forEach(s => {
      summary[s.id_siswa] = {
        siswa: s,
        [StatusKehadiran.HADIR]: 0, [StatusKehadiran.SAKIT]: 0, [StatusKehadiran.IZIN]: 0, [StatusKehadiran.ALFA]: 0, [StatusKehadiran.TERLAMBAT]: 0,
        total: 0,
      };
    });

    baseFilteredData.forEach(absen => {
      if (summary[absen.id_siswa]) {
        summary[absen.id_siswa][absen.status]++;
        summary[absen.id_siswa].total++;
      }
    });

    return Object.values(summary).map(s => ({
      ...s,
      persentase: s.total > 0 ? ((s[StatusKehadiran.HADIR] + s[StatusKehadiran.TERLAMBAT]) / s.total) * 100 : 0,
    }));
  }, [baseFilteredData, isWaliKelas, reportType, siswaData, filterKelas]);
  
  const classSummaryData = useMemo<ClassSummaryRow[] | null>(() => {
    if (!isGlobalRole) return null;

    const summary: { [kelas: string]: Omit<ClassSummaryRow, 'kelas'> } = {};
    const relevantKelas = filterKelas === 'Semua' 
      ? [...new Set(siswaData.map(s => s.kelas))]
      : [filterKelas];
    
    relevantKelas.forEach(k => {
      summary[k] = {
        [StatusKehadiran.HADIR]: 0, [StatusKehadiran.SAKIT]: 0, [StatusKehadiran.IZIN]: 0, [StatusKehadiran.ALFA]: 0, [StatusKehadiran.TERLAMBAT]: 0,
        totalAbsen: 0,
        totalSiswaDiKelas: siswaData.filter(s => s.kelas === k).length,
        statusValidasi: 'N/A',
      };
    });
    
    baseFilteredData.forEach(absen => {
      if (absen.siswa && summary[absen.siswa.kelas]) {
        summary[absen.siswa.kelas][absen.status]++;
        summary[absen.siswa.kelas].totalAbsen++;
      }
    });

    if (reportType === 'harian') {
      Object.keys(summary).forEach(k => {
        const absensiKelas = baseFilteredData.filter(a => a.siswa.kelas === k);
        if (absensiKelas.length > 0) {
          const allValidated = absensiKelas.every(a => a.status_validasi === StatusValidasi.VALID);
          if (allValidated) summary[k].statusValidasi = 'Valid';
          else summary[k].statusValidasi = 'Belum Valid';
        }
      });
    }

    return Object.entries(summary)
      .map(([kelas, data]) => ({ kelas, ...data }))
      .sort((a,b) => sortKelas(a.kelas, b.kelas));
  }, [baseFilteredData, isGlobalRole, siswaData, filterKelas, reportType]);

  const getReportTitle = (isForExport = false) => {
    let title = `Laporan Absensi`;
    if (view === 'detail' && detailContext) {
        title += ` Detail ${isGlobalRole ? `Kelas ${detailContext}` : `Kelas ${user?.kelas}`}`;
    } else {
        title += ` ${filterKelas === 'Semua' ? 'Semua Kelas' : `Kelas ${filterKelas}`}`;
    }

    if (reportType === 'harian') {
        title += ` - ${isForExport ? filterDate : formatIndonesianDateShort(filterDate)}`;
    }
    if (reportType === 'mingguan') {
        if(weekRange) {
            const startDate = new Date(`${weekRange.start}T00:00:00`);
            const endDate = new Date(`${weekRange.end}T00:00:00`);
            
            const startFormatted = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long' }).format(startDate);
            const endFormatted = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(endDate);
            
            title += ` - ${startFormatted} s/d ${endFormatted}`;
        }
    }
    if (reportType === 'bulanan') title += ` - Bulan ${formatMonthYearIndonesian(filterMonth)}`;
    return title;
  };
  
  const handleShowDetail = (context: string) => {
    setDetailContext(context);
    setView('detail');
  };
  
  const handleBackToSummary = () => {
    setView('summary');
    setDetailContext(null);
  };
  
  const calculateMatrixData = (dataForMatrix: DetailedDailyRow[]) => {
    if (dataForMatrix.length === 0) return { data: [], dates: [] };

    const uniqueDates = [...new Set(dataForMatrix.map(d => d.tanggal))].sort();
    // FIX: Explicitly type `a` and `b` as Siswa to prevent them from being inferred as `unknown`.
    const siswaInContext = [...new Map(dataForMatrix.map(item => [item.siswa.id_siswa, item.siswa])).values()].sort((a: Siswa,b: Siswa) => a.nama.localeCompare(b.nama));

    // FIX: Explicitly type `siswa` as Siswa to prevent its properties from being inaccessible.
    const matrixData = siswaInContext.map((siswa: Siswa) => {
        const row: any = {
            'NIS': siswa.nis,
            'Nama Siswa': siswa.nama,
        };
        const rekap = { H: 0, S: 0, I: 0, A: 0, T: 0 };
        uniqueDates.forEach(date => {
            const absen = dataForMatrix.find(d => d.id_siswa === siswa.id_siswa && d.tanggal === date);
            const status = absen ? statusToCode[absen.status] : '-';
            row[date] = status;
            if (absen) {
                const code = statusToCode[absen.status] as keyof typeof rekap;
                if(rekap[code] !== undefined) rekap[code]++;
            }
        });
        row['Hadir'] = rekap.H;
        row['Sakit'] = rekap.S;
        row['Izin'] = rekap.I;
        row['Alfa'] = rekap.A;
        row['Terlambat'] = rekap.T;
        return row;
    });

    return { data: matrixData, dates: uniqueDates };
  }

  const handleExport = (type: 'excel' | 'pdf') => {
    if (baseFilteredData.length === 0 && (!classSummaryData || classSummaryData.length === 0)) {
        showToast("Tidak ada data untuk diekspor.", 'error');
        return;
    }

    const title = getReportTitle(true);
    const fileName = title.replace(/[\/\\?%*:|"<>]/g, '-').replace(/ /g, '_');

    // SCENARIO 1: SUMMARY EXPORT (ALL CLASSES)
    if (isGlobalRole && filterKelas === 'Semua') {
        if (!classSummaryData || classSummaryData.length === 0) {
            showToast("Tidak ada data rekapitulasi untuk diekspor.", 'error');
            return;
        }

        const headExport = [['Kelas', 'Hadir', 'Sakit', 'Izin', 'Alfa', 'Terlambat']];
        const bodyExport = classSummaryData.map(row => [
            row.kelas,
            row[StatusKehadiran.HADIR],
            row[StatusKehadiran.SAKIT],
            row[StatusKehadiran.IZIN],
            row[StatusKehadiran.ALFA],
            row[StatusKehadiran.TERLAMBAT],
        ]);

        if (type === 'excel') {
            const dataToExport = classSummaryData.map(row => ({
                'Kelas': row.kelas,
                'Hadir': row[StatusKehadiran.HADIR],
                'Sakit': row[StatusKehadiran.SAKIT],
                'Izin': row[StatusKehadiran.IZIN],
                'Alfa': row[StatusKehadiran.ALFA],
                'Terlambat': row[StatusKehadiran.TERLAMBAT],
            }));
            exportToExcel(dataToExport, fileName, 'Rekap Absensi');
        } else {
            exportToPdf(title, headExport, bodyExport, fileName);
        }
        return;
    }

    // SCENARIOS FOR SPECIFIC CLASS
    const targetKelas = isWaliKelas ? user.kelas! : filterKelas;
    const dataForClass = baseFilteredData.filter(d => d.siswa.kelas === targetKelas);

    if (dataForClass.length === 0) {
        showToast("Tidak ada data untuk diekspor pada kelas ini.", 'error');
        return;
    }

    // SCENARIO 2: DETAILED DAILY EXPORT (SPECIFIC CLASS)
    if (reportType === 'harian') {
        const headExport = [['No', 'NIS', 'Nama Siswa', 'Status', 'Keterangan', 'Validasi']];
        const bodyExport = dataForClass.map((row, index) => [
            index + 1,
            row.siswa.nis,
            row.siswa.nama,
            row.status,
            row.keterangan || '-',
            row.status_validasi,
        ]);
        
        if (type === 'excel') {
            const dataToExport = dataForClass.map((row, index) => ({
                'No': index + 1,
                'NIS': row.siswa.nis,
                'Nama Siswa': row.siswa.nama,
                'Status': row.status,
                'Keterangan': row.keterangan || '-',
                'Validasi': row.status_validasi,
            }));
            exportToExcel(dataToExport, fileName, 'Detail Harian');
        } else {
            exportToPdf(title, headExport, bodyExport, fileName);
        }
        return;
    }

    // SCENARIO 3: DETAILED MATRIX EXPORT (WEEKLY/MONTHLY, SPECIFIC CLASS)
    if (reportType === 'mingguan' || reportType === 'bulanan') {
        const { data: matrixData, dates: uniqueDates } = calculateMatrixData(dataForClass);
        if (matrixData.length === 0) {
            showToast("Tidak ada data detail untuk diekspor.", 'error');
            return;
        }

        const headExport = [['No', 'NIS', 'Nama Siswa', ...uniqueDates.map(d => formatShortDateForMatrix(d)), 'H', 'S', 'I', 'A', 'T']];
        const bodyExport = matrixData.map((row, index) => [
            index + 1,
            row['NIS'],
            row['Nama Siswa'],
            ...uniqueDates.map(date => row[date]),
            row['Hadir'],
            row['Sakit'],
            row['Izin'],
            row['Alfa'],
            row['Terlambat'],
        ]);
        
        const excelData = matrixData.map((row, index) => {
            const excelRow: any = {
                'No': index + 1,
                'NIS': row['NIS'],
                'Nama Siswa': row['Nama Siswa'],
            };
            uniqueDates.forEach(date => {
                excelRow[formatShortDateForMatrix(date)] = row[date];
            });
            excelRow['Hadir (H)'] = row['Hadir'];
            excelRow['Sakit (S)'] = row['Sakit'];
            excelRow['Izin (I)'] = row['Izin'];
            excelRow['Alfa (A)'] = row['Alfa'];
            excelRow['Terlambat (T)'] = row['Terlambat'];
            return excelRow;
        });

        if (type === 'excel') {
            exportToExcel(excelData, fileName, 'Detail Absensi');
        } else {
            exportToPdf(title, headExport, bodyExport, fileName);
        }
        return;
    }
  };
  
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

  const classSummaryColumns = useMemo<Column<ClassSummaryRow>[]>(() => {
    const columns: Column<ClassSummaryRow>[] = [
      { header: 'Kelas', accessor: 'kelas', sortable: true },
      { header: 'Hadir', accessor: StatusKehadiran.HADIR, sortable: true },
      { header: 'Sakit', accessor: StatusKehadiran.SAKIT, sortable: true },
      { header: 'Izin', accessor: StatusKehadiran.IZIN, sortable: true },
      { header: 'Alfa', accessor: StatusKehadiran.ALFA, sortable: true },
      { header: 'Terlambat', accessor: StatusKehadiran.TERLAMBAT, sortable: true },
    ];
    if (reportType === 'harian') {
      columns.push({ header: 'Status Validasi', accessor: 'statusValidasi', sortable: true });
    }
    columns.push({ header: 'Aksi', accessor: 'kelas', cell: (row) => (
        <button title="Lihat Detail" onClick={() => handleShowDetail(row.kelas)} className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100 transition-colors">
            <EyeIcon />
        </button>
    )});
    return columns;
  }, [reportType]);
  
  const studentDailyColumns = useMemo<Column<DetailedDailyRow>[]>(() => [
    { header: 'Tanggal', accessor: 'tanggal', sortable: true, cell: (row) => formatIndonesianDateShort(row.tanggal) },
    { header: 'NIS', accessor: (row) => row.siswa?.nis || '', sortable: true },
    { header: 'Nama Siswa', accessor: (row) => row.siswa?.nama || '', sortable: true },
    { header: 'Status', accessor: 'status', sortable: true, cell: (row) => getStatusBadge(row.status) },
    { header: 'Keterangan', accessor: 'keterangan', cell: (row) => row.keterangan || '-' },
    { header: 'Validasi', accessor: 'status_validasi', sortable: true },
  ], []);

  const studentSummaryColumns = useMemo<Column<StudentSummaryRow>[]>(() => [
    { header: 'NIS', accessor: (row) => row.siswa.nis, sortable: true },
    { header: 'Nama Siswa', accessor: (row) => row.siswa.nama, sortable: true },
    { header: 'Hadir', accessor: StatusKehadiran.HADIR, sortable: true },
    { header: 'Terlambat', accessor: StatusKehadiran.TERLAMBAT, sortable: true },
    { header: 'Sakit', accessor: StatusKehadiran.SAKIT, sortable: true },
    { header: 'Izin', accessor: StatusKehadiran.IZIN, sortable: true },
    { header: 'Alfa', accessor: StatusKehadiran.ALFA, sortable: true },
    { header: 'Kehadiran', accessor: 'persentase', sortable: true, cell: (row) => `${row.persentase.toFixed(1)}%` },
    { header: 'Aksi', accessor: (row) => String(row.siswa.id_siswa), cell: (row) => (
        <button title="Lihat Detail" onClick={() => handleShowDetail(String(row.siswa.id_siswa))} className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100 transition-colors">
            <EyeIcon />
        </button>
    )},
  ], []);
  
  const matrixColumns = useMemo<Column<any>[]>(() => {
    if (view !== 'detail') return [];
    const { dates } = matrixViewData;
    const dateColumns: Column<any>[] = dates.map(date => ({
        header: formatShortDateForMatrix(date),
        accessor: date
    }));
    return [
        { header: 'No', accessor: 'No', cell: (row: any) => row.No },
        { header: 'NIS', accessor: 'NIS' },
        { header: 'Nama Siswa', accessor: 'Nama Siswa' },
        ...dateColumns,
        { header: 'H', accessor: 'Hadir' },
        { header: 'S', accessor: 'Sakit' },
        { header: 'I', accessor: 'Izin' },
        { header: 'A', accessor: 'Alfa' },
        { header: 'T', accessor: 'Terlambat' }
    ];
  }, [view, matrixViewData]);


  return (
    <Card title="Laporan Absensi Kustom">
      <div className="bg-gray-50 p-4 rounded-lg mb-4 flex flex-wrap items-center gap-4">
        <div><label className="font-semibold mr-2">Tipe:</label><select value={reportType} onChange={e => {setReportType(e.target.value); handleBackToSummary()}} className="p-2 border rounded"><option value="harian">Harian</option><option value="mingguan">Mingguan</option><option value="bulanan">Bulanan</option></select></div>
        {reportType === 'harian' && <div><label className="font-semibold mr-2">Tanggal:</label><input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="p-2 border rounded" /></div>}
        {reportType === 'mingguan' && <div><label className="font-semibold mr-2">Pilih Tanggal:</label><input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="p-2 border rounded" /></div>}
        {reportType === 'bulanan' && <div><label className="font-semibold mr-2">Bulan:</label><input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="p-2 border rounded" /></div>}
        {view === 'summary' && isGlobalRole && <div><label className="font-semibold mr-2">Kelas:</label><select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className="p-2 border rounded" disabled={isWaliKelas}>{isWaliKelas ? <option value={user.kelas}>{user.kelas}</option> : availableKelas.map(k => <option key={k} value={k}>{k}</option>)}</select></div>}
      </div>
      
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h3 className="text-lg font-bold">{getReportTitle()}</h3>
          <div>
              {view === 'detail' && <button onClick={handleBackToSummary} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 mr-2">&larr; Kembali ke Rekap</button>}
              <button onClick={() => handleExport('excel')} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2">Export Excel</button>
              <button onClick={() => handleExport('pdf')} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">Export PDF</button>
          </div>
      </div>
      
      <div className="overflow-x-auto">
        {view === 'summary' && isGlobalRole && classSummaryData && <DataTable columns={classSummaryColumns} data={classSummaryData} />}
        {view === 'summary' && isWaliKelas && reportType === 'harian' && <DataTable columns={studentDailyColumns} data={baseFilteredData} />}
        {view === 'summary' && isWaliKelas && reportType !== 'harian' && studentSummaryData && <DataTable columns={studentSummaryColumns} data={studentSummaryData} />}
        {view === 'detail' && (
            <>
                <DataTable columns={matrixColumns} data={matrixViewData.data.map((d,i) => ({...d, No: i+1}))} />
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm">
                    <h4 className="font-bold mb-2">Legenda:</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        <span><span className="font-bold">H</span>: Hadir</span>
                        <span><span className="font-bold">S</span>: Sakit</span>
                        <span><span className="font-bold">I</span>: Izin</span>
                        <span><span className="font-bold">A</span>: Alfa</span>
                        <span><span className="font-bold">T</span>: Terlambat</span>
                    </div>
                </div>
            </>
        )}
      </div>
    </Card>
  );
};

export default Laporan;
