/**
 * fr-settings.js
 * Fresh Republic — Shared Settings Reader
 * Reads settings saved by the Admin Panel from localStorage
 * and applies them to whichever panel loads this script.
 */
(function() {
  const KEY = 'fr_admin_settings';

  function get() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch(e) { return {}; }
  }

  function applyAll() {
    const s = get();

    // ── 1. ACCENT COLOR ──────────────────────────────────────
    if (s.accentColor) {
      document.documentElement.style.setProperty('--accent',  s.accentColor);
      document.documentElement.style.setProperty('--a2',      s.accentColor);
      document.documentElement.style.setProperty('--abg',     hexToRgba(s.accentColor, 0.1));
      // Also patch any inline accent usages via CSS variable fallback
      const style = document.createElement('style');
      style.id = 'fr-accent-override';
      style.textContent = `:root { --accent: ${s.accentColor} !important; --a2: ${lighten(s.accentColor, 20)} !important; }`;
      // Remove old override if exists
      const old = document.getElementById('fr-accent-override');
      if (old) old.remove();
      document.head.appendChild(style);
    }

    // ── 2. ANNOUNCEMENT BANNER (customer site only) ────────
    const announce = document.querySelector('.announce, .topbar');
    if (announce) {
      if (s.bannerText) {
        // Update text content preserving any logo img at start
        const img = announce.querySelector('img');
        announce.innerHTML = (img ? img.outerHTML + ' ' : '') + escHtml(s.bannerText);
      }
      if (s.bannerBg) {
        announce.style.background = s.bannerBg;
      }
      if (s.bannerVisible === false) {
        announce.style.display = 'none';
      } else if (s.bannerVisible === true) {
        announce.style.display = '';
      }
    }

    // ── 3. BRAND NAME (page title + any .brand-name elements) ─
    if (s.brandName) {
      // Update <title> tag
      const title = document.querySelector('title');
      if (title) {
        title.textContent = title.textContent.replace(
          /Fresh Republic|FlashFit/gi, s.brandName
        );
      }
      // Update any element with data-brand-name attribute
      document.querySelectorAll('[data-brand-name]').forEach(el => {
        el.textContent = s.brandName;
      });
    }

    // ── 4. AI STYLIST NAME (customer site) ──────────────────
    if (s.aiName) {
      // Update AI panel header name
      const aiNameEl = document.querySelector('.ai-name');
      if (aiNameEl) {
        aiNameEl.textContent = `${s.aiName} — AI Fashion Stylist`;
      }
      // Update AI status
      const aiStatus = document.querySelector('.ai-status');
      if (aiStatus) {
        aiStatus.textContent = `● Online · Powered by Claude AI`;
      }
      // Update FAB tooltip
      const aiTip = document.querySelector('.ai-fab-tip');
      if (aiTip) aiTip.textContent = `${s.aiName} — AI Stylist`;
    }

    // ── 5. DISPLAY FONT ──────────────────────────────────────
    if (s.displayFont) {
      const fontMap = {
        'Bebas Neue': "'Bebas Neue', sans-serif",
        'Fraunces':   "'Fraunces', serif",
        'Syne':       "'Syne', sans-serif",
        'Clash Display': "'Clash Display', sans-serif",
      };
      const fontVal = fontMap[s.displayFont];
      if (fontVal) {
        const fontStyle = document.createElement('style');
        fontStyle.id = 'fr-font-override';
        fontStyle.textContent = `:root { --display: ${fontVal} !important; --serif: ${fontVal} !important; }`;
        const old = document.getElementById('fr-font-override');
        if (old) old.remove();
        document.head.appendChild(fontStyle);
      }
    }

    // ── 6. MAINTENANCE MODE ──────────────────────────────────
    if (s.featureToggles && s.featureToggles['Maintenance Mode'] === true) {
      // Only apply on non-admin pages
      if (!document.getElementById('adminApp')) {
        document.body.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#0b0b0f;color:#fff;font-family:sans-serif;text-align:center;padding:40px;">
            <div style="font-size:64px;margin-bottom:24px;">🔧</div>
            <div style="font-size:32px;font-weight:800;margin-bottom:12px;">${s.brandName || 'Fresh Republic'}</div>
            <div style="font-size:16px;color:#666;max-width:400px;line-height:1.7;">We're making some improvements. We'll be back shortly.<br/><br/><span style="font-size:12px;color:#444;">— The Team</span></div>
          </div>`;
        return; // stop further processing
      }
    }

    // ── 7. CORE SETTINGS (delivery SLA etc.) ─────────────────
    if (s.coreSettings) {
      // Expose as window globals for use by panels
      window.FR_SLA          = s.coreSettings.deliverySLA   || 60;
      window.FR_COMMISSION   = s.coreSettings.commissionRate || 10;
      window.FR_MIN_ORDER    = s.coreSettings.minOrder       || 499;
      window.FR_RETURN_MINS  = s.coreSettings.returnWindow   || 30;

      // Update any ETA display elements
      document.querySelectorAll('[data-eta]').forEach(el => {
        el.textContent = window.FR_SLA + ' minutes';
      });
    }

    // ── 8. FEATURE FLAGS ────────────────────────────────────
    if (s.featureToggles) {
      const flags = s.featureToggles;

      // AI Stylist visibility
      if (flags['AI Fashion Stylist'] === false) {
        const fab = document.querySelector('.ai-fab');
        const panel = document.querySelector('.ai-panel');
        const btn = document.querySelector('.ai-btn, .ai-nav-btn');
        if (fab) fab.style.display = 'none';
        if (panel) panel.style.display = 'none';
        if (btn) btn.style.display = 'none';
      }

      // COD visibility in checkout
      if (flags['Cash on Delivery'] === false) {
        document.querySelectorAll('[data-payment="cod"]').forEach(el => el.style.display = 'none');
      }

      // Try & Return badge
      if (flags['Try & Return'] === false) {
        document.querySelectorAll('[data-feature="try-return"]').forEach(el => el.style.display = 'none');
      }

      // 60-min guarantee badge
      if (flags['60-Min Guarantee Badge'] === false) {
        document.querySelectorAll('.hero-eyebrow, [data-feature="guarantee"]').forEach(el => el.style.display = 'none');
      }
    }
  }

  // ── HELPERS ────────────────────────────────────────────────
  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function lighten(hex, amount) {
    const r = Math.min(255, parseInt(hex.slice(1,3),16) + amount);
    const g = Math.min(255, parseInt(hex.slice(3,5),16) + amount);
    const b = Math.min(255, parseInt(hex.slice(5,7),16) + amount);
    return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── RUN ────────────────────────────────────────────────────
  // Run immediately if DOM ready, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAll);
  } else {
    applyAll();
  }

  // Also re-apply if admin updates settings in another tab
  window.addEventListener('storage', function(e) {
    if (e.key === 'fr_settings_ts') {
      applyAll();
    }
  });

  // Expose for manual re-application
  window.FR_applySettings = applyAll;
  window.FR_getSettings   = get;

})();
