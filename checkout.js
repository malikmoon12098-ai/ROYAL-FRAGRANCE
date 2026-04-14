
import { initNavbar, formatPrice } from "./navbar.js";

document.addEventListener('DOMContentLoaded', async () => {
    initNavbar();
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const selection = urlParams.get('selection');
    const qty = parseInt(urlParams.get('qty')) || 1;

    // --- State ---
    let cartItems = [];
    let isCartMode = localStorage.getItem('checkoutMode') === 'cart';
    let productData = null; // Used for single-product mode

    // --- Redirect Fix: Only redirect if both single-product ID and cart-mode are missing ---
    if (!productId && !isCartMode) {
        window.location.href = 'index.html';
        return;
    }
    let shopData = {}; // Initialize as empty object to avoid TypeError
    let dcPerProduct = 200;
    let finalSubtotal = 0;
    let finalTotal = 0;
    let finalDC = 0;
    let selectedPaymentMethod = 'Meezan';
    let uploadedProofBase64 = null;

    // --- DOM Elements ---
    const orderSummary = document.getElementById('order-summary');
    const subtotalEl = document.getElementById('subtotal');
    const dcEl = document.getElementById('delivery-charges');
    const totalEl = document.getElementById('total-amount');
    const paymentInstructions = document.getElementById('payment-instructions');
    const paymentOpts = document.querySelectorAll('.payment-opt');
    const uploadBox = document.getElementById('upload-box');
    const proofInput = document.getElementById('proof-upload');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeProofBtn = document.getElementById('remove-proof');
    const checkoutForm = document.getElementById('checkout-form');
    const placeOrderBtn = document.getElementById('place-order-btn');
    const proceedBtn = document.getElementById('proceed-to-payment-btn');
    const paymentWrapper = document.getElementById('payment-section-wrapper');

    const duplicateModal = document.getElementById('duplicate-warning-modal');
    const btnProceedDup = document.getElementById('btn-proceed-duplicate');
    const btnCancelDup = document.getElementById('btn-cancel-duplicate');

    // --- Handle Proceed to Payment ---
    if (proceedBtn && paymentWrapper) {
        proceedBtn.addEventListener('click', async () => {
            // Basic validation check before showing payment
            const name = document.getElementById('custName').value.trim();
            const phone = document.getElementById('custPhone').value.trim();
            const addr = document.getElementById('custAddress').value.trim();
            const city = document.getElementById('custCity').value.trim();

            if (!name || !phone || !addr || !city) {
                showToast("Please fill all shipping details first", "error");
                return;
            }

            proceedBtn.disabled = true;
            proceedBtn.textContent = 'Checking details...';

            // --- SMART CHECK: Duplicate Discovery ---
            try {
                const activeStatuses = ['Pending', 'Confirmed', 'Processing'];
                const q = query(collection(db, "orders"), where("custPhone", "==", phone));
                const snap = await getDocs(q);
                
                let duplicateItemFound = null;
                const currentItems = isCartMode ? cartItems : [{ id: productId, name: productData.name }];

                snap.forEach(docSnap => {
                    const data = docSnap.data();
                    if (activeStatuses.includes(data.status)) {
                        data.items?.forEach(prevItem => {
                            const isMatch = currentItems.some(curr => curr.id === prevItem.id);
                            if (isMatch) duplicateItemFound = prevItem.name;
                        });
                    }
                });

                if (duplicateItemFound) {
                    // Update Product Name in Modal
                    const nameElements = document.querySelectorAll('.duplicate-product-name');
                    nameElements.forEach(el => el.textContent = duplicateItemFound);
                    
                    // Show Warning Modal
                    duplicateModal.style.display = 'flex';
                } else {
                    // No duplicates, proceed normally
                    showPaymentSection();
                }

            } catch (err) {
                console.error("Check error:", err);
                showPaymentSection(); // Fallback on error
            }

            proceedBtn.disabled = false;
            proceedBtn.innerHTML = 'Proceed to Payment <i class="fas fa-chevron-right"></i>';
        });
    }

    function showPaymentSection() {
        paymentWrapper.style.display = 'block';
        proceedBtn.parentElement.style.display = 'none'; // Hide the proceed button wrap
        paymentWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Modal Interaction
    if (btnProceedDup) {
        btnProceedDup.onclick = () => {
            duplicateModal.style.display = 'none';
            showPaymentSection();
        };
    }
    if (btnCancelDup) {
        btnCancelDup.onclick = () => {
            duplicateModal.style.display = 'none';
        };
    }

    // --- Data Fetching ---
    try {
        if (isCartMode) {
            cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
            if (cartItems.length === 0) {
                window.location.href = 'index.html';
                return;
            }

            // Calculate for Cart
            let totalQty = 0;
            cartItems.forEach(item => {
                const rawPrice = parseFloat(String(item.price || "0").replace(/[^\d.]/g, '')) || 0;
                let itemPrice = 0;

                const selection = item.selection || "";
                const itemQty = parseInt(item.qty) || 1;
                totalQty += itemQty;
                if (item.cat === 'Loose Oil') {
                    const mlMatch = selection.match(/(\d+)ml/);
                    const ml = mlMatch ? parseInt(mlMatch[1]) : 3;
                    const perMlPrice = rawPrice / 3;
                    itemPrice = (perMlPrice * ml) * itemQty;
                } else {
                    itemPrice = rawPrice * itemQty;
                }
                finalSubtotal += itemPrice;
            });
            finalDC = totalQty * dcPerProduct;
            finalTotal = finalSubtotal + finalDC;

            renderCartSummary(cartItems);
            updateBill(finalSubtotal, finalDC, finalTotal);

        } else {
            if (!productId) {
                window.location.href = 'index.html';
                return;
            }
            // One-time fetch for single product
            const prodSnap = await getDoc(doc(db, "products", productId));
            if (!prodSnap.exists()) throw new Error("Product not found");
            productData = prodSnap.data();

            const rawPrice = parseFloat(String(productData.price).replace(/[^\d.]/g, '')) || 0;
            let basePriceNum = 0;

            if (productData.cat === 'Loose Oil') {
                const mlMatch = (selection || "3ml").match(/(\d+)ml/);
                const ml = mlMatch ? parseInt(mlMatch[1]) : 3;
                const perMlPrice = rawPrice / 3;
                basePriceNum = (perMlPrice * ml) * qty;
            } else {
                basePriceNum = rawPrice * qty;
            }

            finalSubtotal = Math.round(basePriceNum);
            finalDC = dcPerProduct * qty;
            finalTotal = finalSubtotal + finalDC;

            renderSingleSummary(productData, selection, qty);
            updateBill(finalSubtotal, finalDC, finalTotal);
        }

        // Real-time listener for shop settings
        onSnapshot(doc(db, "shopInfo", "details"), (snap) => {
            if (snap.exists()) {
                shopData = snap.data();
            } else {
                shopData = {};
            }
            updatePaymentDetails();
        }, (err) => {
            console.error("Error loading shopInfo:", err);
            shopData = {}; // Ensure shopData is at least an empty object on error
            updatePaymentDetails(); // Resolution: fill with "not set" message
        });

    } catch (err) {
        console.error(err);
        showToast("Error loading checkout details.", "error");
    }

    // --- UI Helpers ---
    function renderSingleSummary(p, sel, q) {
        orderSummary.innerHTML = `
            <div class="checkout-item">
                <div class="item-img-wrap">
                    <img src="${p.url}" alt="${p.name}" onerror="this.src='assets/logo.png'; this.classList.add('placeholder');">
                </div>
                <div class="item-details">
                    <h4>${p.name}</h4>
                    <p>${p.cat} | ${sel || (q + ' Pcs')}</p>
                    <span class="item-price">${formatPrice(finalSubtotal)}</span>
                </div>
            </div>
        `;
    }

    function renderCartSummary(items) {
        orderSummary.innerHTML = items.map((p, index) => {
            const rawPrice = parseFloat(String(p.price || "0").replace(/[^\d.]/g, '')) || 0;
            let itemPrice = 0;
            const selection = p.selection || "";

            if (p.cat === 'Loose Oil') {
                const mlMatch = selection.match(/(\d+)ml/);
                const ml = mlMatch ? parseInt(mlMatch[1]) : 3;
                const perMlPrice = rawPrice / 3;
                itemPrice = perMlPrice * ml;
            } else {
                itemPrice = rawPrice * (parseInt(p.qty) || 1);
            }

            return `
                <div class="checkout-item" data-index="${index}">
                    <button type="button" class="btn-remove-item" title="Remove Item">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                    <div class="item-img-wrap">
                        <img src="${p.url}" alt="${p.name}" onerror="this.src='assets/logo.png'; this.classList.add('placeholder');">
                    </div>
                    <div class="item-details">
                        <h4>${p.name}</h4>
                        <p>${p.cat} | ${selection}</p>
                        <span class="item-price">${formatPrice(itemPrice)}</span>
                    </div>
                </div>
            `;
        }).join('');

        // Attach removal events
        orderSummary.querySelectorAll('.btn-remove-item').forEach(btn => {
            btn.onclick = (e) => {
                const index = parseInt(e.currentTarget.closest('.checkout-item').dataset.index);
                removeItem(index);
            };
        });
    }

    function removeItem(index) {
        if (!isCartMode) return;

        cartItems.splice(index, 1);
        localStorage.setItem('cart', JSON.stringify(cartItems));

        if (cartItems.length === 0) {
            window.location.href = 'index.html';
            return;
        }

        // Recalculate totals
        finalSubtotal = 0;
        let totalQty = 0;
        cartItems.forEach(item => {
            const rawPrice = parseFloat(String(item.price || "0").replace(/[^\d.]/g, '')) || 0;
            let itemPrice = 0;
            const selection = item.selection || "";
            const itemQty = parseInt(item.qty) || 1;
            totalQty += itemQty;
            if (item.cat === 'Loose Oil') {
                const mlMatch = selection.match(/(\d+)ml/);
                const ml = mlMatch ? parseInt(mlMatch[1]) : 3;
                const perMlPrice = rawPrice / 3;
                itemPrice = (perMlPrice * ml) * itemQty;
            } else {
                itemPrice = rawPrice * itemQty;
            }
            finalSubtotal += itemPrice;
        });
        finalDC = totalQty * dcPerProduct;
        finalTotal = finalSubtotal + finalDC;

        renderCartSummary(cartItems);
        updateBill(finalSubtotal, finalDC, finalTotal);
        updatePaymentDetails();
        showToast("Item removed from cart");
    }

    function updateBill(sub, dc, total) {
        subtotalEl.textContent = formatPrice(sub);
        dcEl.textContent = formatPrice(dc);
        totalEl.textContent = formatPrice(total);
    }

    function updatePaymentDetails() {
        const methodKey = selectedPaymentMethod.toLowerCase();
        const accInfo = shopData[methodKey] || "";

        paymentInstructions.innerHTML = `
            <p style="font-size: 0.9rem; color: #666; margin-bottom: 10px;">Please transfer <strong>${formatPrice(finalTotal)}</strong> to the following account:</p>
            <div class="account-box">
                <div class="account-info">
                    <strong>${selectedPaymentMethod}</strong>
                    <p style="font-size: 0.85rem; margin: 5px 0; color: var(--gold); font-weight: 600;">
                        ${shopData.ownerName || shopData.name || 'BIN MAZHAR'} (ACCOUNT TITLE)
                    </p>
                    <span>${accInfo || "Account details not set yet. Please contact support in Admin Panel."}</span>
                </div>
                ${accInfo ? `
                <div style="display: flex; gap: 8px;">
                    <button type="button" class="btn-copy" data-copy="${accInfo}" title="Copy Account">
                        <i class="fas fa-copy"></i> Copy Account
                    </button>
                </div>` : ''}
            </div>
        `;

        // Handle Combined Copy & App Launch Logic
        const copyBtn = paymentInstructions.querySelector('.btn-copy');
        if (copyBtn) {
            copyBtn.onclick = () => {
                const text = copyBtn.getAttribute('data-copy');

                // 1. Copy to clipboard
                navigator.clipboard.writeText(text).then(() => {
                    // 2. Visual Feedback
                    const originalContent = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    showToast("Account copied!");
                    setTimeout(() => copyBtn.innerHTML = originalContent, 2000);
                }).catch(err => {
                    console.error("Copy failed:", err);
                    showToast("Failed to copy. Please copy manually.", "error");
                });
            };
        }
    }

    // --- Event Listeners ---
    paymentOpts.forEach(opt => {
        opt.onclick = () => {
            paymentOpts.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            selectedPaymentMethod = opt.getAttribute('data-method');
            updatePaymentDetails();
        };
    });

    // Upload Logic
    uploadBox.onclick = () => proofInput.click();

    proofInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showToast("File too large (Max 5MB)", "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            uploadedProofBase64 = event.target.result;
            imagePreview.src = uploadedProofBase64;
            previewContainer.style.display = 'block';
            uploadBox.querySelector('.upload-inner').style.display = 'none';
            checkFormValidity();
        };
        reader.readAsDataURL(file);
    };

    removeProofBtn.onclick = (e) => {
        e.stopPropagation();
        uploadedProofBase64 = null;
        imagePreview.src = '';
        previewContainer.style.display = 'none';
        uploadBox.querySelector('.upload-inner').style.display = 'block';
        proofInput.value = '';
        checkFormValidity();
    };

    function checkFormValidity() {
        const isReady = uploadedProofBase64 !== null;
        placeOrderBtn.disabled = !isReady;
    }

    // --- Submit Logic (Strict Merging) ---
    checkoutForm.onsubmit = async (e) => {
        e.preventDefault();

        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = 'Submitting Order...';

        const custName = document.getElementById('custName').value.trim();
        const custPhone = document.getElementById('custPhone').value.trim();
        const custAddress = document.getElementById('custAddress').value.trim();
        const custCity = document.getElementById('custCity').value.trim();

        // 1. Build new order items list
        const newItems = isCartMode ? cartItems.map(i => ({
            id: i.id,
            name: i.name,
            url: i.url,
            cat: i.cat,
            selection: i.selection,
            qty: i.qty,
            price: i.price
        })) : [{
            id: productId,
            name: productData.name,
            url: productData.url,
            cat: productData.cat,
            selection: selection || (qty + ' Pcs'),
            qty: qty,
            price: productData.price
        }];

        // 2. Persistent Save for convenience & smart checks
        localStorage.setItem('lastName', custName);
        localStorage.setItem('lastPhone', custPhone);
        localStorage.setItem('lastAddress', custAddress);
        localStorage.setItem('lastCity', custCity);

        try {
            // 3. Search for ELIGIBLE active order to MERGE
            // An order is eligible if status is Pending, Confirmed, or Processing
            const activeStatuses = ['Pending', 'Confirmed', 'Processing'];
            const q = query(collection(db, "orders"), where("custPhone", "==", custPhone));
            const snap = await getDocs(q);
            
            let existingOrder = null;
            snap.forEach(docSnap => {
                const data = docSnap.data();
                // STRICT CHECK: Name, Address, and City must match EXACTLY
                if (activeStatuses.includes(data.status) &&
                    data.custName === custName &&
                    data.custAddress === custAddress &&
                    data.custCity === custCity) {
                    existingOrder = { id: docSnap.id, ...data };
                }
            });

            if (existingOrder) {
                // --- SMART MERGE LOGIC ---
                console.log("Found existing order. Merging items...");
                let mergedItems = [...(existingOrder.items || [])];

                newItems.forEach(newItem => {
                    // Check if SAME product (id + selection) already exists
                    const match = mergedItems.find(mi => mi.id === newItem.id && mi.selection === newItem.selection);
                    if (match) {
                        match.qty = (parseInt(match.qty) || 0) + (parseInt(newItem.qty) || 1);
                        console.log(`Updated qty for ${newItem.name}`);
                    } else {
                        mergedItems.push(newItem);
                        console.log(`Added new item ${newItem.name}`);
                    }
                });

                // 4. Recalculate Totals for Merged Order
                let newSubtotal = 0;
                let newTotalQty = 0;
                mergedItems.forEach(item => {
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
                    newSubtotal += itemPrice;
                    newTotalQty += (parseInt(item.qty) || 1);
                });

                const newDC = newTotalQty * 200; // Recalculate delivery charges
                const newTotal = newSubtotal + newDC;

                // 5. Update Payment Proofs (Keep Multi-receipts)
                let updatedProofs = Array.isArray(existingOrder.paymentProof) 
                    ? [...existingOrder.paymentProof] 
                    : (existingOrder.paymentProof ? [existingOrder.paymentProof] : []);
                
                if (uploadedProofBase64) {
                    updatedProofs.push(uploadedProofBase64);
                }

                try {
                    await updateDoc(doc(db, "orders", existingOrder.id), {
                        items: mergedItems,
                        subtotal: newSubtotal,
                        deliveryCharges: newDC,
                        totalPrice: newTotal,
                        updatedAt: new Date(),
                        paymentProof: updatedProofs
                    });
                    showToast("Order merged with your previous active order!");
                    showSuccessModal(existingOrder.id);
                } catch (updateErr) {
                    console.warn("Merge failed (likely permissions), creating new order instead.");
                    // Fallback: Create as new order if update fails
                    await createNewOrder(custName, custPhone, custAddress, custCity, newItems);
                }

            } else {
                await createNewOrder(custName, custPhone, custAddress, custCity, newItems);
            }

        } catch (err) {
            console.error("Order process error:", err);
            showToast("Failed to process order. Try again.", "error");
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = 'Confirm Order & Submit Proof';
        }
    };

    async function createNewOrder(custName, custPhone, custAddress, custCity, items) {
        const orderData = {
            custName, custPhone, custAddress, custCity,
            items: items,
            productId: isCartMode ? (cartItems[0]?.id || '') : (productId || ''),
            productName: isCartMode ? (cartItems[0]?.name || 'Multi-item Order') : (productData.name || ''),
            productUrl: isCartMode ? (cartItems[0]?.url || '') : (productData.url || ''),
            selection: isCartMode ? `${items.length} Items in Cart` : (selection || (qty + ' Pcs')),
            subtotal: finalSubtotal,
            deliveryCharges: finalDC,
            totalPrice: finalTotal,
            paymentMethod: selectedPaymentMethod,
            paymentProof: uploadedProofBase64 ? [uploadedProofBase64] : [], // Start as array
            status: 'Pending',
            createdAt: new Date(),
            phone: custPhone,
            timestamp: new Date()
        };

        const docRef = await addDoc(collection(db, "orders"), orderData);
        showSuccessModal(docRef.id);
    }

    function showSuccessModal(orderId) {
        const modal = document.getElementById('order-success-modal');
        modal.style.display = 'flex';
        
        // Final UI State: Lock to RED and "Order Confirmed" to prevent double clicks
        placeOrderBtn.disabled = true;
        placeOrderBtn.classList.add('order-confirmed-state');
        placeOrderBtn.textContent = 'Order Confirmed! ✓';

        const custPhone = document.getElementById('custPhone').value.trim();
        document.getElementById('close-success').onclick = () => {
            if (isCartMode) localStorage.removeItem('cart'); // Clear cart after success
            localStorage.removeItem('checkoutMode');
            window.location.href = `track-order.html?phone=${custPhone}`;
        };
    }

    function showToast(msg, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> <span>${msg}</span>`;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('active'));
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }
});
