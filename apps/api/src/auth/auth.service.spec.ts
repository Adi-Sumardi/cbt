import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@test.com',
  password: '$2a$10$hashedpassword',
  role: 'STUDENT',
};

const mockUsersService = {
  findByEmail: jest.fn(),
  create: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return accessToken and user on successful login', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.login('test@test.com', 'password123');

      expect(result.accessToken).toBe('mock-token');
      expect(result.user.email).toBe('test@test.com');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException if email not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login('notfound@test.com', 'password')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login('test@test.com', 'wrongpassword')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create a new user and return user data', async () => {
      const newUser = { id: 'user-2', name: 'New User', email: 'new@test.com', role: 'STUDENT' };
      mockUsersService.create.mockResolvedValue(newUser);

      const result = await service.register('New User', 'new@test.com', 'password123', 'STUDENT');

      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New User', email: 'new@test.com', role: 'STUDENT' }),
      );
      expect(result).toEqual(newUser);
    });

    it('should throw ConflictException if email already registered', async () => {
      const { ConflictException } = require('@nestjs/common');
      mockUsersService.create.mockRejectedValue(new ConflictException('Email sudah terdaftar'));

      await expect(service.register('Test', 'test@test.com', 'password', 'STUDENT')).rejects.toThrow(ConflictException);
    });
  });
});
