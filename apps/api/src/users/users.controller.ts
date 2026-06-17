import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request, UploadedFile, UseInterceptors, BadRequestException, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@Request() req: any) {
    return this.users.findById(req.user.id);
  }

  @Get('template')
  downloadTemplate(@Query('role') role: string, @Res() res: Response) {
    if (!['TEACHER', 'STUDENT'].includes(role)) throw new BadRequestException('Role tidak valid');
    const buffer = this.users.generateUserTemplate(role as 'TEACHER' | 'STUDENT');
    const filename = role === 'TEACHER' ? 'template_guru.xlsx' : 'template_siswa.xlsx';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importUsers(@UploadedFile() file: Express.Multer.File, @Query('role') role: string) {
    if (!file) throw new BadRequestException('File tidak ditemukan');
    if (!['TEACHER', 'STUDENT'].includes(role)) throw new BadRequestException('Role tidak valid');
    return this.users.importUsers(role as 'TEACHER' | 'STUDENT', file.buffer);
  }

  @Get()
  findAll(@Query('role') role?: any, @Query('jenjang') jenjang?: string, @Query('kelas') kelas?: string, @Query('rombel') rombel?: string) {
    return this.users.findAll(role, jenjang, kelas, rombel);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.users.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.users.remove(id);
  }
}
