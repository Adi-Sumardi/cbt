import { Injectable, BadRequestException } from '@nestjs/common';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'questions');
const MAX_WIDTH = 1200;
const QUALITY = 80;

@Injectable()
export class UploadService {
  constructor(private readonly config: ConfigService) {
    // Pastikan folder uploads ada
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  }

  async compressAndSaveImage(file: Express.Multer.File): Promise<string> {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Format gambar tidak didukung. Gunakan JPG, PNG, atau WebP.');
    }

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
    const outputPath = path.join(UPLOAD_DIR, filename);

    await sharp(file.buffer)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(outputPath);

    return `/uploads/questions/${filename}`;
  }

  deleteImage(imageUrl: string) {
    try {
      const filename = path.basename(imageUrl);
      const filePath = path.join(UPLOAD_DIR, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // Gagal hapus file tidak fatal
    }
  }
}
