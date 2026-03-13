
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { FileDB } from '../utils/fileUtils';
import { User, RegistrationData, LoginData } from '../models';
import { createSessionCookie, clearSessionCookie } from '../middleware/auth';

const router = Router();
const userDB = new FileDB<User>('users.json');

interface AuthRequest extends Request {
  userId?: string;
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, login, phone, password } = req.body as RegistrationData;
    
    if (!name || !email || !login || !phone || !password) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }
    
    const users = await userDB.read();
    
    if (users.some(u => u.email === email || u.login === login)) {
      return res.status(400).json({ error: 'Пользователь с таким email или логином уже существует' });
    }
    
    const newUser: User = {
      id: uuidv4(),
      name,
      email,
      login,
      phone,
      password, 
      createdAt: new Date().toISOString(),
      cart: [],
    };
    
    await userDB.create(newUser);
    
    createSessionCookie(res, newUser.id);
    
    res.status(201).json({ 
      message: 'Регистрация успешна',
      user: { id: newUser.id, name: newUser.name, email: newUser.email }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body as LoginData;
    
    if (!login || !password) {
      return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }
    
    const users = await userDB.read();
    const user = users.find(u => (u.login === login || u.email === login) && u.password === password);
    
    if (!user) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    
    createSessionCookie(res, user.id);
    
    res.json({ 
      message: 'Вход выполнен',
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  try {
    clearSessionCookie(res);
    res.json({ message: 'Выход выполнен' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Ошибка при выходе' });
  }
});

router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }
    
    const user = await userDB.findById(req.userId);
    if (!user) {
      clearSessionCookie(res);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export const userController = router;