import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { ExamGateway } from '../websocket/exam.gateway';
import { IsString, IsInt, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreateExamDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsInt() @Min(1) duration: number;
  @IsBoolean() @IsOptional() shuffleQuestions?: boolean;
  @IsBoolean() @IsOptional() shuffleOptions?: boolean;
  @IsBoolean() @IsOptional() showResult?: boolean;
  @IsInt() @IsOptional() passingScore?: number;
  @IsString() @IsOptional() sebConfigKey?: string;
}

@ApiTags('Exams')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('exams')
export class ExamsController {
  constructor(
    private readonly exams: ExamsService,
    private readonly gateway: ExamGateway,
  ) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateExamDto) {
    return this.exams.create(req.user.id, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.exams.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.exams.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.exams.update(id, req.user.id, dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Request() req: any, @Body('status') status: any) {
    return this.exams.setStatus(id, req.user.id, status);
  }

  @Get(':id/monitor')
  getLiveMonitor(@Param('id') id: string) {
    return this.exams.getLiveMonitor(id);
  }
}
