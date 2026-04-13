import { db, collection, onSnapshot, query, orderBy, doc, getDoc, setDoc, updateDoc, increment } from "./firebase-config.js";
import { initNavbar } from "./navbar.js";

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initHeroSlideshow();
    initCategoryGrid();
    initShopInfo();
    trackVisitor();
});

async function trackVisitor() {
    try {
        const hasVisited = sessionStorage.getItem('bin_mazhar_visited');
        if (hasVisited) return;

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

        // 1. Update Total Visitors
        const totalRef = doc(db, "stats", "visitors");
        await setDoc(totalRef, { total: increment(1) }, { merge: true });

        // 2. Update Daily Visitors
        const dailyRef = doc(db, "stats", `daily_${dateStr}`);
        await setDoc(dailyRef, { count: increment(1), date: dateStr }, { merge: true });

        sessionStorage.setItem('bin_mazhar_visited', 'true');
    } catch (e) {
        console.error("Visitor tracking failed:", e);
    }
}


function initCategoryGrid() {
    const container = document.getElementById('categoryContainer');
    if (!container) return;

    // Real-time categories from Products in Firebase
    onSnapshot(collection(db, "products"), (snapshot) => {
        const categories = {}; // { catName: { url: imageUrl, count: number } }
        snapshot.forEach(docSnap => {
            const p = docSnap.data();
            if (p.cat) {
                if (!categories[p.cat]) {
                    categories[p.cat] = { url: p.url || 'assets/logo.png', count: 1 };
                } else {
                    categories[p.cat].count++;
                }
            }
        });

        container.innerHTML = '';
        Object.entries(categories).forEach(([catName, data]) => {
            const div = document.createElement('div');
            div.className = 'category-item reveal';

            // Handle potentially broken or missing URLs
            const imgUrl = data.url || 'assets/logo.png';
            const isPlaceholder = !data.url;

            div.innerHTML = `
                <a href="category.html?cat=${encodeURIComponent(catName)}" style="display: block; width: 100%; text-decoration: none; color: inherit;">
                    <div class="category-circle">
                        <img src="${imgUrl}" alt="${catName}" class="${isPlaceholder ? 'placeholder' : ''}" onerror="this.src='assets/logo.png'; this.classList.add('placeholder');">
                    </div>
                    <div class="category-info-footer">
                        <div class="category-badge">${catName}</div>
                        <div class="category-count">${data.count} products</div>
                    </div>
                </a>
            `;
            container.appendChild(div);
        });
        initScrollReveal();
    });
}

function initHeroSlideshow() {
    const slides = document.querySelectorAll('.hero-slide');
    if (slides.length === 0) return;

    let images = [];
    let currentIndex = 0;
    let activeSlideIndex = 0;
    let slideInterval;
    const overlay = 'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4))';
    const defaultImage = 'https://pk.afnan.com/cdn/shop/files/Historic_Sahara_5642c111-a129-450b-975d-aa3fcbbf0713.png?v=1764054794&width=1000';

    function changeBackground() {
        if (images.length === 0) {
            let img = defaultImage;
            slides[0].style.backgroundImage = `${overlay}, url('${img}')`;
            slides[0].classList.add('active');
            return;
        }

        let nextImage = images[currentIndex];
        // Ensure https:// protocol if missing and not a data URI
        if (nextImage && !nextImage.startsWith('http') && !nextImage.startsWith('data:')) {
            nextImage = 'https://' + nextImage;
        }

        const nextSlideIndex = (activeSlideIndex + 1) % slides.length;

        // 1. Set next image on INACTIVE slide (next one)
        slides[nextSlideIndex].style.backgroundImage = `${overlay}, url('${nextImage}')`;

        // 2. Cross-fade
        // Remove active class from CURRENT slide to fade it out
        slides[activeSlideIndex].classList.remove('active');
        // Add active class to NEXT slide to fade it in
        slides[nextSlideIndex].classList.add('active');

        // 3. Update indices
        activeSlideIndex = nextSlideIndex;
        currentIndex = (currentIndex + 1) % images.length;
    }

    function startSlideshow() {
        if (slideInterval) clearInterval(slideInterval);

        // Reset state for new image set
        activeSlideIndex = 0;
        slides.forEach(s => s.classList.remove('active'));

        if (images.length > 0) {
            changeBackground();
            if (images.length > 1) {
                slideInterval = setInterval(changeBackground, 8000); /* Increased to 8s for a slower, more cinematic feel */
            }
        } else {
            changeBackground();
        }
    }

    // Real-time Hero Images from Firebase
    onSnapshot(query(collection(db, "heroImages"), orderBy("createdAt", "asc")), (snapshot) => {
        const newImages = [];
        snapshot.forEach((docSnap) => {
            newImages.push(docSnap.data().url);
        });

        // Only restart if the images set changed
        if (JSON.stringify(newImages) !== JSON.stringify(images)) {
            images = newImages;
            currentIndex = 0;
            startSlideshow();
        }
    });
}

async function initShopInfo() {
    function ensureAbsoluteUrl(url) {
        if (!url) return '';
        const trimmed = url.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
        return `https://${trimmed}`;
    }

    try {
        const docSnap = await getDoc(doc(db, "shopInfo", "details"));
        if (docSnap.exists()) {
            const data = docSnap.data();

            // Populate contact fields
            const addressEl = document.getElementById('web-shop-address');
            const phoneEl = document.getElementById('web-shop-phone');
            const emailEl = document.getElementById('web-shop-email');

            if (addressEl) addressEl.textContent = data.address || 'Address not set';
            if (phoneEl) phoneEl.textContent = data.phone || 'Contact not set';
            if (emailEl) emailEl.textContent = data.email || 'Email not set';

            // Populate Social Links
            const socialContainer = document.getElementById('dynamic-social-links');
            if (socialContainer) {
                socialContainer.innerHTML = '';

                // Helper to extract username for Instagram deep links
                const getIgUser = (url) => {
                    if (!url) return '';
                    const match = url.match(/(?:instagram\.com\/|instagr\.am\/|_u\/)([a-zA-Z0-9_\-\.]+)/i);
                    return match ? match[1] : '';
                };

                if (data.facebook) {
                    socialContainer.innerHTML += `<a href="${ensureAbsoluteUrl(data.facebook)}" target="_blank" title="Facebook"><i class="fab fa-facebook-f"></i></a>`;
                }
                if (data.instagram) {
                    const igUser = getIgUser(data.instagram);
                    const igUrl = igUser ? `https://www.instagram.com/_u/${igUser}/` : ensureAbsoluteUrl(data.instagram);
                    socialContainer.innerHTML += `<a href="${igUrl}" target="_blank" title="Instagram"><i class="fab fa-instagram"></i></a>`;
                }
                if (data.tiktok) {
                    socialContainer.innerHTML += `<a href="${ensureAbsoluteUrl(data.tiktok)}" target="_blank" title="TikTok"><i class="fab fa-tiktok"></i></a>`;
                }
            }
        }
    } catch (e) {
        if (e.code === 'permission-denied') {
            console.warn("Shop info access denied: Check Firebase Rules.");
        } else {
            console.error("Error loading shop info:", e);
        }
    }
}
export function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');

    // Intersection Observer with threshold 0 for immediate appearance
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            } else {
                // Remove class when scrolled away to allow re-triggering
                entry.target.classList.remove('active');
            }
        });
    }, {
        threshold: 0,
        rootMargin: "0px 0px -50px 0px" // Start appearing just before entering viewport
    });

    reveals.forEach(el => observer.observe(el));
}
