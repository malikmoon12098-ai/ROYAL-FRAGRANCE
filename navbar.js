

export function initNavbar() {
    initNavbarToggle();
    initGlobalSearch();
    initBackNavigation();
    initWhatsAppIcon();
    initCartSystem();
}

function initBackNavigation() {
    const backBtn = document.getElementById('backBtn');
    const currentLoc = window.location.pathname.split('/').pop() || 'index.html';

    // 1. Session-Based History Tracking
    let history = JSON.parse(sessionStorage.getItem('mz_history') || '[]');
    
    // Auto-Reset Logic: If coming back from another app/tab, redirect to home
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !document.hidden && !currentLoc.includes('index.html')) {
            console.log("App re-entry detected. Resetting to Home.");
            sessionStorage.removeItem('mz_history');
            window.location.href = 'index.html';
        }
    });

    // Don't push duplicate consecutive entries
    if (history[history.length - 1] !== window.location.href) {
        history.push(window.location.href);
        // Limit history size to 10 to keep it clean
        if (history.length > 10) history.shift();
        sessionStorage.setItem('mz_history', JSON.stringify(history));
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            let hist = JSON.parse(sessionStorage.getItem('mz_history') || '[]');
            
            // Pop the current page first
            if (hist.length > 0) hist.pop();

            if (hist.length > 0) {
                const prevPage = hist.pop(); // Pop the previous one to go there
                sessionStorage.setItem('mz_history', JSON.stringify(hist));
                window.location.href = prevPage;
            } else {
                window.location.href = 'index.html';
            }
        });
    }
}

export function formatPrice(num) {
    if (typeof num !== 'number') num = parseFloat(String(num).replace(/[^\d.]/g, '')) || 0;
    const rounded = Math.round(num);
    const formattedNum = rounded < 10000 ? rounded.toString() : rounded.toLocaleString();
    return `Rs.${formattedNum}`;
}

function initNavbarToggle() {
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', (e) => {
            navLinks.classList.toggle('active');
            navToggle.querySelector('i').className = navLinks.classList.contains('active') ? 'fas fa-times' : 'fas fa-bars';
            e.stopPropagation();
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                navToggle.querySelector('i').className = 'fas fa-bars';
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (navLinks.classList.contains('active') && !navLinks.contains(e.target) && !navToggle.contains(e.target)) {
                navLinks.classList.remove('active');
                navToggle.querySelector('i').className = 'fas fa-bars';
            }
        });
    }
}

function initGlobalSearch() {
    const searchBox = document.querySelector('.search-box');
    const searchInput = document.getElementById('searchInput');
    const suggestionsBox = document.getElementById('searchSuggestions');

    if (!searchInput || !suggestionsBox) return;

    // Add close button dynamically
    const closeBtn = document.createElement('i');
    closeBtn.className = 'fas fa-times search-close';
    if (searchBox) searchBox.appendChild(closeBtn);

    let allProducts = [];

    // Fetch products once for fast local searching
    onSnapshot(collection(db, "products"), (snapshot) => {
        allProducts = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    });

    searchInput.addEventListener('input', () => {
        const term = searchInput.value.trim().toLowerCase();
        if (!term) {
            suggestionsBox.classList.remove('active');
            return;
        }

        const matches = allProducts
            .filter(p => 
                (p.name && p.name.toLowerCase().includes(term)) || 
                (p.cat && p.cat.toLowerCase().includes(term))
            )
            .slice(0, 4);

        renderSuggestions(matches, suggestionsBox);
    });

    function renderSuggestions(matches, box) {
        if (matches.length === 0) {
            box.innerHTML = '<div class="no-suggestions">No results found</div>';
        } else {
            box.innerHTML = matches.map(p => `
                <div class="suggestion-item" onclick="window.location.href='product-details.html?id=${p.id}'">
                    <img src="${p.url}" class="suggestion-thumb" onerror="this.src='assets/logo.png'; this.classList.add('placeholder');">
                    <div class="suggestion-info">
                        <h5>${p.name}</h5>
                        <span>${p.cat}</span>
                    </div>
                </div>
            `).join('');
        }
        box.classList.add('active');
    }

    // Close search/suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (searchBox && !searchBox.contains(e.target)) {
            searchBox.classList.remove('active');
            suggestionsBox.classList.remove('active');
        }
    });

    // Mobile: Handle expansion via wrapper click
    if (searchBox) {
        searchBox.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && searchBox.classList.contains('header-search')) {
                searchBox.classList.add('active');
                if (searchInput) searchInput.focus();
                e.stopPropagation();
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            if (searchBox) searchBox.classList.remove('active');
            if (searchInput) searchInput.value = '';
            if (suggestionsBox) suggestionsBox.classList.remove('active');
            e.stopPropagation();
        });
    }

    // Desktop: Search on Enter
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const term = searchInput.value.trim();
            if (term) {
                const exact = allProducts.find(p => p.name.toLowerCase() === term.toLowerCase());
                if (exact) {
                    window.location.href = `product-details.html?id=${exact.id}`;
                } else {
                    window.location.href = `category.html?search=${encodeURIComponent(term)}`;
                }
            }
        }
    });
}
async function initWhatsAppIcon() {
    if (document.querySelector('.whatsapp-float')) return;

    try {
        const docSnap = await getDoc(doc(db, "shopInfo", "details"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            const phone = data.phone || '';
            if (phone) {
                // Clean phone number (remove spaces, dashes, etc)
                const cleanPhone = phone.replace(/[^\d]/g, '');

                const waLink = document.createElement('a');
                waLink.href = `https://wa.me/${cleanPhone}`;
                waLink.className = 'whatsapp-float';
                waLink.target = '_blank';
                waLink.innerHTML = '<i class="fab fa-whatsapp"></i>';
                document.body.appendChild(waLink);
            }
        }
    } catch (e) {
        if (e.code === 'permission-denied') {
            console.warn("WhatsApp info access denied: Check Firebase Rules.");
        } else {
            console.error("Error loading WhatsApp info:", e);
        }
    }
}

// --- Global Cart System ---
function initCartSystem() {
    if (document.querySelector('.cart-float')) return;

    // Inject Drawer UI
    const drawerHTML = `
        <div class="cart-overlay" id="cartOverlay"></div>
        <div class="cart-drawer" id="cartDrawer">
            <div class="cart-header">
                <h3><i class="fas fa-shopping-basket"></i> Your Cart</h3>
                <i class="fas fa-times close-cart" id="closeCart"></i>
            </div>
            <div class="cart-items-container" id="cartItemsList">
                <!-- Items injected here -->
            </div>
            <div class="cart-footer">
                <div class="cart-bill-row">
                    <span>Subtotal</span>
                    <span id="cartSubtotal">Rs.0</span>
                </div>
                <div class="cart-bill-row">
                    <span>Delivery Charges</span>
                    <span id="cartDC">Rs.0</span>
                </div>
                <div class="cart-bill-row total">
                    <span>Total Bill</span>
                    <span id="cartTotal">Rs.0</span>
                </div>
                <div class="cart-actions">
                    <button class="btn-cart-cancel" id="cancelCart">Cancel</button>
                    <button class="btn-cart-checkout" id="checkoutCartBtn">Checkout</button>
                </div>
            </div>
        </div>
        <div class="cart-float" id="openCart">
            <i class="fas fa-shopping-cart"></i>
            <span class="cart-badge" id="cartCount">0</span>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', drawerHTML);

    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    const openBtn = document.getElementById('openCart');
    const closeBtn = document.getElementById('closeCart');
    const cancelBtn = document.getElementById('cancelCart');
    const checkoutBtn = document.getElementById('checkoutCartBtn');

    const toggleCart = () => {
        if (!drawer || !overlay) return;
        drawer.classList.toggle('active');
        overlay.classList.toggle('active');
        if (drawer.classList.contains('active')) renderCart();
    };

    if (openBtn) openBtn.onclick = toggleCart;
    if (closeBtn) closeBtn.onclick = toggleCart;
    if (cancelBtn) cancelBtn.onclick = toggleCart;
    if (overlay) overlay.onclick = toggleCart;

    if (checkoutBtn) {
        checkoutBtn.onclick = () => {
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            if (cart.length === 0) {
                alert("Your cart is empty!");
                return;
            }
            localStorage.setItem('checkoutMode', 'cart');
            window.location.href = 'checkout.html';
        };
    }

    // Global "Add to Cart" listener
    document.addEventListener('click', async (e) => {
        const addBtn = e.target.closest('.add-to-cart-btn, .btn-add-cart, .add-to-cart-small');
        if (addBtn) {
            e.preventDefault();
            const id = addBtn.getAttribute('data-id') || new URLSearchParams(window.location.search).get('id');
            if (!id) return;

            try {
                const docSnap = await getDoc(doc(db, "products", id));
                if (docSnap.exists()) {
                    const product = docSnap.data();
                    let selection = "";
                    let qty = 1;

                    if (window.location.pathname.includes('product-details.html')) {
                        const isLooseOil = product.cat === 'Loose Oil';
                        if (isLooseOil) {
                            const activeSize = document.querySelector('.size-btn.active');
                            const sizeText = activeSize ? activeSize.textContent : "3ml";
                            qty = parseInt(document.getElementById('qty-input').value) || 1;
                            selection = qty > 1 ? `${sizeText} x ${qty} Pcs` : sizeText;
                        } else {
                            qty = parseInt(document.getElementById('qty-input').value) || 1;
                            selection = `${qty} Pcs`;
                        }
                    } else {
                        selection = "1 Pcs";
                    }

                    addToCart({ id, ...product, selection, qty });

                    const originalHTML = addBtn.innerHTML;
                    addBtn.innerHTML = '<i class="fas fa-check"></i> Added';
                    setTimeout(() => {
                        addBtn.innerHTML = originalHTML;
                    }, 2000);
                }
            } catch (err) {
                console.error("Cart error:", err);
            }
        }
    });

    updateCartBadge();
}

function addToCart(item) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find(i => i.id === item.id && i.selection === item.selection);
    if (existing) {
        existing.qty += item.qty;
    } else {
        cart.push(item);
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer) drawer.classList.add('active');
    if (overlay) overlay.classList.add('active');
    renderCart();
}

function updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((acc, item) => acc + item.qty, 0);
    const badge = document.getElementById('cartCount');
    if (badge) badge.textContent = count;
}

function renderCart() {
    const list = document.getElementById('cartItemsList');
    const subtotalEl = document.getElementById('cartSubtotal');
    const dcEl = document.getElementById('cartDC');
    const totalEl = document.getElementById('cartTotal');
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');

    if (!list) return;

    if (cart.length === 0) {
        list.innerHTML = `<div style="text-align: center; padding: 40px 20px; color: #666;">
            <i class="fas fa-shopping-cart" style="font-size: 3rem; margin-bottom: 15px; display: block; opacity: 0.3;"></i>
            Your cart is empty
        </div>`;
        if (subtotalEl) subtotalEl.textContent = 'Rs.0';
        if (dcEl) dcEl.textContent = 'Rs.0';
        if (totalEl) totalEl.textContent = 'Rs.0';
        return;
    }

    let subtotal = 0;
    list.innerHTML = cart.map((item, index) => {
        const rawPrice = parseFloat(String(item.price).replace(/[^\d.]/g, '')) || 0;
        let itemPrice = 0;

        if (item.cat === 'Loose Oil') {
            const mlMatch = (item.selection || "").match(/(\d+)ml/);
            const ml = mlMatch ? parseInt(mlMatch[1]) : 3;
            const perMlPrice = rawPrice / 3;
            itemPrice = (perMlPrice * ml) * item.qty;
        } else {
            itemPrice = rawPrice * item.qty;
        }

        subtotal += itemPrice;

        return `
            <div class="cart-item">
                <img src="${item.url}" alt="${item.name}" onerror="this.src='assets/logo.png'; this.classList.add('placeholder');">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>${item.cat} | ${item.selection}</p>
                    <div class="cart-qty-wrap">
                        <button class="cart-qty-btn" onclick="updateCartItemQty(${index}, -1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="cart-qty-val">${item.qty}</span>
                        <button class="cart-qty-btn" onclick="updateCartItemQty(${index}, 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <div class="cart-item-right">
                    <div class="cart-item-price">${formatPrice(itemPrice)}</div>
                    <button class="remove-cart-item" onclick="removeFromCart(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    const totalQty = cart.reduce((acc, item) => acc + (parseInt(item.qty) || 1), 0);
    let totalDC = totalQty * 200;

    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (dcEl) dcEl.textContent = formatPrice(totalDC);
    if (totalEl) totalEl.textContent = formatPrice(subtotal + totalDC);
}

window.removeFromCart = (index) => {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    renderCart();
};

window.updateCartItemQty = (index, delta) => {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (!cart[index]) return;

    const newQty = (cart[index].qty || 1) + delta;
    if (newQty < 1) return; // Prevent quantity from going below 1

    cart[index].qty = newQty;

    // Update selection text if it contains "Pcs" for non-oil products
    if (cart[index].cat !== 'Loose Oil' && cart[index].selection && cart[index].selection.includes('Pcs')) {
        cart[index].selection = `${newQty} Pcs`;
    }
    // For Loose Oil, selection looks like "3ml x 2 Pcs" or just "3ml"
    else if (cart[index].cat === 'Loose Oil') {
        const mlMatch = cart[index].selection.match(/(\d+)ml/);
        const mlText = mlMatch ? mlMatch[0] : "3ml";
        cart[index].selection = `${mlText} x ${newQty} Pcs`;
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    renderCart();
};

