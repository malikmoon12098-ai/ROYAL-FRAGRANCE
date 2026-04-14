
import { initNavbar, formatPrice } from "./navbar.js";

document.addEventListener('DOMContentLoaded', async () => {
    initNavbar();

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        window.location.href = 'category.html';
        return;
    }

    const productContainer = document.getElementById('product-container');
    const breadcrumbCurrent = document.getElementById('breadcrumb-current');

    try {
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const product = docSnap.data();
            renderProductDetails(product, productId, productContainer, breadcrumbCurrent);
        } else {
            productContainer.innerHTML = '<div class="loading-spinner">Product not found.</div>';
        }
    } catch (e) {
        console.error("Error fetching product:", e);
        productContainer.innerHTML = '<div class="loading-spinner">Error loading product details.</div>';
    }
});

function renderProductDetails(p, id, container, breadcrumb) {
    breadcrumb.textContent = p.name;
    document.title = `${p.name} | BIN MAZHAR PERFUMES`;

    const isAttar = p.cat === 'Attar';
    const isLooseOil = p.cat === 'Loose Oil';
    const basePrice = parseFloat(String(p.price).replace(/[^\d.]/g, '')) || 0;
    const isManualSoldOut = p.availability === 'out';
    const isAutoSoldOut = parseFloat(p.qty) <= 0;
    const isSoldOut = isManualSoldOut || isAutoSoldOut;

    // Default Price Display (for Loose Oil, the price in DB is for 3ml)
    let displayPrice = basePrice;
    // if (isLooseOil) displayPrice = basePrice * 3; // Old logic: price was per ml
    // New logic: basePrice IS the 3ml price.

    container.innerHTML = `
        <div class="product-left-col">
            <div class="product-image-section">
                <img src="${p.url}" alt="${p.name}" id="main-prod-img" onerror="this.src='assets/logo.png'; this.classList.add('placeholder');">
                ${isSoldOut ? `<span class="badge sold-out" style="position: absolute; top: 1rem; left: 1rem; background: #e74c3c; color: #fff; padding: 5px 12px; border-radius: 4px; font-weight: 600; font-size: 0.8rem; z-index: 10;">OUT OF STOCK</span>` : ''}
            </div>

            ${(!isLooseOil && (p.url2 || p.url3)) ? `
            <div class="product-thumbnails">
                <div class="thumbnail active" data-src="${p.url}">
                    <img src="${p.url}" alt="thumbnail">
                </div>
                ${p.url2 ? `
                <div class="thumbnail" data-src="${p.url2}">
                    <img src="${p.url2}" alt="thumbnail">
                </div>
                ` : ''}
                ${p.url3 ? `
                <div class="thumbnail" data-src="${p.url3}">
                    <img src="${p.url3}" alt="thumbnail">
                </div>
                ` : ''}
            </div>
            ` : ''}
            
            ${(p.notes && String(p.notes).trim().length > 0) ? `
            <div class="fragrance-notes laptop-only reveal">
                <h4><i class="fas fa-feather-alt"></i> Fragrance Notes</h4>
                <p>${p.notes}</p>
            </div>
            ` : ''}
        </div>

        <div class="product-info-section">
            <span class="product-cat-tag">${p.cat}</span>
            <h1 class="product-main-title">${p.name}</h1>
            ${p.subTitle ? `
            <div class="product-desc-container" style="margin-bottom: 1.5rem;">
                <p class="product-subtitle-tag expandable-desc" style="margin-bottom: 5px;">${p.subTitle}</p>
                <button class="desc-toggle-btn" style="display: none;">See more</button>
            </div>` : ''}
            
            <div class="product-rating">
                <span>${p.rating || '5.0'}</span>
                <i class="fas fa-star"></i>
                <span style="font-weight: 400; color: #888; margin-left: 10px;">(Verified Review)</span>
            </div>

            <div class="product-price-large" id="dynamic-price" style="${isSoldOut ? 'color: #999; text-decoration: line-through;' : ''}">
                ${formatPrice(displayPrice)}
            </div>

            <div class="selection-group" style="${isSoldOut ? 'opacity: 0.5; pointer-events: none;' : ''}">
                <span class="selection-label">${isLooseOil ? 'Select Size / Weight' : 'Quantity'}</span>
                ${isLooseOil ? `
                    <div class="size-picker" id="size-picker" style="margin-bottom: 20px;">
                        <button class="size-btn active" data-type="oil" data-ml="3">3ml</button>
                        <button class="size-btn" data-type="oil" data-ml="6">6ml</button>
                        <button class="size-btn" data-type="oil" data-ml="12">12ml</button>
                    </div>
                    <span class="selection-label">Quantity</span>
                    <div class="qty-selector">
                        <button class="qty-btn" id="qty-minus">-</button>
                        <input type="number" value="1" min="1" class="qty-input" id="qty-input">
                        <button class="qty-btn" id="qty-plus">+</button>
                    </div>
                ` : `
                    <div class="qty-selector">
                        <button class="qty-btn" id="qty-minus">-</button>
                        <input type="number" value="1" min="1" class="qty-input" id="qty-input">
                        <button class="qty-btn" id="qty-plus">+</button>
                    </div>
                `}
            </div>

            <div class="product-actions-group">
                <button class="btn-add-cart" id="add-to-cart-btn" ${isSoldOut ? 'disabled style="background: #ccc; cursor: not-allowed;"' : ''}>
                    ${isSoldOut ? 'Out of Stock' : 'Add to Cart'}
                </button>
                <button class="btn-buy-now" id="buy-now-btn" ${isSoldOut ? 'disabled style="background: #ccc; cursor: not-allowed; opacity: 0.7;"' : ''}>
                    ${isSoldOut ? 'Not Available' : 'Buy Now'}
                </button>
            </div>

            ${(p.notes && String(p.notes).trim().length > 0) ? `
            <div class="fragrance-notes mobile-only reveal">
                <h4><i class="fas fa-feather-alt"></i> Fragrance Notes</h4>
                <p>${p.notes}</p>
            </div>
            ` : ''}

            <div class="delivery-info-box reveal" style="margin-top: 3rem; border-top: 1px solid #eee; padding-top: 2rem;">
                <h4 style="margin-bottom: 1rem; text-transform: uppercase; font-size: 0.9rem; letter-spacing: 1px;">Delivery Info</h4>
                <p style="font-size: 0.9rem; color: #666; line-height: 1.6;">
                    <i class="fas fa-truck" style="margin-right: 10px; color: var(--gold);"></i> Standard delivery 3-5 business days across Pakistan.
                </p>
            </div>
        </div>
    `;

    // Logic for Image Swapper
    if (p.url2 || p.url3) {
        initImageSwapper();
    }

    // Logic for Selectors
    if (isLooseOil) {
        initLooseOilLogic(basePrice);
        initQtyLogic(); // Add quantity logic for Loose Oil
    } else {
        initQtyLogic();
    }

    // Logic for "Buy Now" (WhatsApp Checkout)
    initBuyNowLogic(p, id);

    // Logic for Description Toggle
    initDescToggleLogic();

    // Initialize Scroll Reveal
    initScrollReveal();
}

function initDescToggleLogic() {
    const descEl = document.querySelector('.expandable-desc');
    const toggleBtn = document.querySelector('.desc-toggle-btn');
    if (descEl && toggleBtn) {
        setTimeout(() => {
            if (descEl.scrollHeight > descEl.clientHeight) {
                toggleBtn.style.display = 'inline-block';
            }
        }, 100);

        toggleBtn.addEventListener('click', () => {
            if (descEl.classList.contains('expanded')) {
                descEl.classList.remove('expanded');
                toggleBtn.textContent = 'See more';
            } else {
                descEl.classList.add('expanded');
                toggleBtn.textContent = 'Hide';
            }
        });
    }
}

function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

function initImageSwapper() {
    const mainImg = document.getElementById('main-prod-img');
    const thumbnails = document.querySelectorAll('.thumbnail');

    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', () => {
            const newSrc = thumb.getAttribute('data-src');
            mainImg.src = newSrc;

            // Update Active State
            thumbnails.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });
    });
}


function initLooseOilLogic(per3mlPrice) {
    const sizeBtns = document.querySelectorAll('.size-btn[data-type="oil"]');
    const priceDisplay = document.getElementById('dynamic-price');

    sizeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sizeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const ml = parseInt(btn.getAttribute('data-ml'));
            // Price Calculation: Base Price is for 3ml.
            const perMlPrice = per3mlPrice / 3;
            const newPrice = perMlPrice * ml;
            priceDisplay.textContent = formatPrice(newPrice);

        });
    });
}

function initQtyLogic() {
    const minus = document.getElementById('qty-minus');
    const plus = document.getElementById('qty-plus');
    const input = document.getElementById('qty-input');

    plus.addEventListener('click', () => input.value = parseInt(input.value) + 1);
    minus.addEventListener('click', () => {
        if (parseInt(input.value) > 1) input.value = parseInt(input.value) - 1;
    });
}

function initBuyNowLogic(product, id) {
    const buyNowBtn = document.getElementById('buy-now-btn');
    const checkoutModal = document.getElementById('checkout-modal');
    const closeCheckoutModal = document.getElementById('close-checkout-modal');
    const cancelOrderBtn = document.getElementById('cancel-order-btn');
    const orderSummaryBox = document.getElementById('order-summary-box');
    const checkoutForm = document.getElementById('checkout-form');

    if (!buyNowBtn) return;

    buyNowBtn.addEventListener('click', () => {
        let selection = "";
        let qty = 1;

        if (product.cat === 'Loose Oil') {
            const activeSize = document.querySelector('.size-btn.active');
            const sizeText = activeSize ? activeSize.textContent : "3ml";
            qty = document.getElementById('qty-input').value;
            selection = `${sizeText} x ${qty} Pcs`;
        } else {
            qty = document.getElementById('qty-input').value;
            selection = `${qty} Pcs`;
        }

        // Redirect to new professional checkout page
        localStorage.removeItem('checkoutMode');
        window.location.href = `checkout.html?id=${id}&selection=${encodeURIComponent(selection)}&qty=${qty}`;
    });

    const closeModal = () => checkoutModal.classList.remove('active');
    closeCheckoutModal.addEventListener('click', closeModal);
    cancelOrderBtn.addEventListener('click', closeModal);

    // Form Submission
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const confirmBtn = checkoutForm.querySelector('.btn-confirm-order');
        const originalBtnText = confirmBtn.textContent;
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Processing...';

        const customerInfo = {
            custName: document.getElementById('cust-name').value.trim(),
            custPhone: document.getElementById('cust-phone').value.trim(),
            custCity: document.getElementById('cust-city').value.trim(),
            custAddress: document.getElementById('cust-address').value.trim()
        };

        const finalOrder = {
            ...checkoutForm.orderData,
            ...customerInfo,
            createdAt: new Date()
        };

        try {
            await addDoc(collection(db, "orders"), finalOrder);

            // Success State
            checkoutModal.innerHTML = `
                <div class="checkout-modal-content" style="text-align: center; padding: 60px;">
                    <i class="fas fa-check-circle" style="font-size: 4rem; color: #2ecc71; margin-bottom: 1.5rem;"></i>
                    <h3 style="font-size: 1.8rem; margin-bottom: 1rem;">Order Placed!</h3>
                    <p style="color: #666; margin-bottom: 2.5rem;">Thank you for shopping with Bin Mazhar Perfumes. You can track your order using your phone number.</p>
                    <button class="btn-confirm-order" onclick="window.location.reload()" style="width: auto; padding: 15px 40px;">Continue Shopping</button>
                </div>
            `;
        } catch (error) {
            console.error("Order error:", error);
            showNotification("Failed to place order. Please try again.", "error");
            confirmBtn.disabled = false;
            confirmBtn.textContent = originalBtnText;
        }
    });

    window.addEventListener('click', (e) => {
        if (e.target === checkoutModal) closeModal();
    });
}

function showNotification(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('active'), 100);
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

