
export enum Role {
  GURU = 'Guru',
  GURU_BK = 'Guru BK',
  WALI_KELAS = 'Wali Kelas',
  ADMIN = 'Admin',
  KEPALA_SEKOLAH = 'Kepala Sekolah',
  SISWA = 'Siswa',
  KETUA_KELAS_SISWA = 'Ketua Kelas', // Special role for student who is class president
}

export enum StatusKehadiran {
  HADIR = 'Hadir',
  IZIN = 'Izin',
  SAKIT = 'Sakit',
  ALFA = 'Alfa',
  TERLAMBAT = 'Terlambat',
}

export enum StatusValidasi {
  BELUM_VALID = 'Belum Valid',
  VALID = 'Valid',
}

export enum JenisKelamin {
  L = 'L',
  P = 'P',
}

export enum Semester {
  GANJIL = 'Ganjil',
  GENAP = 'Genap',
}

export interface TahunAjaran {
  id: number;
  tahun_ajaran: string; // e.g., "2023/2024"
  semester_ganjil_start: string; // YYYY-MM-DD
  semester_ganjil_end: string;   // YYYY-MM-DD
  semester_genap_start: string;  // YYYY-MM-DD
  semester_genap_end: string;    // YYYY-MM-DD
}

export interface Siswa {
  id_siswa: number;
  nis: string;
  nama: string;
  kelas: string;
  jenis_kelamin: JenisKelamin;
  tanggal_lahir: string; // YYYY-MM-DD
  password: string; // Encrypted password for student login
  isKetuaKelas: boolean;
}

export interface Absensi {
  id_absensi: number;
  id_siswa: number;
  tanggal: string; // YYYY-MM-DD
  status: StatusKehadiran;
  keterangan: string;
  status_validasi: StatusValidasi;
  tahun_ajaran: string; // e.g., "2023/2024"
  semester: Semester;
}

export interface User {
  id_user: number;
  username: string;
  nama?: string; // Full name
  password?: string; // Encrypted password
  role: Role;
  kelas?: string; // For Wali Kelas
  // This id can be from a student or a staff user
  // Useful for linking back to original data source
  original_id?: number; 
}

export interface CatatanKasus {
  id_kasus: number;
  id_siswa: number;
  tanggal_kasus: string; // YYYY-MM-DD
  kasus: string;
  tindak_lanjut: string;
  dilaporkan_oleh: number; // user id of the reporter (Guru BK)
}

export interface AppSettings {
  nama_sekolah: string;
  kabupaten: string;
  alamat_sekolah: string;
  logo_sekolah: string;
  [key: string]: string; // Allows for additional, untyped settings
}