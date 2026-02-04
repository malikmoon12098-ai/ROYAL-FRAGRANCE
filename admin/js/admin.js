const AdminManager = {
    checkAuth: () => {
        // Allow bypass if running locally without server for demo purposes if needed, 
        // but for now just check storage.
        if (!localStorage.getItem('rf_admin_logged')) {
            // Check if we are already on index.html to avoid loop
            if (!window.location.href.includes('index.html')) {
                window.location.href = 'index.html';
            }
        }
    },

    login: (username, password) => {
        if (username === 'admin' && password === 'admin') {
            localStorage.setItem('rf_admin_logged', 'true');
            window.location.href = 'dashboard.html';
        } else {
            alert('Invalid Credentials');
        }
    },

    logout: () => {
        localStorage.removeItem('rf_admin_logged');
        window.location.href = 'index.html';
    },

    renderProducts: () => {
        const products = DataManager.getProducts();
        const tbody = document.getElementById('products-table-body');
        tbody.innerHTML = products.map(p => `
            <tr>
                <td><img src="${p.image}" width="40" height="40" style="object-fit:cover; border-radius:4px;"></td>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td>$${p.price}</td>
                <td>${p.stock}</td>
                <td><button class="btn" style="padding:5px 10px; font-size:0.8rem; border-color:red; color:red;" onclick="deleteProduct('${p.id}')">Delete</button></td>
            </tr>
        `).join('');
    },

    renderOrders: () => {
        const orders = DataManager.getOrders();
        const tbody = document.getElementById('orders-table-body');
        tbody.innerHTML = orders.map(o => `
            <tr>
                <td>${o.id}</td>
                <td>${o.customer.name}</td>
                <td>$${o.total}</td>
                <td>
                    <select onchange="updateStatus('${o.id}', this.value)" style="background:#333; color:white; border:none; padding:5px;">
                        <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                </td>
                <td>${new Date(o.date).toLocaleDateString()}</td>
            </tr>
        `).join('');
    },

    renderStats: () => {
        const orders = DataManager.getOrders();
        const totalSales = orders.reduce((sum, o) => sum + o.total, 0);

        document.getElementById('stat-sales').textContent = '$' + totalSales;
        document.getElementById('stat-orders').textContent = orders.length;
        document.getElementById('stat-revenue').textContent = '$' + (totalSales * 0.4).toFixed(0); // Mock revenue
    }
};

// Global Exposure for HTML onclicks
window.deleteProduct = (id) => {
    if (confirm('Are you sure?')) {
        let products = DataManager.getProducts();
        products = products.filter(p => p.id !== id);
        DataManager.saveProducts(products);
        AdminManager.renderProducts();
    }
};

window.updateStatus = (id, status) => {
    DataManager.updateOrderStatus(id, status);
    // Optional: Toast notification
};

window.addNewProduct = (e) => {
    e.preventDefault();
    const form = e.target;
    const newProduct = {
        id: 'PROD-' + Date.now(),
        name: form.name.value,
        brand: 'Royal Fragrance', // Default
        category: form.category.value,
        price: parseFloat(form.price.value),
        stock: parseInt(form.stock.value),
        image: form.image.value || 'https://via.placeholder.com/300', // Basic placeholder if empty
        description: form.description.value,
        notes: { top: 'Generic', middle: 'Generic', base: 'Generic' },
        featured: false,
        bestseller: false
    };

    const products = DataManager.getProducts();
    products.push(newProduct);
    DataManager.saveProducts(products);

    document.getElementById('add-product-modal').style.display = 'none';
    form.reset();
    AdminManager.renderProducts();
};
