import { db, collection, onSnapshot, query, orderBy } from "./firebase-config.js";
import { initNavbar, formatPrice } from "./navbar.js";
import { initScrollReveal } from "./main.js";

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initCategoryPage();
});

function initCategoryPage() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const openBtn = document.getElementById('openSidebar');
    const closeBtn = document.getElementById('closeSidebar');

    if (openBtn && sidebar && overlay) {
        openBtn.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    const closeMenu = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    };

    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);

    const productGrid = document.getElementById('categoryProductGrid');
    const sidebarCatList = document.getElementById('sidebarCatList');
    const resultsInfo = document.getElementById('resultsInfo');
    const minPriceRange = document.getElementById('minPriceRange');
    const maxPriceRange = document.getElementById('maxPriceRange');
    const sliderTrack = document.getElementById('sliderTrack');
    const minPriceLabel = document.getElementById('minPriceLabel');
    const maxPriceLabel = document.getElementById('maxPriceLabel');
    const sortSelect = document.getElementById('sortSelect');
    const inStockCheck = document.getElementById('inStock');
    const onSaleCheck = document.getElementById('onSale');

    const urlParams = new URLSearchParams(window.location.search);
    let selectedCategory = urlParams.get('cat') || 'All';
    let initialSearch = urlParams.get('search') || '';

    let allProducts = [];
    let filteredProducts = [];
    let selectedBrand = 'All';
    let currentPage = 1;
    const productsPerPage = 12;

    const searchInput = document.getElementById('shopSearchInput');
    const searchBox = document.querySelector('.search-box');

    if (searchInput) {
        searchInput.value = initialSearch;
        searchInput.addEventListener('input', () => {
            currentPage = 1;
            applyFilters();
        });

        // Ensure mobile view search stays visible and doesn't use the expansion logic here
        // (Handled by CSS .shop-search .search-box)

        document.addEventListener('click', (e) => {
            if (!searchBox.contains(e.target) && !searchInput.value.trim()) {
                searchBox.classList.remove('active');
            }
        });

        // Ensure no suggestions box is active here (just in case from shared CSS)
        searchInput.addEventListener('input', () => {
            const suggestionsBox = document.getElementById('searchSuggestions');
            if (suggestionsBox) suggestionsBox.classList.remove('active');
        });
    }

    // --- Brands Dropdown Logic ---
    const brandsBtn = document.getElementById('brandsFilterBtn');
    const brandsDropdown = document.getElementById('brandsDropdown');

    if (brandsBtn && brandsDropdown) {
        brandsBtn.onclick = (e) => {
            brandsDropdown.classList.toggle('active');
            e.stopPropagation();
        };

        document.addEventListener('click', (e) => {
            if (!brandsDropdown.contains(e.target) && !brandsBtn.contains(e.target)) {
                brandsDropdown.classList.remove('active');
            }
        });
    }

    function populateBrands(products) {
        console.log("Debug Brands: Populating from", products.length, "products");
        if (!brandsDropdown) return;

        const brandSet = new Set();
        products.forEach(p => {
            const brandName = (p.brand || p.Brand || '').trim();
            if (brandName) {
                brandSet.add(brandName);
            }
        });

        const sortedBrands = Array.from(brandSet).sort();
        console.log("Debug Brands: Unique brands found:", sortedBrands);

        brandsDropdown.innerHTML = `<div class="brand-opt ${selectedBrand === 'All' ? 'active' : ''}" data-brand="All">All Brands</div>`;

        sortedBrands.forEach(brand => {
            const count = products.filter(p => {
                const pBrand = (p.brand || p.Brand || '').trim();
                return (selectedCategory === 'All' || p.cat === selectedCategory) && pBrand === brand;
            }).length;
            if (count > 0 || selectedCategory === 'All') {
                brandsDropdown.innerHTML += `
                <div class="brand-opt ${selectedBrand === brand ? 'active' : ''}" data-brand="${brand}">
                    ${brand} <span>(${count})</span>
                </div>
            `;
            }
        });

        brandsDropdown.querySelectorAll('.brand-opt').forEach(opt => {
            opt.onclick = () => {
                selectedBrand = opt.getAttribute('data-brand');
                brandsDropdown.classList.remove('active');
                brandsBtn.innerHTML = `<i class="fas fa-tags"></i> ${selectedBrand === 'All' ? 'Brands' : selectedBrand} <i class="fas fa-chevron-down"></i>`;
                applyFilters();
            };
        });
    }

    // --- Dual Slider Logic ---
    // ... (skipping some lines for brevity in replacement, but I will include them in actual call)
    function updateSliderTrack() {
        const minVal = parseInt(minPriceRange.value);
        const maxVal = parseInt(maxPriceRange.value);
        const maxRange = parseInt(maxPriceRange.max);

        const percent1 = (minVal / maxRange) * 100;
        const percent2 = (maxVal / maxRange) * 100;

        sliderTrack.style.left = percent1 + "%";
        sliderTrack.style.width = (percent2 - percent1) + "%";

        minPriceLabel.textContent = formatPrice(minVal);
        maxPriceLabel.textContent = formatPrice(maxVal);
    }

    function handleMinSlider() {
        if (parseInt(maxPriceRange.value) - parseInt(minPriceRange.value) < 10) {
            minPriceRange.value = parseInt(maxPriceRange.value) - 10;
        }
        updateSliderTrack();
        applyFilters();
    }

    function handleMaxSlider() {
        if (parseInt(maxPriceRange.value) - parseInt(minPriceRange.value) < 10) {
            maxPriceRange.value = parseInt(minPriceRange.value) + 10;
        }
        updateSliderTrack();
        applyFilters();
    }

    minPriceRange.addEventListener('input', handleMinSlider);
    maxPriceRange.addEventListener('input', handleMaxSlider);
    // -------------------------

    // 1. Listen for Products to build Categories List (Dymanic)
    onSnapshot(collection(db, "products"), (snapshot) => {
        const categorySet = new Set();
        snapshot.forEach(docSnap => {
            const p = docSnap.data();
            if (p.cat) categorySet.add(p.cat);
        });

        const sortedCats = Array.from(categorySet).sort();

        sidebarCatList.innerHTML = '';

        // Add "All" category first
        const allLi = document.createElement('li');
        allLi.textContent = 'All';
        allLi.className = selectedCategory === 'All' ? 'active' : '';
        allLi.addEventListener('click', () => {
            selectedCategory = 'All';
            updateActiveCategoryUI('All');
        });
        sidebarCatList.appendChild(allLi);

        // Add dynamic categories
        sortedCats.forEach(cat => {
            const li = document.createElement('li');
            li.textContent = cat;
            li.className = selectedCategory === cat ? 'active' : '';
            li.addEventListener('click', () => {
                selectedCategory = cat;
                updateActiveCategoryUI(cat);
            });
            sidebarCatList.appendChild(li);
        });
    });

    function updateActiveCategoryUI(catName) {
        document.querySelectorAll('.sidebar-cat-list li').forEach(el => {
            el.classList.remove('active');
            if (el.textContent === catName) {
                el.classList.add('active');
            }
        });
        currentPage = 1; // Reset to page 1 for new category
        updatePriceSliderRange();
        applyFilters();
        if (window.innerWidth <= 992) closeMenu();
    }

    function updatePriceSliderRange() {
        if (allProducts.length === 0) return;

        const catProducts = allProducts.filter(p => selectedCategory === 'All' || p.cat === selectedCategory);

        if (catProducts.length > 0) {
            const prices = catProducts.map(p => getNumericPrice(p));
            const maxVal = Math.max(...prices);

            minPriceRange.max = maxVal;
            maxPriceRange.max = maxVal;

            // Set handles back to extreme if they exceed new max
            if (parseInt(maxPriceRange.value) > maxVal || maxPriceRange.value == maxPriceRange.getAttribute('data-prev-max')) {
                maxPriceRange.value = maxVal;
            }
            if (parseInt(minPriceRange.value) > maxVal) {
                minPriceRange.value = 0;
            }

            maxPriceRange.setAttribute('data-prev-max', maxVal);
            updateSliderTrack();
        } else {
            // If no products in category, reset sliders
            minPriceRange.max = 0;
            maxPriceRange.max = 0;
            minPriceRange.value = 0;
            maxPriceRange.value = 0;
            updateSliderTrack();
        }
    }

    // 2. Fetch Products
    onSnapshot(query(collection(db, "products"), orderBy("createdAt", "desc")), (snapshot) => {
        allProducts = [];
        snapshot.forEach((docSnap) => {
            allProducts.push({ id: docSnap.id, ...docSnap.data() });
        });
        populateBrands(allProducts);
        updatePriceSliderRange();
        applyFilters();
    });

    const getNumericPrice = (p) => {
        if (!p || !p.price) return 0;
        return parseFloat(String(p.price).replace(/[^\d.]/g, '')) || 0;
    };

    function applyFilters(resetPage = true) {
        if (resetPage) currentPage = 1;

        const minPrice = parseInt(minPriceRange.value);
        const maxPrice = parseInt(maxPriceRange.value);
        const showInStock = inStockCheck.checked;
        const showOnSale = onSaleCheck.checked;
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

        filteredProducts = allProducts.filter(p => {
            const matchesCat = (selectedCategory === 'All' || p.cat === selectedCategory);
            const matchesBrand = (selectedBrand === 'All' || p.brand === selectedBrand);
            const pPrice = getNumericPrice(p);
            const matchesPrice = (pPrice >= minPrice && pPrice <= maxPrice);
            const matchesStock = showInStock ? (parseFloat(p.qty) > 0) : true;
            const matchesSale = showOnSale ? (p.onSale === true) : true;
            const matchesSearch = p.name.toLowerCase().includes(searchTerm) ||
                (p.cat && p.cat.toLowerCase().includes(searchTerm)) ||
                (p.brand && p.brand.toLowerCase().includes(searchTerm)) ||
                (p.subTitle && p.subTitle.toLowerCase().includes(searchTerm));

            return matchesCat && matchesBrand && matchesPrice && matchesStock && matchesSale && matchesSearch;
        });

        sortProducts();
        renderProducts();
        renderPagination();
    }

    function sortProducts() {
        const sortBy = sortSelect.value;
        if (sortBy === 'price-low') {
            filteredProducts.sort((a, b) => getNumericPrice(a) - getNumericPrice(b));
        } else if (sortBy === 'price-high') {
            filteredProducts.sort((a, b) => getNumericPrice(b) - getNumericPrice(a));
        }
    }

    function renderProducts() {
        productGrid.innerHTML = '';
        resultsInfo.textContent = `Showing ${filteredProducts.length} results`;

        if (filteredProducts.length === 0) {
            productGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">No products found matching your criteria.</p>';
            return;
        }

        // Pagination slicing
        const start = (currentPage - 1) * productsPerPage;
        const end = start + productsPerPage;
        const paginatedItems = filteredProducts.slice(start, end);

        paginatedItems.forEach(p => {
            const isManualSoldOut = p.availability === 'out';
            const isAutoSoldOut = parseFloat(p.qty) <= 0;
            const isSoldOut = isManualSoldOut || isAutoSoldOut;

            const pPrice = getNumericPrice(p);
            const productCard = document.createElement('div');
            productCard.className = `product-card reveal ${isSoldOut ? 'sold-out' : ''}`;
            productCard.innerHTML = `
                <div class="product-card-inner">
                    <div class="product-image-wrap">
                        <a href="product-details.html?id=${p.id}">
                            ${p.hot ? '<span class="badge hot">HOT</span>' : ''}
                            ${isSoldOut ? `<span class="badge sold-out" style="background: #e74c3c;">OUT OF STOCK</span>` : ''}
                            <img src="${p.url}" alt="${p.name}" onerror="this.src='assets/logo.png'; this.classList.add('placeholder');">
                        </a>
                    </div>
                    <div class="product-details">
                        <div class="product-header-row">
                            <span class="product-cat-name">${p.cat}</span>
                            <button class="add-to-cart-small" data-id="${p.id}" ${isSoldOut ? 'disabled' : ''}>
                                ${isSoldOut ? 'Sold' : '<i class="fas fa-cart-plus"></i>'}
                            </button>
                        </div>
                        
                        <div class="product-name-row">
                            <a href="product-details.html?id=${p.id}" class="product-link">
                                <h3 class="product-title">${p.name}</h3>
                            </a>
                        </div>

                        <p class="product-desc">${p.subTitle || ''}</p>
                        
                        <div class="product-footer-row">
                            <div class="product-price">${formatPrice(pPrice)}</div>
                            <div class="product-rating-box">
                                <span>${p.rating || '5'}</span>
                                <i class="fas fa-star"></i>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            productGrid.appendChild(productCard);
        });
        initScrollReveal();
    }

    function renderPagination() {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;

        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

        if (totalPages <= 1) return;

        // Previous Button
        if (currentPage > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'page-btn nav-btn';
            prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevBtn.onclick = () => {
                currentPage--;
                renderProducts();
                renderPagination();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
            paginationContainer.appendChild(prevBtn);
        }

        // Page Numbers (Sliding Window of 3 — always starts from currentPage)
        const startPage = currentPage;
        const endPage = Math.min(currentPage + 2, totalPages);

        for (let i = startPage; i <= endPage; i++) {
            const btn = document.createElement('button');
            btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            btn.textContent = i;
            btn.onclick = () => {
                currentPage = i;
                renderProducts();
                renderPagination();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
            paginationContainer.appendChild(btn);
        }

        // Ellipses if more pages exist
        if (endPage < totalPages) {
            const dots = document.createElement('span');
            dots.className = 'pagination-dots';
            dots.textContent = '...';
            dots.style.margin = '0 10px';
            dots.style.color = '#888';
            paginationContainer.appendChild(dots);
        }

        // Next Button
        if (currentPage < totalPages) {
            const nextBtn = document.createElement('button');
            nextBtn.className = 'page-btn nav-btn';
            nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextBtn.onclick = () => {
                currentPage++;
                renderProducts();
                renderPagination();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
            paginationContainer.appendChild(nextBtn);
        }
    }

    // UI Listeners
    const applyBtn = document.getElementById('applyFilterBtn');
    if (applyBtn) applyBtn.addEventListener('click', applyFilters);

    sortSelect.addEventListener('change', applyFilters);
    inStockCheck.addEventListener('change', applyFilters);
    onSaleCheck.addEventListener('change', applyFilters);
}
