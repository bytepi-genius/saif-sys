(function () {
  "use strict";

  /* =========================================================
     CONFIG
     ========================================================= */
  const WHATSAPP_NUMBER = "+916205058934"; // ← your number
  const JSON_PATH = "./details.json";
  const ASSETS_BASE_PATH = "./assets/";
  const MIN_PHOTOS = 5;
  const MAX_PHOTOS = 20;
  const DESC_CLAMP_LENGTH = 120; // chars above this → "Read more"

  /* =========================================================
     DOM
     ========================================================= */
  const appContent = document.getElementById("appContent");
  const headerWhatsappBtn = document.getElementById("headerWhatsappBtn");

  // Lightbox
  const lightbox   = document.getElementById("lightbox");
  const lbImage    = document.getElementById("lbImage");
  const lbCounter  = document.getElementById("lbCounter");
  const lbCaption  = document.getElementById("lbCaption");
  const lbClose    = document.getElementById("lbClose");
  const lbPrev     = document.getElementById("lbPrev");
  const lbNext     = document.getElementById("lbNext");
  const lbStage    = document.getElementById("lbStage");

  /* =========================================================
     STATE
     ========================================================= */
  let productsData = [];
  let lbItems = [];
  let lbIndex = 0;

  /* =========================================================
     UTILITIES
     ========================================================= */
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatPrice(price) {
    if (price === null || price === undefined || price === "") {
      return { display: "Ask for price", hasCurrency: false };
    }
    const str = String(price).trim();
    if (/[₹$€£¥]/.test(str)) return { display: str, hasCurrency: true };
    if (/^[\d,]+(\.\d+)?$/.test(str)) return { display: "₹" + str, hasCurrency: true };
    return { display: str, hasCurrency: false };
  }

  function resolvePhotoPath(photo) {
    if (!photo || typeof photo !== "string" || photo.trim() === "") return null;
    const t = photo.trim();
    if (/^(https?:|data:)/i.test(t)) return t;
    if (t.startsWith("./") || t.startsWith("/")) return t;
    if (t.toLowerCase().startsWith("assets/")) return t;
    return ASSETS_BASE_PATH + t;
  }

  /* =========================================================
     WHATSAPP
     ========================================================= */
  function buildProductWhatsAppLink(product) {
    const name = product.name || "this product";
    const price = product.price ? `Price: ${product.price}` : "";
    const desc = product.description
      ? `Details: ${String(product.description).slice(0, 140)}${
          String(product.description).length > 140 ? "…" : ""
        }`
      : "";
    const id = product.id ? `(Ref: ${product.id})` : "";
    const message =
      `Hi Saif! 👋\n\n` +
      `I'm interested in *${name}* ${id}\n` +
      (price ? `${price}\n` : "") +
      (desc ? `${desc}\n` : "") +
      `\nCould you share more details and availability?`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  function buildGenericWhatsAppLink() {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      `Hi Saif! 👋\n\nI'm browsing your store and would like to know more about your products.`
    )}`;
  }

  function openWhatsApp(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (headerWhatsappBtn) {
    headerWhatsappBtn.addEventListener("click", () => {
      openWhatsApp(buildGenericWhatsAppLink());
    });
  }

  /* =========================================================
     COPY LINK + SHARE
     ========================================================= */
  function buildProductShareUrl(product, index) {
    const base = window.location.origin + window.location.pathname;
    return `${base}#product-${encodeURIComponent(product.id || "p-" + index)}`;
  }

  async function copyProductLink(product, index, btnEl) {
    const url = buildProductShareUrl(product, index);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const tmp = document.createElement("textarea");
        tmp.value = url;
        tmp.style.position = "fixed";
        tmp.style.opacity = "0";
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand("copy");
        document.body.removeChild(tmp);
      }
      flashButton(btnEl, "Copied!", "fa-check");
    } catch (err) {
      console.warn("Copy failed:", err);
      flashButton(btnEl, "Failed", "fa-times");
    }
  }

  async function shareProduct(product, index, btnEl) {
    const url = buildProductShareUrl(product, index);
    const title = product.name || "Check this out";
    const text = `${title} — Saif's Store`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        // User cancelled
      }
    } else {
      copyProductLink(product, index, btnEl);
    }
  }

  function flashButton(btnEl, message, iconClass) {
    if (!btnEl) return;
    const original = btnEl.innerHTML;
    btnEl.innerHTML = `<i class="fas ${iconClass}"></i> ${message}`;
    btnEl.classList.add("flashed");
    setTimeout(() => {
      btnEl.innerHTML = original;
      btnEl.classList.remove("flashed");
    }, 1500);
  }

  /* =========================================================
     NORMALIZE PHOTOS
     ========================================================= */
  function normalizePhotos(product) {
    let photos = product.photos || product.images || product.image || [];
    if (!Array.isArray(photos)) photos = [photos];

    photos = photos
      .map((p) => resolvePhotoPath(p))
      .filter((p) => p !== null);

    if (photos.length > MAX_PHOTOS) {
      console.warn(`⚠️ "${product.name}" has ${photos.length} photos — trimming to ${MAX_PHOTOS}`);
      photos = photos.slice(0, MAX_PHOTOS);
    }

    const tooFew = photos.length < MIN_PHOTOS;
    if (tooFew) {
      console.warn(`⚠️ "${product.name}" has ${photos.length} photos (min ${MIN_PHOTOS})`);
    }

    if (photos.length === 0) return { photos: [null], tooFew: true };
    return { photos, tooFew };
  }

  /* =========================================================
     CREATE PRODUCT CARD
     ========================================================= */
  function createProductCard(product, index) {
    const normalized = normalizePhotos(product);
    const photos = normalized.photos;
    const tooFewPhotos = normalized.tooFew;
    const totalPhotos = photos.length;

    const title = escapeHtml(product.name || "Untitled Product");
    const rawDescription = product.description || "No description available for this product.";
    const description = escapeHtml(rawDescription);
    const isLongDescription = rawDescription.length > DESC_CLAMP_LENGTH;
    const priceInfo = formatPrice(product.price);

    /* ---- big preview ---- */
    const firstPhoto = photos[0];
    const previewHtml = firstPhoto
      ? `<img src="${escapeHtml(firstPhoto)}"
              alt="${title} — preview"
              loading="lazy"
              onerror="this.onerror=null;this.parentElement.innerHTML='<div class=\\'img-fallback\\'><i class=\\'fas fa-image\\'></i><span>Image not found</span></div>';">`
      : `<div class="img-fallback"><i class="fas fa-image"></i><span>No image</span></div>`;

    /* ---- 40×40 thumbnails ---- */
    let thumbsHtml = "";
    photos.forEach((photo, i) => {
      if (photo === null) {
        thumbsHtml += `
          <button class="gallery-thumb${i === 0 ? " active" : ""}"
                  data-thumb-index="${i}"
                  aria-label="Photo ${i + 1}">
            <div class="thumb-fallback"><i class="fas fa-image"></i></div>
          </button>`;
      } else {
        const safeSrc = escapeHtml(photo);
        thumbsHtml += `
          <button class="gallery-thumb${i === 0 ? " active" : ""}"
                  data-thumb-index="${i}"
                  data-full-src="${safeSrc}"
                  aria-label="Photo ${i + 1}">
            <img src="${safeSrc}"
                 alt="${title} — thumb ${i + 1}"
                 loading="lazy"
                 onerror="this.onerror=null;this.parentElement.innerHTML='<div class=\\'thumb-fallback\\'><i class=\\'fas fa-image\\'></i></div>';">
          </button>`;
      }
    });

    /* ---- counter ---- */
    const counterHtml =
      totalPhotos > 1
        ? `<div class="img-counter"><span data-counter>1</span> / ${totalPhotos}</div>`
        : "";

    /* ---- warning badge ---- */
    const warningHtml = tooFewPhotos
      ? `<div class="photo-warning" title="Fewer than ${MIN_PHOTOS} photos">
           <i class="fas fa-exclamation-triangle"></i>
           <span>${totalPhotos}/${MIN_PHOTOS} photos</span>
         </div>`
      : "";

    /* ---- price ---- */
    const priceHtml = priceInfo.hasCurrency
      ? `<span class="price-tag">${escapeHtml(priceInfo.display)}</span>`
      : `<span class="price-tag"><small>${escapeHtml(priceInfo.display)}</small></span>`;

    /* ---- description + read more ---- */
    const descHtml = `
      <p class="product-desc${isLongDescription ? " clamp" : ""}" data-desc>${description}</p>
      ${
        isLongDescription
          ? `<button type="button" class="desc-toggle" data-desc-toggle>
               <span>Read more</span>
               <i class="fas fa-chevron-down"></i>
             </button>`
          : ""
      }`;

    return `
      <article class="product-card" data-card-index="${index}"
               id="product-${escapeHtml(product.id || "p-" + index)}"
               style="animation-delay:${Math.min(index * 60, 400)}ms">
        <div class="gallery-container" data-gallery>
          <div class="gallery-preview" data-preview>
            ${previewHtml}
          </div>

          <div class="gallery-thumbs" data-thumbs>
            ${thumbsHtml}
          </div>

          ${counterHtml}
          ${warningHtml}
        </div>

        <div class="product-info">
          <h2 class="product-title">${title}</h2>

          ${descHtml}

          <div class="price-row">${priceHtml}</div>

          <div class="action-row">
            <button class="wa-product-btn" data-wa-index="${index}">
              <i class="fab fa-whatsapp"></i> WhatsApp
            </button>

            <div class="mini-actions">
              <button class="mini-btn copy-btn" data-copy-index="${index}" aria-label="Copy link">
                <i class="fas fa-link"></i> Copy
              </button>
              <button class="mini-btn share-btn" data-share-index="${index}" aria-label="Share">
                <i class="fas fa-share-alt"></i> Share
              </button>
            </div>
          </div>
        </div>
      </article>`;
  }

  /* =========================================================
     RENDER
     ========================================================= */
  function renderProducts(products) {
    if (!Array.isArray(products) || products.length === 0) {
      appContent.innerHTML = `
        <div class="state-container">
          <i class="fas fa-box-open"></i>
          <span class="state-title">No products yet</span>
          <span class="state-sub">The store is being stocked. Please check back soon!</span>
        </div>`;
      return;
    }

    productsData = products;
    let cardsHtml = "";
    products.forEach((p, i) => { cardsHtml += createProductCard(p, i); });
    appContent.innerHTML = `<div class="product-grid">${cardsHtml}</div>`;

    initGalleries();
    initActionButtons();
    initDescToggles();   // ✅ YE ADD KIYA — Read more kaam karega
  }

  /* =========================================================
     GALLERY — big preview + 40×40 thumbnails
     ========================================================= */
  function initGalleries() {
    document.querySelectorAll("[data-gallery]").forEach((gallery) => {
      const preview   = gallery.querySelector("[data-preview]");
      const thumbs    = gallery.querySelectorAll("[data-thumb-index]");
      const counterEl = gallery.querySelector("[data-counter]");
      if (!preview || !thumbs.length) return;

      let currentIndex = 0;

      function setActive(idx) {
        currentIndex = idx;
        thumbs.forEach((t, i) => t.classList.toggle("active", i === idx));

        const thumb = thumbs[idx];
        const fullSrc = thumb.getAttribute("data-full-src");

        if (fullSrc) {
          preview.innerHTML = `<img src="${fullSrc}" alt="Preview ${idx + 1}" loading="lazy">`;
        } else {
          preview.innerHTML = `<div class="img-fallback"><i class="fas fa-image"></i><span>No image</span></div>`;
        }

        if (counterEl) counterEl.textContent = String(idx + 1);

        thumb.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }

      thumbs.forEach((thumb) => {
        thumb.addEventListener("click", (e) => {
          e.stopPropagation();
          const idx = parseInt(thumb.getAttribute("data-thumb-index"), 10);
          setActive(idx);
        });
      });

      preview.addEventListener("click", () => {
        const items = [];
        thumbs.forEach((t) => {
          const src = t.getAttribute("data-full-src");
          if (src) items.push({ src, alt: "Product image" });
        });
        if (!items.length) return;

        const title =
          gallery.closest(".product-card")?.querySelector(".product-title")?.textContent || "";
        openLightbox(items, currentIndex, title);
      });

      setActive(0);
    });
  }

  /* =========================================================
     DESCRIPTION EXPAND/COLLAPSE
     ========================================================= */
  function initDescToggles() {
    const buttons = document.querySelectorAll("[data-desc-toggle]");
    console.log("🔍 Read more buttons found:", buttons.length); // debug

    buttons.forEach((btn) => {
      // Prevent double-wiring
      if (btn.dataset.wired === "1") return;
      btn.dataset.wired = "1";

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const card = btn.closest(".product-card");
        const desc = card ? card.querySelector("[data-desc]") : null;
        if (!desc) return;

        const isOpen = desc.classList.toggle("expanded");
        desc.classList.toggle("clamp", !isOpen);

        const span = btn.querySelector("span");
        const icon = btn.querySelector("i");
        if (span) span.textContent = isOpen ? "Show less" : "Read more";
        if (icon) {
          icon.classList.toggle("fa-chevron-down", !isOpen);
          icon.classList.toggle("fa-chevron-up", isOpen);
        }
      });
    });
  }

  /* =========================================================
     ACTION BUTTONS — WhatsApp, Copy, Share
     ========================================================= */
  function initActionButtons() {
    // WhatsApp
    document.querySelectorAll("[data-wa-index]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const idx = parseInt(btn.getAttribute("data-wa-index"), 10);
        const product = productsData[idx];
        if (product) openWhatsApp(buildProductWhatsAppLink(product));
        else openWhatsApp(buildGenericWhatsAppLink());
      });
    });

    // Copy Link
    document.querySelectorAll("[data-copy-index]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const idx = parseInt(btn.getAttribute("data-copy-index"), 10);
        const product = productsData[idx];
        if (product) copyProductLink(product, idx, btn);
      });
    });

    // Share
    document.querySelectorAll("[data-share-index]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const idx = parseInt(btn.getAttribute("data-share-index"), 10);
        const product = productsData[idx];
        if (product) shareProduct(product, idx, btn);
      });
    });
  }

  /* =========================================================
     LIGHTBOX
     ========================================================= */
  function openLightbox(items, startIndex, title) {
    lbItems = items;
    lbIndex = startIndex;
    if (lbCaption) lbCaption.textContent = title || "";
    updateLightbox();
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lbImage) lbImage.src = "";
  }

  function updateLightbox() {
    if (!lbItems.length || !lbImage) return;
    const item = lbItems[lbIndex];
    lbImage.src = item.src;
    lbImage.alt = item.alt || "Product image";
    if (lbCounter) lbCounter.textContent = `${lbIndex + 1} / ${lbItems.length}`;
  }

  function nextLightbox() {
    if (!lbItems.length) return;
    lbIndex = (lbIndex + 1) % lbItems.length;
    updateLightbox();
  }

  function prevLightbox() {
    if (!lbItems.length) return;
    lbIndex = (lbIndex - 1 + lbItems.length) % lbItems.length;
    updateLightbox();
  }

  if (lbClose) lbClose.addEventListener("click", closeLightbox);
  if (lbNext)  lbNext.addEventListener("click", (e) => { e.stopPropagation(); nextLightbox(); });
  if (lbPrev)  lbPrev.addEventListener("click", (e) => { e.stopPropagation(); prevLightbox(); });

  if (lightbox) {
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox || e.target === lbStage) closeLightbox();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowRight") nextLightbox();
    else if (e.key === "ArrowLeft") prevLightbox();
  });

  // Swipe on mobile
  let touchStartX = 0;
  if (lbStage) {
    lbStage.addEventListener("touchstart", (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    lbStage.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) {
        if (dx < 0) nextLightbox();
        else prevLightbox();
      }
    }, { passive: true });
  }

  /* =========================================================
     DEEP LINK — open product from #product-xxx
     ========================================================= */
  function handleHashScroll() {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith("#product-")) return;
    const el = document.querySelector(hash);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("highlighted");
        setTimeout(() => el.classList.remove("highlighted"), 2000);
      }, 300);
    }
  }

  /* =========================================================
     LOAD JSON
     ========================================================= */
  async function loadProducts() {
    try {
      const res = await fetch(JSON_PATH, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
      const data = await res.json();

      let products = [];
      if (Array.isArray(data)) products = data;
      else if (data && Array.isArray(data.products)) products = data.products;
      else if (data && typeof data === "object") products = [data];
      else throw new Error("Unsupported JSON structure");

      renderProducts(products);
      handleHashScroll();
    } catch (err) {
      console.error("Failed to load products:", err);
      appContent.innerHTML = `
        <div class="state-container error">
          <i class="fas fa-exclamation-triangle"></i>
          <span class="state-title">Could not load products</span>
          <span class="state-sub">
            ${escapeHtml(err.message)}<br><br>
            Make sure <strong>details.json</strong> is next to this HTML file, and that you
            serve the page via a local server (not <code>file://</code>).
          </span>
        </div>`;
    }
  }

  loadProducts();
})();