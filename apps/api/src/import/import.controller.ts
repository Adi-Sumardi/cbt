import {
  Controller, Post, Get, UploadedFile, UseInterceptors, Res, UseGuards, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ImportService } from './import.service';

@ApiTags('Import')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('parse')
  @UseInterceptors(FileInterceptor('file'))
  parseExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File tidak ditemukan');
    return this.importService.parseExcel(file.buffer);
  }

  @Get('template')
  downloadTemplate(@Res() res: Response) {
    const buffer = this.importService.generateTemplate();
    res.setHeader('Content-Disposition', 'attachment; filename="template_soal.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  }
}
