export interface User {
  id: string;
  name: string;
  email: string;
  login: string;
  phone: string;
  password: string;
  createdAt: string;
  cart: CartItem[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  imageUrl?: string | null;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  addedAt: string;
}


export interface RegistrationData {
  name: string;
  email: string;
  login: string;
  phone: string;
  password: string;
}

export interface LoginData {
  login: string;
  password: string;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  inStock?: string;
  minPrice?: string;
  maxPrice?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';
}

export interface CartItemWithDetails extends CartItem {
  product: Product | null;
  dataTitle?: string;
  dataPrice?: number;
  dataBasket?: boolean;
}

export interface CartResponse {
  items: CartItemWithDetails[];
  total: number;
}