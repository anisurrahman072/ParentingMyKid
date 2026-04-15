import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MemoryService, AddMemoryDto } from './memory.service';

@ApiTags('memory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('memory')
export class MemoryController {
  constructor(private readonly memory: MemoryService) {}

  @Get(':childId')
  getMemories(
    @Param('childId') childId: string,
    @Query('page') page?: string,
  ) {
    return this.memory.getChildMemories(childId, page ? parseInt(page) : 1);
  }

  @Post()
  addMemory(@Body() dto: AddMemoryDto) {
    return this.memory.addMemory(dto);
  }

  @Get(':childId/upload-signature')
  getUploadSignature(@Param('childId') childId: string) {
    return this.memory.getUploadSignature(childId);
  }

  @Get(':childId/milestones')
  getMilestones(@Param('childId') childId: string) {
    return this.memory.getMilestones(childId);
  }

  @Delete(':memoryId/:childId')
  deleteMemory(@Param('memoryId') memoryId: string, @Param('childId') childId: string) {
    return this.memory.deleteMemory(memoryId, childId);
  }
}
