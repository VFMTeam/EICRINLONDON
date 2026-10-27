(function () {
  "use strict";
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[c];
    });
  }
  function trackConversion(name, value, sendAds) {
    if (typeof window.gtag !== "function") return;
    var params = { event_category: "engagement" };
    if (typeof value === "number" && isFinite(value)) {
      params.value = value;
      params.currency = "GBP";
    }
    window.gtag("event", name, params);
    if (sendAds && EICR_DATA.adsId && EICR_DATA.adsLabel) {
      var conversion = {
        send_to: EICR_DATA.adsId + "/" + EICR_DATA.adsLabel,
        currency: "GBP",
      };
      if (typeof value === "number" && isFinite(value))
        conversion.value = value;
      window.gtag("event", "conversion", conversion);
    }
  }
  function setupConversionTracking() {
    document.addEventListener("click", function (e) {
      var link = e.target.closest("a");
      if (!link) return;
      var href = link.getAttribute("href") || "",
        kind = link.dataset.conversion || "";
      if (href.indexOf("tel:") === 0) kind = "phone_click";
      else if (href.indexOf("mailto:") === 0) kind = "email_click";
      else if (href.indexOf("wa.me/") > -1) kind = "whatsapp_click";
      if (kind) trackConversion(kind, null, false);
    });
  }
  function setupMobileMenu() {
    var toggle = document.querySelector('button[aria-label="Toggle menu"]'),
      desktop = document.querySelector("header nav");
    if (!toggle || !desktop) return;
    var mobile = document.createElement("nav");
    mobile.className = "eicr-mobile-nav";
    mobile.id = "eicr-mobile-nav";
    mobile.setAttribute("aria-label", "Mobile navigation");
    Array.from(desktop.children).forEach(function (item) {
      if (item.tagName === "A") {
        mobile.appendChild(item.cloneNode(true));
        return;
      }
      var primary = item.querySelector(":scope > a"),
        submenu = item.querySelector(":scope > div");
      if (!primary) return;
      var group = document.createElement("div");
      group.className = "eicr-mobile-group";
      var button = document.createElement("button");
      button.type = "button";
      button.className = "eicr-mobile-group-toggle";
      button.innerHTML =
        "<span>" +
        esc(primary.textContent.trim()) +
        '</span><span aria-hidden="true">⌄</span>';
      button.setAttribute("aria-expanded", "false");
      var links = document.createElement("div");
      links.className = "eicr-mobile-submenu";
      if (submenu)
        submenu.querySelectorAll("a").forEach(function (a) {
          links.appendChild(a.cloneNode(true));
        });
      button.addEventListener("click", function () {
        var open = group.classList.toggle("open");
        button.setAttribute("aria-expanded", open ? "true" : "false");
      });
      group.append(button, links);
      mobile.appendChild(group);
    });
    document.querySelector("header").appendChild(mobile);
    toggle.setAttribute("aria-controls", mobile.id);
    toggle.addEventListener("click", function () {
      var open = mobile.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    mobile.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        mobile.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }
  function setupReveal() {
    if (
      !("IntersectionObserver" in window) ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    var els = Array.from(
      document.querySelectorAll("main .animate-fade-up"),
    );
    var hero = document.querySelector("main section");
    if (hero && hero.getBoundingClientRect().top > innerHeight) hero = null;
    els = els.filter(function (el) {
      return !(hero && hero.contains(el));
    });
    els.forEach(function (el) {
      el.classList.add("eicr-scroll-reveal");
    });
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var el = entry.target;
            el.classList.add("eicr-scroll-visible");
            io.unobserve(el);
            setTimeout(function () {
              el.classList.remove("eicr-scroll-reveal", "eicr-scroll-visible");
            }, 700);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -35px 0px" },
    );
    els.forEach(function (el) {
      io.observe(el);
    });
  }
  function setupAjaxForms() {
    document
      .querySelectorAll(".eicr-form")
      .forEach(function (f) {
        f.addEventListener("submit", async function (e) {
          e.preventDefault();
          var o = f.querySelector(".eicr-response");
          if (o) o.textContent = "Sending…";
          try {
            var r = await fetch(EICR_DATA.ajax, {
                method: "POST",
                body: new FormData(f),
              }),
              d = await r.json();
            if (o)
              o.textContent = (d.data && d.data.message) || "Please try again.";
            if (d.success) {
              if (!(d.data && d.data.suppressed))
                trackConversion("quote_request", null, true);
              f.reset();
            }
          } catch {
            if (o) o.textContent = "Connection problem. Please try again.";
          }
        });
      });
  }
  function setupLogoVerify() {
    document.querySelectorAll(".logo-strip").forEach(function (strip) {
      var buttons = strip.querySelectorAll(".logo-niceic");
      function set(open) {
        strip.classList.toggle("is-open", open);
        buttons.forEach(function (b) {
          b.setAttribute("aria-expanded", String(open));
        });
      }
      buttons.forEach(function (b) {
        b.addEventListener("click", function () {
          set(!strip.classList.contains("is-open"));
        });
      });
      strip.addEventListener("pointerleave", function (e) {
        if (e.pointerType !== "touch") set(false);
      });
      document.addEventListener("click", function (e) {
        if (!strip.contains(e.target)) set(false);
      });
    });
  }
  document.addEventListener("DOMContentLoaded", function () {
    setupConversionTracking();
    setupMobileMenu();
    setupReveal();
    setupAjaxForms();
    setupLogoVerify();
  });
})();
