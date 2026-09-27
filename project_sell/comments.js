/* =========================================================
   comments.js — Complete (main box + expand modal)
   ========================================================= */
(function () {
  "use strict";

  const WHATSAPP_NUMBER = "919999999999"; // ← replace with your number

  /* =========================================================
     1. MAIN COMMENT BOX (Send + WhatsApp)
     ========================================================= */
  (function initMainBox() {
    const form      = document.getElementById("singleCommentForm");
    const nameInput = document.getElementById("scbName");
    const textInput = document.getElementById("scbText");
    const feedback  = document.getElementById("scbFeedback");
    const waBtn     = document.getElementById("scbWhatsappBtn");

    if (!form) return;

    // Send
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = (nameInput?.value || "").trim();
      const text = (textInput?.value || "").trim();

      if (!name) {
        showFeedback(feedback, "Please enter your name.", "error");
        nameInput?.focus();
        return;
      }
      if (!text) {
        showFeedback(feedback, "Please write a comment.", "error");
        textInput?.focus();
        return;
      }

      saveComment(name, text);
      showFeedback(feedback, "✅ Thanks! Your comment has been sent.", "success");
      form.reset();
    });

    // WhatsApp
    if (waBtn) {
      waBtn.addEventListener("click", () => {
        const name = (nameInput?.value || "").trim();
        const text = (textInput?.value || "").trim();

        const message =
          `Hi Saif! 👋\n\n` +
          (name ? `Name: ${name}\n` : "") +
          (text ? `Message: ${text}\n` : `I'd like to leave a comment on your store.`) +
          `\nSent from Saif's Store.`;

        window.open(
          `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
          "_blank",
          "noopener,noreferrer"
        );
      });
    }
  })();

  /* =========================================================
     2. EXPAND → FULLSCREEN MODAL
     ========================================================= */
  (function initModal() {
    const expandBtn  = document.getElementById("scbExpandBtn");
    const modal      = document.getElementById("commentModal");
    const closeBtn   = document.getElementById("cmCloseBtn");
    const backdrop   = modal?.querySelector("[data-cm-close]");
    const modalForm  = document.getElementById("modalCommentForm");
    const cmName     = document.getElementById("cmName");
    const cmText     = document.getElementById("cmText");
    const cmFeedback = document.getElementById("cmFeedback");
    const cmWaBtn    = document.getElementById("cmWhatsappBtn");

    const mainName   = document.getElementById("scbName");
    const mainText   = document.getElementById("scbText");

    if (!modal) return;

    function openModal() {
      if (cmName && mainName) cmName.value = mainName.value;
      if (cmText && mainText) cmText.value = mainText.value;
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      setTimeout(() => cmName?.focus(), 250);
    }

    function closeModal() {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    if (expandBtn) expandBtn.addEventListener("click", openModal);
    if (closeBtn)  closeBtn.addEventListener("click", closeModal);
    if (backdrop)  backdrop.addEventListener("click", closeModal);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
    });

    if (modalForm) {
      modalForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = (cmName?.value || "").trim();
        const text = (cmText?.value || "").trim();

        if (!name) {
          showFeedback(cmFeedback, "Please enter your name.", "error");
          cmName?.focus();
          return;
        }
        if (!text) {
          showFeedback(cmFeedback, "Please write a comment.", "error");
          cmText?.focus();
          return;
        }

        saveComment(name, text);
        showFeedback(cmFeedback, "✅ Thanks! Your comment has been sent.", "success");
        modalForm.reset();
        setTimeout(closeModal, 1400);
      });
    }

    if (cmWaBtn) {
      cmWaBtn.addEventListener("click", () => {
        const name = (cmName?.value || "").trim();
        const text = (cmText?.value || "").trim();

        const message =
          `Hi Saif! 👋\n\n` +
          (name ? `Name: ${name}\n` : "") +
          (text ? `Message: ${text}\n` : `I'd like to leave a comment on your store.`) +
          `\nSent from Saif's Store.`;

        window.open(
          `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
          "_blank",
          "noopener,noreferrer"
        );
      });
    }
  })();

  /* =========================================================
     SHARED HELPERS
     ========================================================= */
  function saveComment(name, text) {
    try {
      const KEY = "saif_store_general_comments_v1";
      const list = JSON.parse(localStorage.getItem(KEY) || "[]");
      list.push({ name, text, date: new Date().toISOString() });
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (err) {
      console.warn("Could not save comment:", err);
    }
  }

  function showFeedback(el, message, type) {
    if (!el) return;
    el.textContent = message;
    el.className = "scb-feedback " + type;
    setTimeout(() => {
      el.textContent = "";
      el.className = "scb-feedback";
    }, 3500);
  }
})();