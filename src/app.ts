import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { authMiddleware } from './middleware/auth';

import { userController } from './controllers/userController';
import { productController } from './controllers/productController';
import { cartController } from './controllers/cartController';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(authMiddleware); 

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/users', userController);
app.use('/api/products', productController);
app.use('/api/cart', cartController);

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});