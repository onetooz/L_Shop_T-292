import { Router, Request, Response } from 'express';
import { FileDB } from '../utils/fileUtils';
import { Product, ProductFilters } from '../models';

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

    if (filters.inStock === 'true' || filters.inStock === 'false') {
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

export const productController = router;