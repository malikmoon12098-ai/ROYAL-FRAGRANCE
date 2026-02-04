const INITIAL_PRODUCTS = [
    {
        id: '1',
        name: 'Royal Oud Intense',
        brand: 'Royal Fragrance',
        price: 250,
        category: 'Men',
        image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=1080&auto=format&fit=crop',
        description: 'A deep, woody scent reminiscent of ancient royalty. Notes of agarwood, sandalwood, and amber.',
        notes: { top: 'Bergamot', middle: 'Agarwood', base: 'Amber' },
        stock: 50,
        featured: true,
        bestseller: true
    },
    {
        id: '2',
        name: 'Velvet Rose & Gold',
        brand: 'Royal Fragrance',
        price: 180,
        category: 'Women',
        image: 'https://images.unsplash.com/photo-1594035910387-fea4779426e9?q=80&w=1080&auto=format&fit=crop',
        description: 'An elegant blend of velvet rose wrapped in smoked oud and praline.',
        notes: { top: 'Clove', middle: 'Damask Rose', base: 'Oud' },
        stock: 30,
        featured: true,
        bestseller: false
    },
    {
        id: '3',
        name: 'Celestial Silver',
        brand: 'Royal Fragrance',
        price: 210,
        category: 'Unisex',
        image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=1080&auto=format&fit=crop',
        description: 'A fresh, crisp fragrance with metallic notes and cool citrus.',
        notes: { top: 'Lime', middle: 'Silver Birch', base: 'Vetiver' },
        stock: 45,
        featured: false,
        bestseller: true
    },
    {
        id: '4',
        name: 'Midnight Amber',
        brand: 'Royal Fragrance',
        price: 290,
        category: 'Luxury Collection',
        image: 'https://images.unsplash.com/photo-1523293188086-b469b9732f9e?q=80&w=1080&auto=format&fit=crop',
        description: 'The essence of night. Dark, mysterious, and incredibly long-lasting.',
        notes: { top: 'Black Pepper', middle: 'Incense', base: 'Patchouli' },
        stock: 15,
        featured: true,
        bestseller: true
    },
    {
        id: '5',
        name: 'Golden Santal',
        brand: 'Royal Fragrance',
        price: 195,
        category: 'Unisex',
        image: 'https://images.unsplash.com/photo-1615178614070-0153e012147a?q=80&w=1080&auto=format&fit=crop',
        description: 'Warm sandalwood spiced with cardamom and violet.',
        notes: { top: 'Cardamom', middle: 'Violet', base: 'Sandalwood' },
        stock: 60,
        featured: false,
        bestseller: false
    },
    {
        id: '6',
        name: 'Imperial Jasmine',
        brand: 'Royal Fragrance',
        price: 220,
        category: 'Women',
        image: 'https://images.unsplash.com/photo-1557170334-a9632e77c6e4?q=80&w=1080&auto=format&fit=crop',
        description: 'A heady floral fragrance dominated by jasmine sambac and tuberose.',
        notes: { top: 'Saffron', middle: 'Jasmine', base: 'Musk' },
        stock: 25,
        featured: false,
        bestseller: true
    }
];

const DB_KEYS = {
    PRODUCTS: 'rf_products',
    ORDERS: 'rf_orders',
    CART: 'rf_cart'
};

const DataManager = {
    init: () => {
        if (!localStorage.getItem(DB_KEYS.PRODUCTS)) {
            localStorage.setItem(DB_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
            console.log('Database initialized with default products.');
        }
        if (!localStorage.getItem(DB_KEYS.ORDERS)) {
            localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify([]));
        }
        if (!localStorage.getItem(DB_KEYS.CART)) {
            localStorage.setItem(DB_KEYS.CART, JSON.stringify([]));
        }
    },

    getProducts: () => {
        return JSON.parse(localStorage.getItem(DB_KEYS.PRODUCTS) || '[]');
    },

    getProductById: (id) => {
        const products = DataManager.getProducts();
        return products.find(p => p.id === id);
    },

    saveProducts: (products) => {
        localStorage.setItem(DB_KEYS.PRODUCTS, JSON.stringify(products));
    },

    getOrders: () => {
        return JSON.parse(localStorage.getItem(DB_KEYS.ORDERS) || '[]');
    },

    saveOrder: (order) => {
        const orders = DataManager.getOrders();
        order.id = 'ORD-' + Date.now();
        order.date = new Date().toISOString();
        order.status = 'Pending';
        orders.unshift(order);
        localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify(orders));
        return order;
    },
    
    updateOrderStatus: (orderId, status) => {
        const orders = DataManager.getOrders();
        const orderIndex = orders.findIndex(o => o.id === orderId);
        if (orderIndex > -1) {
            orders[orderIndex].status = status;
            localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify(orders));
            return true;
        }
        return false;
    }
};

// Auto-initialize on load logic handled in apps, but good to have here
DataManager.init();
