import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, nis: true, role: true, createdAt: true },
    });
  }

  async create(data: { name: string; email: string; password: string; role: Role; nis?: string; jenjang?: string; kelas?: string; rombel?: string }) {
    const existing = await this.findByEmail(data.email);
    if (existing) throw new ConflictException('Email sudah terdaftar');
    const user = await this.prisma.user.create({ data });
    const { password: _, ...result } = user;
    return result;
  }

  async findAll(role?: Role, jenjang?: string, kelas?: string, rombel?: string) {
    const where: any = {};
    if (role) where.role = role;
    if (jenjang) where.jenjang = jenjang;
    if (kelas) where.kelas = kelas;
    if (rombel) where.rombel = rombel;
    return this.prisma.user.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      select: { id: true, name: true, email: true, nis: true, jenjang: true, kelas: true, rombel: true, role: true, createdAt: true },
      orderBy: [{ jenjang: 'asc' }, { kelas: 'asc' }, { rombel: 'asc' }, { name: 'asc' }],
    });
  }

  async update(id: string, data: { name?: string; email?: string; password?: string; role?: Role; nis?: string; jenjang?: string; kelas?: string; rombel?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan');

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.role) updateData.role = data.role;
    if (data.nis !== undefined) updateData.nis = data.nis;
    if (data.jenjang !== undefined) updateData.jenjang = data.jenjang;
    if (data.kelas !== undefined) updateData.kelas = data.kelas;
    if (data.rombel !== undefined) updateData.rombel = data.rombel;
    if (data.password) updateData.password = await bcrypt.hash(data.password, 10);

    const updated = await this.prisma.user.update({ where: { id }, data: updateData });
    const { password: _, ...result } = updated;
    return result;
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan');
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Pengguna berhasil dihapus' };
  }

  async importUsers(role: 'TEACHER' | 'STUDENT', buffer: Buffer) {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException('File Excel tidak valid');
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) throw new BadRequestException('File tidak memiliki data');

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const row of rows) {
      const name  = (row['Nama']     || row['nama']     || '').toString().trim();
      const email = (row['Email']    || row['email']    || '').toString().trim().toLowerCase();
      const pass  = (row['Password'] || row['password'] || 'password123').toString().trim();

      if (!name || !email) continue;

      try {
        const data: any = { name, email, password: await bcrypt.hash(pass, 10), role };
        if (role === 'STUDENT') {
          const nis     = (row['NIS']     || row['nis']     || '').toString().trim();
          const jenjang = (row['Jenjang'] || row['jenjang'] || '').toString().trim();
          const kelas   = (row['Kelas']   || row['kelas']   || '').toString().trim();
          const rombel  = (row['Rombel']  || row['rombel']  || '').toString().trim();
          if (nis)     data.nis     = nis;
          if (jenjang) data.jenjang = jenjang;
          if (kelas)   data.kelas   = kelas;
          if (rombel)  data.rombel  = rombel;
        }
        await this.prisma.user.create({ data });
        results.success++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`${email}: ${e.message}`);
      }
    }

    return results;
  }

  generateUserTemplate(role: 'TEACHER' | 'STUDENT'): Buffer {
    let data: any[];
    let sheetName: string;

    if (role === 'TEACHER') {
      data = [
        { 'Nama': 'Budi Santoso, S.Pd.', 'Email': 'budi@sekolah.local', 'Password': 'guru123' },
        { 'Nama': 'Siti Aminah, M.Pd.',  'Email': 'siti@sekolah.local', 'Password': 'guru123' },
      ];
      sheetName = 'Template Guru';
    } else {
      data = [
        { 'Nama': 'Andi Pratama',  'Email': 'andi@sekolah.local',   'NIS': '2024001', 'Jenjang': 'SMA', 'Kelas': 'X',  'Rombel': 'A',     'Password': 'siswa123' },
        { 'Nama': 'Budi Setiawan', 'Email': 'budi.s@sekolah.local', 'NIS': '2024002', 'Jenjang': 'SMA', 'Kelas': 'XI', 'Rombel': 'IPA 1', 'Password': 'siswa123' },
        { 'Nama': 'Citra Dewi',    'Email': 'citra@sekolah.local',  'NIS': '2024003', 'Jenjang': 'SMP', 'Kelas': '8',  'Rombel': 'B',     'Password': 'siswa123' },
      ];
      sheetName = 'Template Siswa';
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    ws['!cols'] = role === 'TEACHER'
      ? [{ wch: 30 }, { wch: 30 }, { wch: 15 }]
      : [{ wch: 25 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 15 }];

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
