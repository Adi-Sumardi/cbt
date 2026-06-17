import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Data siswa dengan rombel ──────────────────────────────────────────────────
const STUDENTS = [
  // SMA Kelas X — Rombel A
  { name: 'Andi Pratama',    nis: '2024001', email: 'andi@cbt.local',    jenjang: 'SMA', kelas: 'X',   rombel: 'A' },
  { name: 'Bintang Cahaya',  nis: '2024002', email: 'bintang@cbt.local', jenjang: 'SMA', kelas: 'X',   rombel: 'A' },
  { name: 'Citra Dewi',      nis: '2024003', email: 'citra@cbt.local',   jenjang: 'SMA', kelas: 'X',   rombel: 'A' },
  // SMA Kelas X — Rombel B
  { name: 'Dani Firmansyah', nis: '2024004', email: 'dani@cbt.local',    jenjang: 'SMA', kelas: 'X',   rombel: 'B' },
  { name: 'Eka Putri',       nis: '2024005', email: 'eka@cbt.local',     jenjang: 'SMA', kelas: 'X',   rombel: 'B' },
  // SMA Kelas XI — Rombel IPA 1
  { name: 'Fajar Nugroho',   nis: '2024006', email: 'fajar@cbt.local',   jenjang: 'SMA', kelas: 'XI',  rombel: 'IPA 1' },
  { name: 'Gita Lestari',    nis: '2024007', email: 'gita@cbt.local',    jenjang: 'SMA', kelas: 'XI',  rombel: 'IPA 1' },
  { name: 'Hendra Saputra',  nis: '2024008', email: 'hendra@cbt.local',  jenjang: 'SMA', kelas: 'XI',  rombel: 'IPA 1' },
  // SMA Kelas XI — Rombel IPS 1
  { name: 'Indah Permata',   nis: '2024009', email: 'indah@cbt.local',   jenjang: 'SMA', kelas: 'XI',  rombel: 'IPS 1' },
  { name: 'Joko Santoso',    nis: '2024010', email: 'joko@cbt.local',    jenjang: 'SMA', kelas: 'XI',  rombel: 'IPS 1' },
  // SMA Kelas XII — Rombel IPA 1
  { name: 'Kiki Rahayu',     nis: '2024011', email: 'kiki@cbt.local',    jenjang: 'SMA', kelas: 'XII', rombel: 'IPA 1' },
  { name: 'Lina Marlina',    nis: '2024012', email: 'lina@cbt.local',    jenjang: 'SMA', kelas: 'XII', rombel: 'IPA 1' },
  // SMA Kelas XII — Rombel IPS 1
  { name: 'Maulana Rizki',   nis: '2024013', email: 'maulana@cbt.local', jenjang: 'SMA', kelas: 'XII', rombel: 'IPS 1' },
  { name: 'Nina Kartika',    nis: '2024014', email: 'nina@cbt.local',    jenjang: 'SMA', kelas: 'XII', rombel: 'IPS 1' },
  { name: 'Oscar Pranata',   nis: '2024015', email: 'oscar@cbt.local',   jenjang: 'SMA', kelas: 'XII', rombel: 'IPS 1' },
  // SMP Kelas 9 — Rombel A & B
  { name: 'Putri Ayu',       nis: '2024016', email: 'putri@cbt.local',   jenjang: 'SMP', kelas: '9',   rombel: 'A' },
  { name: 'Qori Hidayat',    nis: '2024017', email: 'qori@cbt.local',    jenjang: 'SMP', kelas: '9',   rombel: 'A' },
  // SMP Kelas 8
  { name: 'Rina Sari',       nis: '2024018', email: 'rina@cbt.local',    jenjang: 'SMP', kelas: '8',   rombel: 'B' },
  { name: 'Satria Wibowo',   nis: '2024019', email: 'satria@cbt.local',  jenjang: 'SMP', kelas: '8',   rombel: 'B' },
  // SMP Kelas 7
  { name: 'Tika Anggraini',  nis: '2024020', email: 'tika@cbt.local',    jenjang: 'SMP', kelas: '7',   rombel: 'A' },
];

// ── Soal Matematika (SMA X) ───────────────────────────────────────────────────
const Q_MATH = [
  { content: 'Berapakah nilai x jika 2x + 4 = 10?', answer: 'B', options: ['2', '3', '4', '5'] },
  { content: 'Hasil dari 3² + 4² adalah...', answer: 'C', options: ['7', '14', '25', '49'] },
  { content: 'Manakah yang merupakan bilangan prima?', answer: 'B', options: ['1', '7', '9', '15'] },
  { content: 'Jika keliling persegi adalah 36 cm, berapa panjang sisinya?', answer: 'A', options: ['9 cm', '12 cm', '6 cm', '18 cm'] },
  { content: 'FPB dari 12 dan 18 adalah...', answer: 'C', options: ['2', '4', '6', '9'] },
  { content: 'KPK dari 4 dan 6 adalah...', answer: 'B', options: ['6', '12', '18', '24'] },
  { content: 'Bentuk sederhana dari pecahan 18/24 adalah...', answer: 'A', options: ['3/4', '2/3', '9/12', '6/8'] },
  { content: 'Hasil dari 0,25 × 0,4 adalah...', answer: 'D', options: ['0,01', '0,05', '0,08', '0,1'] },
  { content: 'Luas segitiga dengan alas 10 cm dan tinggi 8 cm adalah...', answer: 'B', options: ['80 cm²', '40 cm²', '20 cm²', '16 cm²'] },
  { content: 'Jika 5y - 3 = 22, maka nilai y adalah...', answer: 'C', options: ['3', '4', '5', '6'] },
  { content: 'Perbandingan 45 menit : 1 jam dalam bentuk paling sederhana adalah...', answer: 'A', options: ['3 : 4', '45 : 60', '9 : 12', '15 : 20'] },
  { content: 'Volume kubus dengan rusuk 5 cm adalah...', answer: 'B', options: ['25 cm³', '125 cm³', '150 cm³', '75 cm³'] },
  { content: 'Jika rata-rata dari 5, 7, x, 9, 8 adalah 7, maka nilai x adalah...', answer: 'A', options: ['6', '7', '8', '4'] },
  { content: 'Sudut yang besarnya 90° disebut sudut...', answer: 'B', options: ['Lancip', 'Siku-siku', 'Tumpul', 'Lurus'] },
  { content: 'Hasil dari (-3) × (-5) adalah...', answer: 'C', options: ['-15', '-8', '15', '8'] },
  { content: 'Sebuah mobil melaju 80 km/jam selama 2,5 jam. Jarak tempuhnya adalah...', answer: 'D', options: ['160 km', '180 km', '190 km', '200 km'] },
  { content: 'Hasil dari √144 adalah...', answer: 'B', options: ['10', '12', '14', '16'] },
  { content: 'Jika harga buku Rp12.000 dan mendapat diskon 25%, maka harga setelah diskon adalah...', answer: 'C', options: ['Rp9.500', 'Rp8.500', 'Rp9.000', 'Rp10.000'] },
  { content: 'Luas lingkaran dengan jari-jari 7 cm adalah... (π = 22/7)', answer: 'A', options: ['154 cm²', '44 cm²', '49 cm²', '77 cm²'] },
  { content: 'Jika p = 3 dan q = -2, maka nilai dari 2p - 3q adalah...', answer: 'A', options: ['12', '0', '6', '-6'] },
];

// ── Soal Bahasa Indonesia (SMA XI) ───────────────────────────────────────────
const Q_BINDO = [
  { content: 'Kalimat yang mengandung gagasan utama dalam sebuah paragraf disebut...', answer: 'A', options: ['Kalimat utama', 'Kalimat penjelas', 'Kalimat penutup', 'Kalimat transisi'] },
  { content: 'Penulisan kata baku yang benar adalah...', answer: 'B', options: ['Apotik', 'Apotek', 'Apotec', 'Apotic'] },
  { content: 'Makna denotasi adalah makna...', answer: 'C', options: ['Kiasan', 'Tersirat', 'Sebenarnya', 'Konotasi'] },
  { content: 'Teks yang berisi fakta dan opini untuk meyakinkan pembaca disebut...', answer: 'A', options: ['Teks persuasi', 'Teks narasi', 'Teks deskripsi', 'Teks eksplanasi'] },
  { content: 'Kalimat efektif adalah kalimat yang...', answer: 'D', options: ['Panjang dan rinci', 'Menggunakan banyak kata sifat', 'Memiliki banyak klausa', 'Jelas dan tidak ambigu'] },
  { content: 'Sinonim kata "antusias" adalah...', answer: 'B', options: ['Malas', 'Bersemangat', 'Lesu', 'Biasa'] },
  { content: 'Tanda koma digunakan untuk memisahkan...', answer: 'A', options: ['Anak kalimat dari induk kalimat', 'Dua kata benda', 'Subjek dan predikat', 'Kata dan frasa'] },
  { content: 'Paragraf induktif adalah paragraf yang...', answer: 'C', options: ['Dimulai dengan kalimat utama di awal', 'Tidak memiliki kalimat utama', 'Diakhiri dengan kalimat utama', 'Memiliki dua kalimat utama'] },
  { content: 'Kata "modernisasi" berasal dari kata dasar...', answer: 'A', options: ['Modern', 'Modernis', 'Moderni', 'Moder'] },
  { content: 'Ragam bahasa yang digunakan dalam situasi formal disebut ragam bahasa...', answer: 'B', options: ['Daerah', 'Baku', 'Informal', 'Gaul'] },
];

// ── Soal IPA (SMP 8) ─────────────────────────────────────────────────────────
const Q_IPA = [
  { content: 'Satuan gaya dalam sistem SI adalah...', answer: 'B', options: ['Joule', 'Newton', 'Watt', 'Pascal'] },
  { content: 'Proses fotosintesis terjadi di dalam...', answer: 'A', options: ['Kloroplas', 'Mitokondria', 'Inti sel', 'Ribosom'] },
  { content: 'Perubahan es menjadi air disebut...', answer: 'C', options: ['Membeku', 'Menguap', 'Mencair', 'Menyublim'] },
  { content: 'Tulang yang berfungsi melindungi jantung dan paru-paru adalah...', answer: 'B', options: ['Tulang punggung', 'Tulang rusuk', 'Tulang bahu', 'Tulang selangka'] },
  { content: 'Hewan yang berkembang biak dengan cara bertelur dan menyusui disebut...', answer: 'D', options: ['Reptilia', 'Amfibi', 'Aves', 'Monotremata'] },
  { content: 'Benda yang dapat menghantarkan listrik dengan baik disebut...', answer: 'A', options: ['Konduktor', 'Isolator', 'Semikonduktor', 'Kapasitor'] },
  { content: 'Planet terbesar dalam tata surya adalah...', answer: 'C', options: ['Saturnus', 'Uranus', 'Yupiter', 'Neptunus'] },
  { content: 'Proses pemisahan campuran berdasarkan perbedaan titik didih disebut...', answer: 'B', options: ['Filtrasi', 'Destilasi', 'Kristalisasi', 'Evaporasi'] },
  { content: 'Getaran yang merambat melalui medium disebut...', answer: 'A', options: ['Gelombang', 'Frekuensi', 'Amplitudo', 'Periode'] },
  { content: 'Organ yang berfungsi menyaring darah dan menghasilkan urine adalah...', answer: 'C', options: ['Hati', 'Paru-paru', 'Ginjal', 'Lambung'] },
];

type QuestionData = { content: string; answer: string; options: string[] };

async function createExam(
  title: string,
  description: string,
  teacherId: string,
  questions: QuestionData[],
  opts: {
    status: 'DRAFT' | 'ACTIVE' | 'FINISHED';
    targetJenjang?: string;
    targetKelas?: string;
    targetRombel?: string;
    duration?: number;
    passingScore?: number;
  },
) {
  const exam = await prisma.exam.create({
    data: {
      title,
      description,
      duration: opts.duration ?? 60,
      status: opts.status,
      teacherId,
      passingScore: opts.passingScore ?? 70,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResult: true,
      accessCode: generateAccessCode(),
      targetJenjang: opts.targetJenjang ?? null,
      targetKelas: opts.targetKelas ?? null,
      targetRombel: opts.targetRombel ?? null,
    },
  });

  const labels = ['A', 'B', 'C', 'D'];
  const createdQuestions: { id: string; correctOptionId: string }[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const created = await prisma.question.create({
      data: {
        examId: exam.id,
        content: q.content,
        type: 'MULTIPLE_CHOICE',
        points: 4,
        order: i + 1,
        options: {
          create: q.options.map((opt, idx) => ({
            label: labels[idx],
            content: opt,
            isCorrect: labels[idx] === q.answer,
            order: idx + 1,
          })),
        },
      },
      include: { options: true },
    });
    const correctOpt = created.options.find((o) => o.isCorrect)!;
    createdQuestions.push({ id: created.id, correctOptionId: correctOpt.id });
  }

  return { exam, questions: createdQuestions };
}

async function createSessions(
  exam: { id: string },
  questions: { id: string; correctOptionId: string }[],
  students: { id: string }[],
  correctnessBias: number, // 0.0–1.0: probability tiap jawaban benar
) {
  const now = new Date();

  for (const student of students) {
    const startedAt = new Date(now.getTime() - randInt(40, 70) * 60000);
    const submittedAt = new Date(startedAt.getTime() + randInt(25, 55) * 60000);

    let correctCount = 0;

    const session = await prisma.examSession.create({
      data: {
        examId: exam.id,
        studentId: student.id,
        status: 'SUBMITTED',
        startedAt,
        submittedAt,
        score: 0, // sementara, update setelah hitung
      },
    });

    for (const q of questions) {
      const isCorrect = Math.random() < correctnessBias;
      const answerId = isCorrect
        ? q.correctOptionId
        : (() => {
            // pilih opsi salah
            const wrongIds = questions
              .find((qq) => qq.id === q.id)!
              .correctOptionId;
            return wrongIds; // fallback ke benar (simplified)
          })();

      if (isCorrect) correctCount++;

      await prisma.studentAnswer.create({
        data: {
          sessionId: session.id,
          questionId: q.id,
          answer: isCorrect ? q.correctOptionId : 'wrong',
          savedAt: new Date(startedAt.getTime() + randInt(1, 50) * 60000),
        },
      });
    }

    const score = Math.round((correctCount / questions.length) * 100);

    await prisma.examSession.update({
      where: { id: session.id },
      data: { score },
    });
  }
}

async function main() {
  console.log('Memulai seeding database...');

  const [adminPass, teacherPass, studentPass] = await Promise.all([
    bcrypt.hash('admin123', 10),
    bcrypt.hash('guru123', 10),
    bcrypt.hash('siswa123', 10),
  ]);

  // Hapus akun demo lama yang tidak konsisten
  await prisma.user.deleteMany({ where: { email: { in: ['siswa@cbt.local', 'guru2@cbt.local'] } } });

  // ── Admin ──────────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@cbt.local' },
    update: {},
    create: { name: 'Administrator', email: 'admin@cbt.local', password: adminPass, role: 'ADMIN' },
  });

  // ── Guru ───────────────────────────────────────────────────────────────────
  const teacher = await prisma.user.upsert({
    where: { email: 'guru@cbt.local' },
    update: { name: 'Budi Santoso, S.Pd.' },
    create: { name: 'Budi Santoso, S.Pd.', email: 'guru@cbt.local', password: teacherPass, role: 'TEACHER' },
  });

  const teacher2 = await prisma.user.upsert({
    where: { email: 'sari@cbt.local' },
    update: { name: 'Sari Wulandari, S.Pd.' },
    create: { name: 'Sari Wulandari, S.Pd.', email: 'sari@cbt.local', password: teacherPass, role: 'TEACHER' },
  });

  // ── 20 Siswa dengan rombel ─────────────────────────────────────────────────
  console.log('Membuat 20 akun siswa dengan data rombel...');
  const studentUsers: Record<string, string> = {}; // email → id

  for (const s of STUDENTS) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { nis: s.nis, jenjang: s.jenjang, kelas: s.kelas, rombel: s.rombel, password: studentPass },
      create: {
        name: s.name,
        email: s.email,
        password: studentPass,
        role: 'STUDENT',
        nis: s.nis,
        jenjang: s.jenjang,
        kelas: s.kelas,
        rombel: s.rombel,
      },
    });
    studentUsers[s.email] = user.id;
  }

  // ── Hapus ujian lama ───────────────────────────────────────────────────────
  const oldExams = await prisma.exam.findMany({ where: { teacherId: { in: [teacher.id, teacher2.id] } } });
  for (const e of oldExams) {
    await prisma.studentAnswer.deleteMany({ where: { session: { examId: e.id } } });
    await prisma.examSession.deleteMany({ where: { examId: e.id } });
    await prisma.questionOption.deleteMany({ where: { question: { examId: e.id } } });
    await prisma.question.deleteMany({ where: { examId: e.id } });
    await prisma.exam.delete({ where: { id: e.id } });
  }

  // ── Ujian 1: Matematika SMA X (FINISHED) ──────────────────────────────────
  console.log('Membuat ujian Matematika SMA X (FINISHED)...');
  const { exam: exam1, questions: q1 } = await createExam(
    'UTS Matematika — Kelas X',
    'Ujian Tengah Semester materi bilangan, aljabar, geometri, dan statistika dasar.',
    teacher.id,
    Q_MATH,
    { status: 'FINISHED', targetJenjang: 'SMA', targetKelas: 'X', targetRombel: 'A,B', passingScore: 70 },
  );

  const smaXStudents = STUDENTS
    .filter((s) => s.jenjang === 'SMA' && s.kelas === 'X')
    .map((s) => ({ id: studentUsers[s.email] }));

  await createSessions(exam1, q1, smaXStudents.slice(0, 3), 0.82); // Rombel A — nilai bagus
  await createSessions(exam1, q1, smaXStudents.slice(3), 0.65);   // Rombel B — nilai sedang

  // ── Ujian 2: Bahasa Indonesia SMA XI (FINISHED) ───────────────────────────
  console.log('Membuat ujian Bahasa Indonesia SMA XI (FINISHED)...');
  const { exam: exam2, questions: q2 } = await createExam(
    'UAS Bahasa Indonesia — Kelas XI',
    'Ujian Akhir Semester mencakup teks persuasi, kalimat efektif, dan ejaan.',
    teacher2.id,
    Q_BINDO,
    { status: 'FINISHED', targetJenjang: 'SMA', targetKelas: 'XI', targetRombel: 'IPA 1,IPS 1', duration: 90, passingScore: 65 },
  );

  const smaXIStudents = STUDENTS
    .filter((s) => s.jenjang === 'SMA' && s.kelas === 'XI')
    .map((s) => ({ id: studentUsers[s.email] }));

  await createSessions(exam2, q2, smaXIStudents.slice(0, 3), 0.78); // IPA 1
  await createSessions(exam2, q2, smaXIStudents.slice(3), 0.60);    // IPS 1

  // ── Ujian 3: IPA SMP 8 (ACTIVE) ───────────────────────────────────────────
  console.log('Membuat ujian IPA SMP 8 (ACTIVE)...');
  const { exam: exam3 } = await createExam(
    'Ulangan Harian IPA — Kelas 8',
    'Materi: gerak dan gaya, fotosintesis, sistem pencernaan.',
    teacher2.id,
    Q_IPA,
    { status: 'ACTIVE', targetJenjang: 'SMP', targetKelas: '8', targetRombel: 'B', duration: 45, passingScore: 60 },
  );

  // ── Ujian 4: Matematika SMA XII (DRAFT) ───────────────────────────────────
  console.log('Membuat ujian Matematika SMA XII (DRAFT)...');
  await createExam(
    'Latihan Soal UTBK — Matematika Dasar',
    'Persiapan UTBK: limit, turunan, integral, dan statistika.',
    teacher.id,
    Q_MATH.slice(0, 10),
    { status: 'DRAFT', targetJenjang: 'SMA', targetKelas: 'XII', duration: 90, passingScore: 60 },
  );

  const kode1 = exam1.accessCode;
  const kode3 = exam3.accessCode;

  console.log('\n========================================');
  console.log('SEED SELESAI');
  console.log('----------------------------------------');
  console.log('Admin   : admin@cbt.local     / admin123');
  console.log('Guru 1  : guru@cbt.local      / guru123  (Budi Santoso)');
  console.log('Guru 2  : sari@cbt.local      / guru123  (Sari Wulandari)');
  console.log('----------------------------------------');
  console.log('Siswa SMA X  Rombel A : andi, bintang, citra @cbt.local');
  console.log('Siswa SMA X  Rombel B : dani, eka @cbt.local');
  console.log('Siswa SMA XI IPA 1    : fajar, gita, hendra @cbt.local');
  console.log('Siswa SMA XI IPS 1    : indah, joko @cbt.local');
  console.log('Semua siswa password  : siswa123');
  console.log('----------------------------------------');
  console.log('Ujian 1: UTS Matematika X        → FINISHED (kode: ' + kode1 + ')');
  console.log('Ujian 2: UAS Bahasa Indonesia XI → FINISHED');
  console.log('Ujian 3: Ulangan IPA SMP 8       → ACTIVE   (kode: ' + kode3 + ')');
  console.log('Ujian 4: Latihan UTBK XII        → DRAFT');
  console.log('========================================');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
