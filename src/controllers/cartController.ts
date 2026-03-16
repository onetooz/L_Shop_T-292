import { Router, Request, Response } from 'express';
import { FileDB } from '../utils/fileUtils';
import { User, Product, CartItem, CartItemWithDetails, CartResponse } from '../models';
import { requireAuth } from '../middleware/auth';

const router = Router();
const userDB = new FileDB<User>('users.json');
const productDB = new FileDB<Product>('products.json');

interface AuthRequest extends Request {
  userId?: string;
}

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = await userDB.findById(req.userId!);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const products = await productDB.read();
    const cartWithDetails: CartItemWithDetails[] = user.cart.map((item: CartItem) => {
      const product = products.find((p: Product) => p.id === item.productId);
      return {
        ...item,
        product: product || null,
        dataTitle: product?.name,
        dataPrice: product?.price,
        dataBasket: true
      };
    });

    const total = cartWithDetails.reduce((sum: number, item: CartItemWithDetails) => {
      return sum + ((item.product?.price || 0) * item.quantity);
    }, 0);

    const response: CartResponse = {
      items: cartWithDetails,
      total
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении корзины' });
  }
});

router.post('/add', async (req: AuthRequest, res: Response) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    if (!productId) {
      return res.status(400).json({ error: 'Не указан товар' });
    }

    const product = await productDB.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    const users = await userDB.read();
    const userIndex = users.findIndex((u: User) => u.id === req.userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = users[userIndex];
    const existingItem = user.cart.find((item: CartItem) => item.productId === productId);

    if (existingItem) {
      existingItem.quantity += Number(quantity);
    } else {
      user.cart.push({
        productId,
        quantity: Number(quantity),
        addedAt: new Date().toISOString()
      });
    }

    users[userIndex] = user;
    await userDB.write(users);

    res.json({ 
      message: 'Товар добавлен в корзину',
      cart: user.cart 
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при добавлении в корзину' });
  }
});

router.put('/update', async (req: AuthRequest, res: Response) => {
  try {
    const { productId, quantity } = req.body;
    
    if (!productId || quantity === undefined) {
      return res.status(400).json({ error: 'Не указан товар или количество' });
    }

    if (Number(quantity) < 0) {
      return res.status(400).json({ error: 'Количество не может быть отрицательным' });
    }

    const users = await userDB.read();
    const userIndex = users.findIndex((u: User) => u.id === req.userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = users[userIndex];
    const itemIndex = user.cart.findIndex((item: CartItem) => item.productId === productId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Товар не найден в корзине' });
    }

    if (Number(quantity) === 0) {
      user.cart.splice(itemIndex, 1);
    } else {
      user.cart[itemIndex].quantity = Number(quantity);
    }

    users[userIndex] = user;
    await userDB.write(users);

    res.json({ 
      message: 'Корзина обновлена',
      cart: user.cart 
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при обновлении корзины' });
  }
});

router.delete('/remove/:productId', async (req: AuthRequest, res: Response) => {
  try {
    const users = await userDB.read();
    const userIndex = users.findIndex((u: User) => u.id === req.userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = users[userIndex];
    user.cart = user.cart.filter((item: CartItem) => item.productId !== req.params.productId);

    users[userIndex] = user;
    await userDB.write(users);

    res.json({ 
      message: 'Товар удалён из корзины',
      cart: user.cart 
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при удалении из корзины' });
  }
});

router.post('/clear', async (req: AuthRequest, res: Response) => {
  try {
    const users = await userDB.read();
    const userIndex = users.findIndex((u: User) => u.id === req.userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    users[userIndex].cart = [];
    await userDB.write(users);

    res.json({ message: 'Корзина очищена' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при очистке корзины' });
  }
});

export const cartController = router;