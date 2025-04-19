import { Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { buildPrismaParams } from 'src/common/utils/prisma-params.util';
import { hash } from 'bcrypt';
import { users } from '@prisma/client';
import { PaginatedResponse } from 'src/common/types/PaginatedResponse';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const {password, ...rest} = createUserDto;
    const passwordHashed = await hash(password, 10);
    
    return await this.prisma.users.create({
      data: {
        ...rest,
        password_hash: passwordHashed,
        profiles: {
          create: {
            bio: '',
            avatar_url: '',
            birthdate: null,
            gender: ''
          }
        }
      },
    });
  }

  async findAll(q: QueryParamsDto): Promise<PaginatedResponse<users>> {
    const params = buildPrismaParams<users>(q, {
      searchFields: ['email', 'name', 'phone'],
      showFields: [
        'id',
        'name',
        'email',
        'phone',
        'role',
        'created_at',
        'updated_at',
      ],
    });
    const data = await this.prisma.users.findMany(params);

    const total = await this.prisma.users.count({ where: params.where });
    return { data, total };
  }
  
  findOne(identifier: number | string) {
    return this.prisma.users.findUnique({
      where: {
        [typeof identifier === 'number' ? 'id' : 'email']: identifier,
      } as any,
      include: {profiles: true}
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const { password, ...rest } = updateUserDto;
    const data: any = { ...rest };
  
    if (password) {
      data.password_hash = await hash(password, 10);
    }
  
    return this.prisma.users.update({
      where: { id },
      data,
    });
  }
  

  remove(id: number) {
    return this.prisma.users.delete({
      where: { id },
    });
  }
}
