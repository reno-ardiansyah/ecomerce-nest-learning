import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { RegisterUserDto } from './dto/register-user.dto';
import { UserService } from 'src/user/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('login')
  signIn(@Body() signInDto: Record<string, string>) {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  @Get('me')
  Me(@Req() req: any) {
    const userId = req.user['sub'];
    return this.authService.me(userId);
  }

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('register')
  register(@Body() registerUserDto: RegisterUserDto) {
    const data = {
      ...registerUserDto,
      role: 'customer',
    } as any;
    return this.userService.create(data)
  }
}
