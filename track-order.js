import { db, collection, getDocs, query, where, orderBy } from "./firebase-config.js";
import { initNavbar, formatPrice } from "./navbar.js";

const TCS_LOGO = "data:image/png;base64,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";
const LCS_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJQAAACUCAMABC4vDmAAAAz1BMVEX/ygb///8dHBoAABv/yAD/zQX/0AT/0wP/xgAbGRrHng7/2QD/+Of/9+MUFhr/1QIZGRrHng7/3gALEBr/8tL/6bb/45r/3H//12T/1FL/zSn/9Nj/5aD/1F3/zz//+/D/78f/12v/3oj/4ZEACRqUdhOLbxSxjRC5kxDhtwruvgh5YRWBZxVwWhabfBKjghHUqQxpUxc2LhldSxdWRBhDNhlPPhgsJhnTrwslIBrzxwa9nA+Kci64nVmimobT1dfcsyWSgVZgSgCljBGvlhDGpg0YeqweAAAQHklEQVR4nM2cCXubOrPHqRUJ262xTHvaJmmTtoAWFgljMMH3vstN/f0/0x1JOIvjpO6WMM95cuoEix+jmf+M2LxXAzTvpQEO2W9CvX57+e6f9x8+nnonYN7pxw/v/3l3+fb1i0GdnX/59Nk7GZ/s2fjE+/zpy/nZc0NdXJ5/HI8NjnfQDNp4/PH88uLZoC6/fH4UZw/t85fL54C6/Go89GOiHdd4/PWnuX4O6uLbx+OBbsE+fvu5afwZqLOvR83aIayTrz8T98dDvflw+ktEPdfphzd/HOrs/fg3kCzW+P2x3joO6uKr95tIFsv7elxsHQX17ncm7h7W6bs/BPXmFzLuUaqTj0eE1o+hzv/EzN3B8s5/G+r1pz+KZLE+/ahe/wDq8k9F0z2q0x9o/NNQ3/5cNN2jOvn2y1AX78d/8E9f75fH75fH/5fPr//On79Pn+06ePz0P86U9Gkz8H9e3H86fTf8Lz5yf9P8Xz6U9C/Tp9un6Pns8+n//3T/p/C/Xt9On6LX0+0v89COrM2u36p98r9efz/v7/m/4Tz6ffA/X70/T99Pzn55P+70L9On26fnp+POn/LtS3H7/vT5/T53u0f7f3XOfzS8eE5/COrr3yuXp48Y/6gW3tUP/9w9qF+P9X8Cyg9p/B0pPwV1/vVvD6gvR8re1T+m3v+D++P6+TCoX6fP+9UfUsc/7u60X08fBfX758NfKpcnoPp8CHX29Wv90371h9Lx0/7o76h+Px0I9eY/Xw9SvevXv8v44UfVf3Vaf3Ue1NkfP06fp7+dnp5V9fPvY9W/f97v76iO/9796QOofj19mXp+9hGqv/52/jBU/Xry3P/+9On79An368nzX8fP0wnPv0+/f9Lvz6fPT8+f8L9Ov3/S7+/Tp+unX8fPX8//A8vEOnmHjPsvAAAAAElFTkSuQmCC";
const MNP_LOGO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNGg8PGjclHyU3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N//AABEIAJQAtgMBIgACEQEDEQH/xAAbAAEAAQUBAAAAAAAAAAAAAAAABgIDBAUHAf/EAEMQAAEEAQEFBAUGDAYDAAAAAAEAAgMEEQUGEhMhMUFRYXEHFIGRoSIyQrHB4hUXIyQzQ1JVcpKU0TaCpLLh8EVTYv/EABoBAQADAQEBAAAAAAAAAAAAAAABBAUGAwL/xAAqEQEAAQQABAMJAQAAAAAAAAAAAQIDBBEFITFBEoGhExQVMjNRUnGRYf/aAA0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000018GwbSjQpYmUv6Pd7CpCuvx0q38Sp98j+p+4s3R9uG6jqUFOShwBM7dEnH3sHHLlujyXOVcryur2Ip2fOieHjzByg7gCo5tLtW3QrkdYU/WHOj4hPF3d3mQB0Pct9WnbYrxTM+bIwOHkVyPae96/rtuYE7m/uN8m8kEn/GI4f8AiR/U/cXn4xT+6R/U/cUGQ9EE8h2/lnmZDDoxkkecNa2zkk/yKX0J7U0AfcrMryH9W2Xfx5nAUP8ARvp8Zjs33gGTe4TMjoMc/f8AYpjcsx060liXkyNpc4hRM6jcpiNzqGRlUSP3WOcBnAyoJL6QZeIeBp7DEDy3puZHu5LOp7b0bUZjuQyVXkEZzvt6d+PsVSM2xM6ipcnh+TTG5oYp9IT2kj8FA4OM+sfdXn4xHfur/UfcUJecvcfE9qpWNPEMjfzN+OFYsx8vrKcfjEd+6v8AUfcQekI5GdLwPCx91QdeqPiOR+Xon4Vi/j6y6Zp+2ul2yGzcSq8/+4cveFvbVkxU5LELWSbrN8AvwCMZ6gH6lxYHHRSFZPXXadYbTsHepTHdLXdI89o8O8K5jcTqqnw3P6oZfCIopmu1PknTtaex5jkqjiZZgNlyCDzJzjsC3AOVYNaB53jEwnHXdHh/Ye5XwtimJ7yw5mJ6Q9REX0+RERB44gDJOAOZKuubQWfU9FuWB1bE7HmeQXGx0CAiIg6JoWs8PYaackcWmx0Q/i+h9YXOx48z2lZUV2WPT56TT+Sme17vMZ/77FioCInVBPPRnbbwLlMkB7XCQeIPI/UPepfqFZtynNXd0kYW57shQHYXRbsluPVBJwIGEgEtyZR2geHiujKJjxRqUxMxO4cStV5KlmStO3dliduuCtLoO3ui+sQDUa7MyxDErQPnN7/YufLlsqxNm54ZS1XidXInERFWXE32a2W07U9Iht2eNxHZ+a/A5FY+0uyMenU326Ej3MZ8+N/PA7wVstk9c0ylokEFu5HHK3ey13ZzKsbWbVUrOnyUtOdxnSjD5AMNAW1VRje7bnW9OcpuZnveqd635aQVCAQc+1B0TJHRYvd0Xbm7Bs5Yda0KjM85e6IB3mOX2LaLUbKwmDZ6hG4YIizg+PP7Vt119nfs6d/Zwt3XtKtfeRERejzERCgirpGs8HQ2Qg/Knma3HeBzP1Bc0Uz9JdneuU6w/Vxuefaf8AhQzoguVoJLM7YYRl7ug8hlW856dFJNgKosbQCVwy2GJzvMkbv2lafWKpo6rbrO/VyuA8uo+GEGGg5nCLN0Sv63rNKA9HzNz5DmfgCgxHtcx7mPaQ5pw4HsPQhbZZXRPrOqthfngRjfl8RnkPaqtsavqu0VtvzWyESj/MP7qS+jGNvq2oSfSMrW+wDP2oJm1rImNa0Na1oAAHIABRmrtjWsa96i1jRVOWNsF3zn55cuwHv8lu9dLmaNddH88Qux7lxkdnh2oO4vaHNLXAEEYPiuVbV6MdH1F3Db+azfKiPd3t9n1KabGa5+FaHAnd+dVwA/P029jv7/8AK2OvaXHq2nSVn4BPNjv2XdhVTMx4vW/9XcHKnHu7npPVGNkdn9O1LRWWLcG/KXvaXBxGcHktZtxpVPS5ajKUZZxGuLsknOCMdVN9mdOdpWj16smOI0Fz8H6ROSoX6QrXG1qOEdIYR7ycn4AKjkWqbeJG45r2Hfru5vKqZp5ot3+KKQaNspa1Wg23DYhYx5IDXA5GFnDYG/23K/8AKVnU4d+qIqilr1Z+NRM0zVzhEVt9mtGk1m+GhuK0ZBmf4fs+ZUn07YGGN4ffuOmA+hG3cHvzlS6nUgpwCGtE2ONvRrRhXcbhtXiiq50Z2Xx9l";

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();

    const trackBtn = document.getElementById('track-btn');
    const phoneInput = document.getElementById('track-phone-input');
    const resultsArea = document.getElementById('tracking-results');
    const backBtn = document.getElementById('backBtn');

    if (backBtn) {
        backBtn.onclick = () => window.history.back();
    }

    if (!trackBtn) return;

    trackBtn.addEventListener('click', () => {
        const phone = phoneInput.value.trim();
        if (phone) {
            resultsArea.innerHTML = '<div class="tracking-loading">Tracking...</div>';

            const ordersRef = collection(db, "orders");
            // Use custPhone and remove orderBy to avoid composite index requirements
            const q = query(ordersRef, where("custPhone", "==", phone));

            getDocs(q).then((querySnapshot) => {
                if (querySnapshot.empty) {
                    resultsArea.innerHTML = '<div class="tracking-no-data">No orders found for this number.</div>';
                    return;
                }

                let orders = [];
                querySnapshot.forEach((doc) => {
                    orders.push({ id: doc.id, ...doc.data() });
                });

                // Client-side sorting by createdAt desc
                orders.sort((a, b) => {
                    const dateA = a.createdAt?.seconds || 0;
                    const dateB = b.createdAt?.seconds || 0;
                    return dateB - dateA;
                });

                let html = '';
                orders.forEach((order) => {
                    const status = order.status || 'Pending';
                    const timestamp = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';
                    const courier = order.courier || '';
                    const trackingId = order.trackingId || order.trackingNumber || '';
                    const courierLogo = getCourierLogo(courier);

                    html += `
                    <div class="order-tracking-card">
                        <div class="order-top">
                            <div>
                                <h3>Order #${order.id.slice(-6).toUpperCase()}</h3>
                                <span>Placed on: ${timestamp}</span>
                            </div>
                            <div class="status-badge status-${status.toLowerCase()}">${status}</div>
                        </div>
                        
                        <!-- Premium Timeline -->
                        ${renderTimeline(status)}

                        ${courier || trackingId ? `
                        <div class="courier-premium-box" style="margin-top: 30px; padding: 25px; background: #fbfbfb; border-radius: 12px; border: 1.5px solid #f0f0f0; text-align: center;">
                            <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 20px;">
                                ${courierLogo ? `<img src="${courierLogo}" style="height: 50px; width: auto; object-fit: contain;" onerror="this.style.display='none'">` : ''}
                                <h2 style="font-family: 'Outfit'; font-size: 1.8rem; margin: 0; color: #1a1a1a;">${courier || 'Standard Shipping'}</h2>
                            </div>
                            
                            ${trackingId ? `
                            <div class="tracking-id-display" style="margin-bottom: 25px;">
                                <p style="font-size: 0.85rem; color: #888; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Tracking Number</p>
                                <strong style="font-size: 1.4rem; color: var(--gold); letter-spacing: 2px;">${trackingId}</strong>
                            </div>
                            
                            <div style="display: flex; flex-direction: column; gap: 12px; align-items: center;">
                                <button onclick="copyAndTrack('${courier}', '${trackingId}')" class="btn-track-premium">
                                    <i class="fas fa-copy"></i> Copy & Track on Official Website
                                </button>
                                <small style="color: #888; font-size: 0.75rem;">One click copies number & opens official site</small>
                            </div>
                            ` : '<p style="color: #999; font-style: italic;">Tracking number will be updated soon.</p>'}
                        </div>
                        ` : ''}

                        <div class="order-summary" style="margin-top: 25px; display: flex; justify-content: space-between; align-items: flex-end;">
                            <div style="display: flex; gap: 15px;">
                                ${(order.items || []).slice(0, 3).map(item => `
                                    <img src="${item.url}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;">
                                `).join('')}
                                ${order.items && order.items.length > 3 ? `<div style="width: 50px; height: 50px; background: #eee; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700;">+${order.items.length - 3}</div>` : ''}
                            </div>
                            <div style="text-align: right;">
                                <p style="font-size: 0.85rem; color: #888;">Order Total</p>
                                <h4 style="color: var(--gold); font-size: 1.3rem; font-family: 'Outfit';">${formatPrice(order.totalPrice || 0)}</h4>
                            </div>
                        </div>

                        ${order.paymentProof ? `
                        <div style="margin-top: 20px; border-top: 1px solid #f5f5f5; padding-top: 20px;">
                            <p style="font-size: 0.85rem; color: #888; margin-bottom: 12px; font-weight: 500;">Payment Proof(s):</p>
                            <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                                ${(Array.isArray(order.paymentProof) ? order.paymentProof : [order.paymentProof]).map(proof => `
                                    <img src="${proof}" class="proof-thumbnail" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1.5px solid #eee;" onclick="showProofModal('${proof}')">
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    `;
                });
                resultsArea.innerHTML = html;
            }).catch((error) => {
                console.error("Error tracking order:", error);
                resultsArea.innerHTML = '<div class="tracking-error">Something went wrong. Please try again.</div>';
            });
        }
    });

    function renderTimeline(currentStatus) {
        const statuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];
        const currentIndex = statuses.indexOf(currentStatus);

        return `
        <div class="timeline">
            ${statuses.map((s, idx) => {
            const isActive = idx === currentIndex;
            const isCompleted = idx < currentIndex;
            let stateClass = '';
            if (isActive) stateClass = 'active';
            if (isCompleted) stateClass = 'completed';

            return `
                <div class="timeline-step ${stateClass}">
                    <div class="step-circle">
                        ${isCompleted ? '<i class="fas fa-check"></i>' : (idx + 1)}
                    </div>
                    <div class="step-label">${s}</div>
                </div>
                `;
        }).join('')}
        </div>
        `;
    }

    // Global Functions for buttons
    window.copyAndTrack = (courier, id) => {
        navigator.clipboard.writeText(id).then(() => {
            showToast("Tracking number copied! Opening website...");
            setTimeout(() => {
                let url = '';
                switch (courier) {
                    case 'TCS': url = `https://www.tcsexpress.com/tracking?track=${id}`; break;
                    case 'Leopards': url = `https://www.leopardscourier.com/tracking`; break;
                    case 'M&P': url = `https://www.mulphilog.com/tracking?track=${id}`; break;
                    default: url = `https://www.google.com/search?q=${courier}+tracking+${id}`;
                }
                window.open(url, '_blank');
            }, 800);
        });
    };

    window.copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            showToast("Tracking number copied!");
        });
    };

    window.openExternalTracking = (courier, id) => {
        let url = '';
        switch (courier) {
            case 'TCS': url = `https://www.tcsexpress.com/tracking?track=${id}`; break;
            case 'Leopards': url = `https://www.leopardscourier.com/tracking`; break;
            case 'M&P': url = `https://www.mulphilog.com/tracking?track=${id}`; break;
            default: url = `https://www.google.com/search?q=${courier}+tracking+${id}`;
        }
        window.open(url, '_blank');
    };

    window.showProofModal = (url) => {
        const modal = document.getElementById('proof-modal');
        const img = document.getElementById('proof-img');
        img.src = url;
        modal.classList.add('active');
    };

    function showToast(msg) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast success active';
        toast.innerHTML = `<i class="fas fa-check-circle"></i> ${msg}`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    function getCourierLogo(courier) {
        switch (courier) {
            case 'TCS': return TCS_LOGO;
            case 'Leopards': return LCS_LOGO;
            case 'M&P': return MNP_LOGO;
            default: return '';
        }
    }
});
