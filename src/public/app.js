class Router {
    constructor() {
        this.routes = {};
        window.addEventListener('popstate', () => this.handleRoute());
    }

    addRoute(path, handler) {
        this.routes[path] = handler;
    }

    navigate(path) {
        window.history.pushState({}, '', path);
        this.handleRoute();
    }

    async handleRoute() {
        const path = window.location.pathname;
        const handler = this.routes[path] || this.routes['*'];
        if (handler) {
            await handler();
        }
        this.updateActiveNavLink(path);
    }

    updateActiveNavLink(path) {
        document.querySelectorAll('nav a').forEach(link => {
            const page = link.dataset.page;
            if ((page === 'home' && path === '/') || 
                (page === 'cart' && path === '/cart')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
}

class ApiClient {
    static async request(endpoint, options = {}) {
        try {
            const response = await fetch(endpoint, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                credentials: 'same-origin'
            });
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Ошибка сервера. Статус: ${response.status}`);
            }
            
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `Ошибка сервера: ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw new Error(error.message || 'Ошибка соединения');
        }
    }

    static async get(endpoint) { return this.request(endpoint); }
    static async post(endpoint, body) {
        return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
    }
    static async put(endpoint, body) {
        return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
    }
    static async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}


class Notification {
    static show(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
}

class AppState {
    static user = null;
    static cart = null;

    static async loadUser() {
        try {
            const data = await ApiClient.get('/api/users/me');
            this.user = data && !data.error ? data : null;
            this.updateUserInfo();
            if (this.user) await this.loadCart();
        } catch (error) {
            this.user = null;
            this.updateUserInfo();
        }
    }

    static async loadCart() {
        if (!this.user) return;
        try {
            this.cart = await ApiClient.get('/api/cart');
            this.updateCartCount();
        } catch (error) {
            console.error('Cart load error:', error);
        }
    }

    static updateUserInfo() {
        const userNameEl = document.getElementById('userName');
        const authBtn = document.getElementById('authBtn');
        if (this.user) {
            userNameEl.textContent = `Привет, ${this.user.name}`;
            authBtn.textContent = 'Выйти';
        } else {
            userNameEl.textContent = '';
            authBtn.textContent = 'Войти';
        }
    }

    static updateCartCount() {
        const cartCountEl = document.getElementById('cartCount');
        const count = this.cart?.items?.length || 0;
        cartCountEl.textContent = count;
        cartCountEl.style.display = count > 0 ? 'inline' : 'none';
    }
}

const productsPage = {
    currentFilters: {},

    async render() {
        const template = document.getElementById('home-page');
        document.getElementById('app').innerHTML = '';
        document.getElementById('app').appendChild(template.content.cloneNode(true));
        
        await this.loadCategories();
        await this.loadProducts();
        this.bindEvents();
    },

    bindEvents() {
        const apply = () => this.applyFilters();
        document.getElementById('searchInput').onkeypress = (e) => e.key === 'Enter' && apply();
        document.getElementById('categorySelect').onchange = apply;
        document.getElementById('inStockSelect').onchange = apply;
        document.getElementById('sortSelect').onchange = apply;
        const btn = document.querySelector('.filters button');
        if (btn) btn.onclick = apply;
    },

    async loadCategories() {
        const products = await ApiClient.get('/api/products');
        const categories = [...new Set(products.map(p => p.category))];
        const select = document.getElementById('categorySelect');
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = cat;
            select.appendChild(opt);
        });
    },

    async loadProducts() {
        const params = new URLSearchParams(this.currentFilters).toString();
        const products = await ApiClient.get(`/api/products?${params}`);
        this.renderProducts(products);
    },

    renderProducts(products) {
        const grid = document.getElementById('productsGrid');
        grid.innerHTML = products.length ? '' : '<div class="message">Товары не найдены</div>';
        
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="stock-badge ${product.inStock ? 'in-stock' : 'out-of-stock'}">${product.inStock ? 'В наличии' : 'Нет'}</div>
                <h3>${this.escapeHtml(product.name)}</h3>
                <div class="product-price">${product.price.toLocaleString()} ₽</div>
                <div class="product-controls">
                    <input type="number" id="qty-${product.id}" value="1" min="1" max="99">
                    <button onclick="productsPage.addToCart('${product.id}')" ${!product.inStock ? 'disabled' : ''}>В корзину</button>
                </div>
            `;
            grid.appendChild(card);
        });
    },

    escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; },

    applyFilters() {
        this.currentFilters = {
            search: document.getElementById('searchInput').value,
            category: document.getElementById('categorySelect').value,
            minPrice: document.getElementById('minPrice').value,
            maxPrice: document.getElementById('maxPrice').value,
            inStock: document.getElementById('inStockSelect').value,
            sortBy: document.getElementById('sortSelect').value
        };
        this.loadProducts();
    },

    async addToCart(productId) {
        if (!AppState.user) return router.navigate('/login');
        const qty = parseInt(document.getElementById(`qty-${productId}`).value);
        try {
            await ApiClient.post('/api/cart/add', { productId, quantity: qty });
            Notification.show('Добавлено!', 'success');
            await AppState.loadCart();
        } catch (e) { Notification.show(e.message, 'error'); }
    }
};

const cartPage = {
    async render() {
        if (!AppState.user) return router.navigate('/login');
        const template = document.getElementById('cart-page');
        document.getElementById('app').innerHTML = '';
        document.getElementById('app').appendChild(template.content.cloneNode(true));
        await this.loadCart();
    },

    async loadCart() {
        try {
            const cart = await ApiClient.get('/api/cart');
            AppState.cart = cart;
            this.renderCart(cart);
        } catch (e) { Notification.show('Ошибка загрузки', 'error'); }
    },

    renderCart(cart) {
        const container = document.getElementById('cartItems');
        const totalEl = document.getElementById('cartTotal');
        
        if (!cart.items?.length) {
            container.innerHTML = '<div class="message">Корзина пуста</div>';
            totalEl.innerHTML = '';
            return;
        }

        container.innerHTML = '';
        cart.items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'cart-item';
            itemEl.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-title">${productsPage.escapeHtml(item.product?.name)}</div>
                    <div class="cart-item-price">${item.product?.price.toLocaleString()} ₽</div>
                </div>
                <div class="cart-item-controls">
                    <div class="cart-quantity">
                        <button onclick="cartPage.updateQtyOptimistic('${item.productId}', -1)">-</button>
                        <span id="qty-val-${item.productId}">${item.quantity}</span>
                        <button onclick="cartPage.updateQtyOptimistic('${item.productId}', 1)">+</button>
                    </div>
                </div>
            `;
            container.appendChild(itemEl);
        });
        totalEl.innerHTML = `Итого: ${cart.total.toLocaleString()} ₽`;
    },

    updateQtyOptimistic(productId, delta) {
        const qtyEl = document.getElementById(`qty-val-${productId}`);
        if (!qtyEl) return;

        const currentQty = parseInt(qtyEl.textContent);
        const newQty = currentQty + delta;

        if (newQty < 1) {
            return;
        }

        qtyEl.textContent = newQty;

        ApiClient.put('/api/cart/update', { productId, quantity: newQty })
            .then(async () => {
                await AppState.loadCart();
                const totalEl = document.getElementById('cartTotal');
                if (totalEl && AppState.cart) {
                    totalEl.innerHTML = `Итого: ${AppState.cart.total.toLocaleString()} ₽`;
                }
            })
            .catch(err => {
                qtyEl.textContent = currentQty;
                Notification.show('Ошибка обновления', 'error');
            });
    },

    async clearCart() {
        if (!confirm('Очистить корзину?')) return;
        try {
            await ApiClient.post('/api/cart/clear');
            await AppState.loadCart();
            await this.loadCart();
        } catch (e) { Notification.show(e.message, 'error'); }
    }
};

// 6. АВТОРИЗАЦИЯ
const authPage = {
    render: () => {
        const tmp = document.getElementById('login-page');
        document.getElementById('app').innerHTML = '';
        document.getElementById('app').appendChild(tmp.content.cloneNode(true));
    },
    login: async () => {
        const login = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        try {
            await ApiClient.post('/api/users/login', { login, password });
            await AppState.loadUser();
            router.navigate('/');
        } catch (e) { document.getElementById('loginError').textContent = e.message; }
    }
};

// ОБРАБОТЧИК АВТОРИЗАЦИИ
async function handleAuth() {
    if (AppState.user) {
        await ApiClient.post('/api/users/logout');
        AppState.user = AppState.cart = null;
        AppState.updateUserInfo();
        AppState.updateCartCount();
        router.navigate('/');
    } else router.navigate('/login');
}

// РЕГИСТРАЦИЯ

const registerPage = {
    render: () => {
        const tmp = document.getElementById('register-page');
        document.getElementById('app').innerHTML = '';
        document.getElementById('app').appendChild(tmp.content.cloneNode(true));
    },
    register: async () => {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const login = document.getElementById('registerLogin').value;
        const phone = document.getElementById('registerPhone').value;
        const password = document.getElementById('registerPassword').value;
        const errorEl = document.getElementById('registerError');

        if (!name || !email || !login || !phone || !password) {
            errorEl.textContent = 'Заполните все поля';
            return;
        }
        if (!email.includes('@') || !email.includes('.')) {
            errorEl.textContent = 'Введите корректный email';
            return;
        }

        try {
            await ApiClient.post('/api/users/register', { name, email, login, phone, password });
            await AppState.loadUser();
            router.navigate('/');
        } catch (e) { errorEl.textContent = e.message; }
    }
};

// ИНИЦИАЛИЗАЦИЯ РОУТЕРА
const router = new Router();
router.addRoute('/', () => productsPage.render());
router.addRoute('/cart', () => cartPage.render());
router.addRoute('/login', () => authPage.render());
router.addRoute('/register', () => registerPage.render());
router.addRoute('*', () => router.navigate('/'));


window.productsPage = productsPage;
window.cartPage = cartPage;
window.authPage = authPage;
window.registerPage = registerPage;
window.router = router;
window.handleAuth = handleAuth;

window.authPage.register = registerPage.register.bind(registerPage);

window.addEventListener('DOMContentLoaded', async () => {
    await AppState.loadUser();
    router.handleRoute();
});