import { Router, Request, Response } from 'express';
import { FileDB } from '../utils/fileUtils';
import { Product, ProductFilters } from '../models';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const productDB = new FileDB<Product>('products.json');

router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: ProductFilters = req.query;
    let products = await productDB.read();

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) || 
        p.description.toLowerCase().includes(searchLower)
      );
    }

    if (filters.category) {
      products = products.filter(p => p.category === filters.category);
    }

    if (filters.inStock !== undefined) {
      const inStock = filters.inStock === 'true';
      products = products.filter(p => p.inStock === inStock);
    }

    if (filters.minPrice) {
      const minPrice = Number(filters.minPrice);
      products = products.filter(p => p.price >= minPrice);
    }

    if (filters.maxPrice) {
      const maxPrice = Number(filters.maxPrice);
      products = products.filter(p => p.price <= maxPrice);
    }

    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'price_asc':
          products.sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          products.sort((a, b) => b.price - a.price);
          break;
        case 'name_asc':
          products.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'name_desc':
          products.sort((a, b) => b.name.localeCompare(a.name));
          break;
      }
    }

    const productsWithDataAttrs = products.map(p => ({
      ...p,
      dataTitle: p.name,
      dataPrice: p.price
    }));

    res.json(productsWithDataAttrs);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении товаров' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const productId = req.params.id as string; 
    const product = await productDB.findById(productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении товара' });
  }
});

router.get('/categories/:category', async (req: Request, res: Response) => {
  try {
    const category = req.params.category as string; 
    const products = await productDB.read();
    const filtered = products.filter(p => 
      p.category.toLowerCase() === category.toLowerCase()
    );
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении категории' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, price, category, inStock, imageUrl } = req.body;
    
    if (!name || !description || !price || !category) {
      return res.status(400).json({ error: 'Заполните обязательные поля' });
    }

    const newProduct: Product = {
      id: uuidv4(),
      name,
      description,
      price: Number(price),
      category,
      inStock: inStock ?? true,
      imageUrl: imageUrl || null,
      createdAt: new Date().toISOString()
    };

    await productDB.create(newProduct);
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при создании товара' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const productId = req.params.id as string; 
    const updated = await productDB.update(productId, req.body);
    
    if (!updated) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при обновлении товара' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const productId = req.params.id as string; 
    const deleted = await productDB.delete(productId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    res.json({ message: 'Товар удалён' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при удалении товара' });
  }
});

export const productController = router;