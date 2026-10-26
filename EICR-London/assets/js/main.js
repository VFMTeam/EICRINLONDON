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
      if (item.classList.contains("eicr-account-menu")) {
        var accountLink = primary.cloneNode(true);
        accountLink.classList.add("eicr-account-nav-mobile-row");
        mobile.appendChild(accountLink);
        return;
      }
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
  function setupAccountMenu() {
    document.querySelectorAll(".eicr-account-menu").forEach(function (menu) {
      var trigger = menu.querySelector(":scope > .eicr-account-nav-link"),
        popover = menu.querySelector(":scope > .eicr-account-popover");
      if (!trigger || !popover) return;
      function setExpanded(expanded) {
        trigger.setAttribute("aria-expanded", expanded ? "true" : "false");
      }
      menu.addEventListener("mouseenter", function () {
        setExpanded(true);
      });
      menu.addEventListener("mouseleave", function () {
        setExpanded(false);
      });
      menu.addEventListener("focusin", function () {
        setExpanded(true);
      });
      menu.addEventListener("focusout", function () {
        requestAnimationFrame(function () {
          setExpanded(menu.contains(document.activeElement));
        });
      });
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
    ).filter(function (el) {
      return !el.closest("main > section:first-child");
    });
    els.forEach(function (el) {
      el.classList.add("eicr-scroll-reveal");
    });
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("eicr-scroll-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -35px 0px" },
    );
    els.forEach(function (el) {
      io.observe(el);
    });
  }
  function setupModal(modal) {
    var previousFocus = null;
    function show(opener) {
      previousFocus = document.activeElement;
      modal.hidden = false;
      document.body.classList.add("eicr-modal-open");
      setTimeout(function () {
        var field =
          modal.querySelector("[data-modal-focus]") ||
          modal.querySelector(
            "input:not([type='hidden']),select,textarea,a[href],button",
          );
        if (field) field.focus();
      }, 30);
    }
    function hide() {
      modal.hidden = true;
      document.body.classList.remove("eicr-modal-open");
      if (previousFocus && typeof previousFocus.focus === "function")
        previousFocus.focus();
    }
    modal.querySelectorAll("[data-close-modal]").forEach(function (button) {
      button.addEventListener("click", hide);
    });
    modal.addEventListener("click", function (e) {
      if (e.target === modal) hide();
    });
    document.addEventListener("keydown", function (e) {
      if (modal.hidden) return;
      if (e.key === "Escape") {
        hide();
        return;
      }
      if (e.key === "Tab") {
        var focusable = Array.from(
          modal.querySelectorAll(
            'button:not([disabled]),select:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),a[href]',
          ),
        ).filter(function (element) {
          return element.offsetParent !== null;
        });
        if (!focusable.length) return;
        var first = focusable[0],
          last = focusable[focusable.length - 1];
        if (focusable.indexOf(document.activeElement) === -1) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
    return { show: show, hide: hide };
  }
  function setupReview() {
    var modal = document.getElementById("eicr-review-modal");
    if (!modal) return;
    var controls = setupModal(modal),
      form = modal.querySelector(".eicr-review-form"),
      response = form && form.querySelector(".eicr-response"),
      again = modal.querySelector(".eicr-review-again");
    document.querySelectorAll("[data-open-review]").forEach(function (button) {
      button.addEventListener("click", function () {
        controls.show(button);
      });
    });
    if (again && form) {
      again.addEventListener("click", function () {
        form.classList.remove("eicr-review-complete");
        if (response) {
          response.textContent = "";
          response.removeAttribute("tabindex");
        }
        var first = form.querySelector("select,textarea");
        if (first) first.focus();
      });
    }
  }
  function setupCertificateReviewPrompt() {
    var modal = document.getElementById("eicr-certificate-review-prompt");
    if (!modal) return;
    var controls = setupModal(modal),
      reviewLink = modal.querySelector("[data-review-prompt-link]"),
      reviewNav = document.querySelector("[data-review-nav]");
    document.querySelectorAll("[data-certificate-download]").forEach(function (link) {
      link.addEventListener("click", function () {
        var service = link.getAttribute("data-review-service") || "";
        if (reviewNav) reviewNav.hidden = false;
        if (reviewLink && service) {
          var url = new URL(reviewLink.href, window.location.href);
          url.searchParams.set("review_service", service);
          reviewLink.href = url.toString();
        }
        window.setTimeout(function () {
          controls.show(link);
        }, 700);
      });
    });
  }
  function setupProfilePhotoPreview() {
    var input = document.querySelector("[data-profile-photo-input]"),
      preview = document.querySelector("[data-profile-photo-preview]"),
      temporaryUrl = "";
    if (!input || !preview || !window.URL || !window.URL.createObjectURL) return;
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file || file.type.indexOf("image/") !== 0) return;
      if (temporaryUrl) window.URL.revokeObjectURL(temporaryUrl);
      temporaryUrl = window.URL.createObjectURL(file);
      preview.src = temporaryUrl;
    });
  }
  function setupBooking() {
    document.querySelectorAll("[data-booking-v2]").forEach(function (f) {
      var q = function (s) {
          return f.querySelector(s);
        },
        msg = q("[data-message]"),
        stripe = null,
        card = null,
        cardExpiry = null,
        cardCvc = null,
        cardPanel = q("[data-card-panel]"),
        cardWrap = q("[data-stripe-element-wrap]"),
        setupNote = q("[data-stripe-setup]"),
        cardError = q("[data-card-error]");
      function initStripe() {
        if (card || !EICR_DATA.stripeEnabled || !window.Stripe) return;
        if (!EICR_DATA.stripeKey) return;
        stripe = window.Stripe(EICR_DATA.stripeKey);
        var palette = EICR_DATA.colours || {},
          headingColour = palette.heading || "#000000",
          bodyColour = palette.body || "#202020",
          errorColour = palette.error || "#dc2626";
        var elements = stripe.elements({ locale: "en-GB" }),
          elementStyle = {
            base: {
              fontSize: "15px",
              color: headingColour,
              "::placeholder": { color: bodyColour },
            },
            invalid: { color: errorColour },
          },
          showError = function (event) {
            cardError.textContent = event.error ? event.error.message : "";
          };
        card = elements.create("cardNumber", {
          style: elementStyle,
          placeholder: "Card number",
          showIcon: true,
        });
        cardExpiry = elements.create("cardExpiry", {
          style: elementStyle,
          placeholder: "MM / YY",
        });
        cardCvc = elements.create("cardCvc", {
          style: elementStyle,
          placeholder: "Security code",
        });
        card.mount("#eicr-card-number");
        cardExpiry.mount("#eicr-card-expiry");
        cardCvc.mount("#eicr-card-cvc");
        card.on("change", showError);
        cardExpiry.on("change", showError);
        cardCvc.on("change", showError);
      }
      function syncPayment() {
        var selected = f.querySelector('input[name="payment_method"]:checked'),
          isCard = selected && selected.value === "stripe";
        cardPanel.hidden = !isCard;
        if (isCard) {
          if (EICR_DATA.stripeEnabled && window.Stripe) {
            setupNote.hidden = true;
            cardWrap.hidden = false;
            initStripe();
          } else {
            setupNote.hidden = false;
            cardWrap.hidden = true;
          }
        }
      }
      f.querySelectorAll('input[name="payment_method"]').forEach(function (r) {
        r.addEventListener("change", syncPayment);
      });
      function kind() {
        return f.elements.property_kind
          ? f.elements.property_kind.value
          : "residential";
      }
      function servicePrice(x) {
        var base = Number(x.dataset.base) || 0,
          slug = x.dataset.slug,
          k = kind(),
          beds = Number(f.bedrooms && f.bedrooms.value) || 0,
          floors = Number(f.floors && f.floors.value) || 1;
        if (k === "residential") {
          if (slug === "eicr-certificate")
            base += beds <= 0 ? 0 : beds <= 2 ? 20 : beds <= 4 ? 40 : 70;
          else if (slug === "epc")
            base += beds <= 3 ? 0 : beds === 4 ? 10 : beds === 5 ? 20 : 30;
          else if (slug === "asbestos-survey")
            base += beds <= 2 ? 0 : beds <= 5 ? 50 : 100;
          else if (slug === "fire-risk")
            base += Math.max(0, floors - 1) * 20 + Math.max(0, beds - 2) * 10;
          return base;
        }
        var type = f.commercial_type ? f.commercial_type.value : "other",
          factors = {
            shop: 1,
            office: 1.1,
            "pub-restaurant": 1.2,
            warehouse: 1.35,
            other: 1.1,
          };
        return base * (factors[type] || 1.1);
      }
      function summary() {
        var total = 0,
          html = "";
        f.querySelectorAll(
          'input[name="service_ids[]"]:not(:disabled)',
        ).forEach(function (x) {
          var p = servicePrice(x),
            priceLabel = x.closest("label").querySelector("[data-price-label]");
          if (priceLabel) priceLabel.textContent = "From £" + p.toFixed(2);
          if (x.checked) {
            var n = x.closest("label").querySelector("b").textContent;
            total += p;
            html +=
              '<div class="flex justify-between border-b pb-2"><span>' +
              esc(n) +
              "</span><b>£" +
              p.toFixed(2) +
              "</b></div>";
          }
        });
        var parking = f.elements.parking,
          congestion = f.elements.congestion;
        total +=
          (parking ? Number(parking.value) : 0) +
          (congestion ? Number(congestion.value) : 0);
        if (parking && Number(parking.value) > 0)
          html +=
            '<div class="flex justify-between border-b pb-2"><span>Parking</span><b>£' +
            Number(parking.value).toFixed(2) +
            "</b></div>";
        if (congestion && Number(congestion.value) > 0)
          html +=
            '<div class="flex justify-between border-b pb-2"><span>Congestion zone</span><b>£' +
            Number(congestion.value).toFixed(2) +
            "</b></div>";
        q("[data-summary]").innerHTML =
          html || '<p class="text-sm text-muted">No service selected.</p>';
        q("[data-total]").textContent = "£" + total.toFixed(2);
      }
      function syncKind() {
        var k = kind();
        f.querySelectorAll("[data-residential-fields]").forEach(function (el) {
          el.hidden = k !== "residential";
        });
        f.querySelectorAll("[data-commercial-fields]").forEach(function (el) {
          el.hidden = k !== "commercial";
        });
        f.querySelectorAll("[data-service-set]").forEach(function (set) {
          var active = set.dataset.serviceSet === k;
          set.hidden = !active;
          set
            .querySelectorAll('input[name="service_ids[]"]')
            .forEach(function (x) {
              x.disabled = !active;
            });
        });
        var active = f.querySelector('[data-service-set="' + k + '"]'),
          requested =
            new URLSearchParams(location.search).get("service") ||
            "eicr-certificate";
        if (active && !active.querySelector("input:checked")) {
          var target = active.querySelector('[data-slug="' + requested + '"]');
          if (!target && k === "commercial" && requested === "eicr-certificate")
            target = active.querySelector('[data-slug="commercial-eicr"]');
          if (!target)
            target = active.querySelector('input[name="service_ids[]"]');
          if (target) target.checked = true;
        }
        summary();
      }
      if (f.elements.property_kind)
        f.elements.property_kind.addEventListener("change", syncKind);
      f.addEventListener("change", function (e) {
        if (e.target.name !== "property_kind") summary();
      });
      q("[data-next]").addEventListener("click", function () {
        if (
          !f.querySelector('input[name="service_ids[]"]:checked:not(:disabled)')
        ) {
          msg.textContent = "Select at least one service.";
          return;
        }
        if (!f.elements.date.value) {
          msg.textContent = "Select an inspection date.";
          f.elements.date.focus();
          f.elements.date.reportValidity();
          return;
        }
        msg.textContent = "";
        q('[data-part="1"]').hidden = true;
        q('[data-part="2"]').hidden = false;
        q("[data-next]").hidden = true;
        q("[data-next-note]").hidden = true;
        q("[data-submit-note]").hidden = false;
        q("[data-submit]").hidden = false;
        history.pushState({ eicrBookingPart: 2 }, "", location.href);
        q("[data-booking-title]").textContent =
          kind() === "commercial"
            ? "Commercial property details"
            : "Residential property details";
        q("[data-booking-copy]").textContent =
          "Tell us where the work is needed and how we should confirm it.";
        summary();
        f.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      window.addEventListener("popstate", function () {
        if (!q('[data-part="2"]').hidden) {
          q('[data-part="2"]').hidden = true;
          q('[data-part="1"]').hidden = false;
          q("[data-next]").hidden = false;
          q("[data-next-note]").hidden = false;
          q("[data-submit-note]").hidden = true;
          q("[data-submit]").hidden = true;
          q("[data-booking-title]").textContent = "Build your property booking";
          q("[data-booking-copy]").textContent =
            "Choose the property, required checks and preferred visit.";
          f.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
      f.addEventListener("submit", async function (e) {
        e.preventDefault();
        var method = f.querySelector('input[name="payment_method"]:checked');
        if (!method) {
          msg.textContent = "Select a payment method.";
          var firstPayment = f.querySelector('input[name="payment_method"]');
          firstPayment.focus();
          firstPayment.reportValidity();
          return;
        }
        if (method.value === "stripe" && (!stripe || !card)) {
          msg.textContent =
            "Card payment is temporarily unavailable. Please choose another payment method or contact us.";
          cardPanel.hidden = false;
          return;
        }
        msg.textContent =
          method.value === "stripe"
            ? "Preparing secure payment…"
            : "Processing…";
        var formData = new FormData(f);
        if (method.value === "stripe") formData.append("card_elements", "1");
        try {
          var r = await fetch(EICR_DATA.ajax, {
              method: "POST",
              body: formData,
            }),
            d = await r.json();
          msg.textContent = (d.data && d.data.message) || "Please try again.";
          if (!d.success && d.data && d.data.redirect) {
            location.href = d.data.redirect;
            return;
          }
          if (d.success)
            trackConversion(
              "booking_request",
              d.data && Number(d.data.amount),
              true,
            );
          if (d.success && d.data.redirect) {
            location.href = d.data.redirect;
            return;
          }
          if (d.success && d.data.requires_payment) {
            var result = await stripe.confirmCardPayment(d.data.client_secret, {
              payment_method: {
                card: card,
                billing_details: {
                  name: (f.first_name.value + " " + f.last_name.value).trim(),
                  email: f.email.value,
                  phone: f.phone.value,
                  address: {
                    postal_code: f.postcode.value.trim().toUpperCase(),
                  },
                },
              },
            });
            if (result.error) {
              cardError.textContent = result.error.message;
              msg.textContent = "Please check the card details.";
              return;
            }
            if (
              result.paymentIntent &&
              result.paymentIntent.status === "succeeded"
            ) {
              var verifyData = new FormData();
              verifyData.append("action", "eicr_confirm_stripe_payment");
              verifyData.append("nonce", EICR_DATA.nonce);
              verifyData.append("order_id", d.data.order_id);
              verifyData.append("payment_intent", result.paymentIntent.id);
              try {
                var verifyResponse = await fetch(EICR_DATA.ajax, {
                    method: "POST",
                    body: verifyData,
                  }),
                  verified = await verifyResponse.json();
                if (!verified.success)
                  msg.textContent =
                    "Payment received. Status confirmation is syncing.";
              } catch (verifyError) {
                msg.textContent =
                  "Payment received. Status confirmation is syncing.";
              }
              var success = document.querySelector("[data-booking-success]"),
                successMessage =
                  success && success.querySelector("[data-success-message]");
              if (successMessage)
                successMessage.textContent =
                  "Payment received. Booking reference: " + d.data.reference;
              if (success) {
                success.hidden = false;
                document.body.classList.add("eicr-modal-open");
              }
              return;
            }
          }
          if (d.success) {
            var success2 = document.querySelector("[data-booking-success]"),
              successMessage2 =
                success2 && success2.querySelector("[data-success-message]");
            if (successMessage2) successMessage2.textContent = d.data.message;
            if (success2) {
              success2.hidden = false;
              document.body.classList.add("eicr-modal-open");
            }
          }
        } catch (err) {
          msg.textContent = "Connection problem. Please try again.";
        }
      });
      syncKind();
    });
  }
  function setupBookingValidation() {
    document.querySelectorAll("[data-booking-v2]").forEach(function (f) {
      f.noValidate = true;
      var next = f.querySelector("[data-next]");
      function holder(el) {
        if (el.name === "payment_method") return el.closest("section");
        if (el.matches && el.matches("input[type=radio]"))
          return el.closest("fieldset") || el.closest("label");
        if (el.name === "service_ids[]")
          return el.closest("[data-service-set]") || el.closest("label");
        return el.closest("label,fieldset,section") || el.parentElement;
      }
      function clearError(el) {
        var box = holder(el);
        if (!box) return;
        box.classList.remove("eicr-invalid");
        var old = box.querySelector(".eicr-field-error");
        if (old) old.remove();
      }
      function showError(el, message) {
        var box = holder(el);
        if (!box) return false;
        clearError(el);
        box.classList.add("eicr-invalid");
        var note = document.createElement("span");
        note.className = "eicr-field-error";
        note.innerHTML =
          '<i aria-hidden="true">!</i><span>' + message + "</span>";
        var target = box;
        if (el.name === "payment_method") {
          target = box.querySelector(":scope > div:first-child") || box;
          note.classList.add("eicr-payment-error");
        }
        target.appendChild(note);
        return false;
      }
      function emptyField(name, message) {
        var el = f.elements[name];
        if (!el) return true;
        var value = String(el.value || "").trim();
        if (!value) return showError(el, message);
        if (el.type === "email" && !el.validity.valid)
          return showError(el, "Please enter a valid email address.");
        clearError(el);
        return true;
      }
      function radio(name, message) {
        var items = Array.from(
          f.querySelectorAll('input[name="' + name + '"]'),
        );
        var chosen = items.find(function (x) {
          return x.checked;
        });
        if (!chosen) return items.length ? showError(items[0], message) : true;
        clearError(chosen);
        return true;
      }
      function checkbox(name, message) {
        var item = f.querySelector('input[name="' + name + '"]');
        if (!item) return true;
        if (!item.checked) return showError(item, message);
        clearError(item);
        return true;
      }
      function services() {
        var active = f.querySelector("[data-service-set]:not([hidden])"),
          chosen =
            active &&
            active.querySelector(
              'input[name="service_ids[]"]:checked:not(:disabled)',
            );
        if (!chosen)
          return active
            ? showError(active, "Please select at least one service.")
            : false;
        clearError(chosen);
        return true;
      }
      function focusFirst() {
        var error = f.querySelector(".eicr-invalid");
        if (error) {
          error.scrollIntoView({ behavior: "smooth", block: "center" });
          var control = error.querySelector("input,select,textarea");
          if (control) control.focus({ preventScroll: true });
        }
      }
      function validateFirst() {
        var ok = true;
        if (!services()) ok = false;
        if (!emptyField("date", "Please select an inspection date."))
          ok = false;
        if (!ok) focusFirst();
        return ok;
      }
      function validateSecond() {
        var ok = true;
        [
          ["first_name", "Please enter your first name."],
          ["last_name", "Please enter your last name."],
          ["email", "Please enter your email address."],
          ["phone", "Please enter your phone number."],
          ["address", "Please enter the inspection address."],
          ["postcode", "Please enter the post code."],
        ].forEach(function (item) {
          if (!emptyField(item[0], item[1])) ok = false;
        });
        if (!radio("parking", "Please select a parking option.")) ok = false;
        if (!radio("congestion", "Please select a congestion-zone option."))
          ok = false;
        if (!radio("payment_method", "Please select a payment method."))
          ok = false;
        if (!checkbox("terms_accepted", "Please accept the Terms & Conditions to submit the booking."))
          ok = false;
        if (!ok) focusFirst();
        return ok;
      }
      if (next)
        next.addEventListener(
          "click",
          function (e) {
            if (!validateFirst()) {
              e.preventDefault();
              e.stopImmediatePropagation();
            }
          },
          true,
        );
      f.addEventListener(
        "submit",
        function (e) {
          if (!validateSecond()) {
            e.preventDefault();
            e.stopImmediatePropagation();
          }
        },
        true,
      );
      f.addEventListener("input", function (e) {
        if (e.target.matches("input,select,textarea")) clearError(e.target);
      });
      f.addEventListener("change", function (e) {
        if (e.target.matches("input,select,textarea")) clearError(e.target);
      });
    });
  }
  function setupAjaxForms() {
    document
      .querySelectorAll(".eicr-form:not([data-booking-v2])")
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
              if (!(d.data && d.data.suppressed)) {
                if (f.classList.contains("eicr-review-form")) {
                  trackConversion("review_submit", null, false);
                } else {
                  trackConversion("quote_request", null, true);
                }
              }
              f.reset();
              if (f.classList.contains("eicr-review-form")) {
                f.classList.add("eicr-review-complete");
                if (o) {
                  o.setAttribute("tabindex", "-1");
                  o.focus();
                }
              }
            }
          } catch (err) {
            if (o) o.textContent = "Connection problem. Please try again.";
          }
        });
      });
  }
  document.addEventListener("DOMContentLoaded", function () {
    setupConversionTracking();
    setupMobileMenu();
    setupAccountMenu();
    setupReveal();
    setupReview();
    setupCertificateReviewPrompt();
    setupProfilePhotoPreview();
    setupBookingValidation();
    setupBooking();
    setupAjaxForms();
  });
})();
