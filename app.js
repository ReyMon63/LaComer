/**
 * app.js — Lógica del Preciador GE
 * Depende de data.js (CATALOGO, INSTALACION, ACCESS_CODES).
 */

(function () {
  "use strict";

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
  const normalize = (str) =>
    (str || "")
      .toString()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();

  const money = (n) =>
    n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

  const MAX_PRECIO = 15000;

  const matchesAny = (term, list) => {
    const t = normalize(term);
    return list.some((item) => {
      const n = normalize(item);
      return n.includes(t) || t.includes(n);
    });
  };

  // Índice plano de artículos elegibles para el buscador dinámico
  function buildSearchIndex() {
    const index = [];
    CATALOGO.forEach((cat) => {
      cat.articulos.forEach((art) => {
        index.push({ articulo: art, categoria: cat });
      });
    });
    return index;
  }

  const SEARCH_INDEX = buildSearchIndex();

  // ------------------------------------------------------------------
  // Estado
  // ------------------------------------------------------------------
  let state = {
    categoria: null, // objeto de CATALOGO seleccionado
    articulo: null, // texto del artículo elegido
    opcion: null, // opción de duración seleccionada
    precio: 0,
    instalacion: false,
    aplicaInstalacion: false,
  };

  // ------------------------------------------------------------------
  // Elementos DOM
  // ------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);

  const loginScreen = $("loginScreen");
  const appScreen = $("appScreen");
  const loginForm = $("loginForm");
  const accessCodeInput = $("accessCode");
  const loginError = $("loginError");

  const searchInput = $("searchInput");
  const searchResults = $("searchResults");
  const searchEmpty = $("searchEmpty");

  const selectedWrap = $("selectedWrap");
  const selectedCat = $("selectedCat");
  const selectedName = $("selectedName");
  const clearSelection = $("clearSelection");

  const priceInput = $("priceInput");
  const priceLimitMsg = $("priceLimitMsg");
  const optionsWrap = $("optionsWrap");
  const optionsGrid = $("optionsGrid");
  const installWrap = $("installWrap");
  const installCheck = $("installCheck");

  const resultWrap = $("resultWrap");
  const resGEMonto = $("resGEMonto");
  const resGEDetalle = $("resGEDetalle");
  const skuGELabel = $("skuGELabel");
  const resultInstallBlock = $("resultInstallBlock");
  const resInstallMonto = $("resInstallMonto");
  const skuInstallLabel = $("skuInstallLabel");
  const resTotal = $("resTotal");
  const resetBtn = $("resetBtn");

  const shareBtn = $("shareBtn");
  const shareModal = $("shareModal");
  const shareClose = $("shareClose");
  const qrHolder = $("qrHolder");
  const qrUrl = $("qrUrl");
  const logoutBtn = $("logoutBtn");

  // ------------------------------------------------------------------
  // Login
  // ------------------------------------------------------------------
  const SESSION_KEY = "preciadorGE_auth";

  function tryAutoLogin() {
    if (sessionStorage.getItem(SESSION_KEY) === "ok") {
      showApp();
    }
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const entered = normalize(accessCodeInput.value);
    const valid = ACCESS_CODES.some((code) => normalize(code) === entered);
    if (valid) {
      sessionStorage.setItem(SESSION_KEY, "ok");
      loginError.hidden = true;
      showApp();
    } else {
      loginError.hidden = false;
      accessCodeInput.value = "";
      accessCodeInput.focus();
    }
  });

  function showApp() {
    loginScreen.hidden = true;
    appScreen.hidden = false;
  }

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });

  // ------------------------------------------------------------------
  // Buscador dinámico
  // ------------------------------------------------------------------
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    if (q.length < 2) {
      searchResults.hidden = true;
      searchEmpty.hidden = true;
      return;
    }

    const nq = normalize(q);
    const matches = SEARCH_INDEX.filter((entry) =>
      normalize(entry.articulo).includes(nq)
    ).slice(0, 8);

    if (matches.length === 0) {
      searchResults.hidden = true;
      searchEmpty.hidden = false;
      return;
    }

    searchEmpty.hidden = true;
    searchResults.hidden = false;
    searchResults.innerHTML = "";

    matches.forEach((entry) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "result-item";
      btn.innerHTML = `
        <span class="name">${entry.articulo}</span>
        <span class="cat">${entry.categoria.subNombre}</span>
      `;
      btn.addEventListener("click", () => selectArticulo(entry));
      searchResults.appendChild(btn);
    });
  });

  function selectArticulo(entry) {
    state.categoria = entry.categoria;
    state.articulo = entry.articulo;
    state.opcion = null;
    state.instalacion = false;

    selectedCat.textContent = entry.categoria.subNombre;
    selectedName.textContent = entry.articulo;
    selectedWrap.hidden = false;

    searchInput.value = "";
    searchResults.hidden = true;
    searchEmpty.hidden = true;

    // ¿Aplica instalación para este artículo?
    state.aplicaInstalacion = matchesAny(entry.articulo, INSTALACION.articulos);
    installWrap.hidden = !state.aplicaInstalacion;
    installCheck.checked = false;

    priceLimitMsg.hidden = true;
    renderOptions();
    resultWrap.hidden = true;
    priceInput.value = "";
    priceInput.focus();
  }

  clearSelection.addEventListener("click", resetAll);

  function resetAll() {
    state = {
      categoria: null,
      articulo: null,
      opcion: null,
      precio: 0,
      instalacion: false,
      aplicaInstalacion: false,
    };
    selectedWrap.hidden = true;
    optionsWrap.hidden = true;
    installWrap.hidden = true;
    resultWrap.hidden = true;
    priceLimitMsg.hidden = true;
    searchInput.value = "";
    priceInput.value = "";
    searchInput.focus();
  }

  resetBtn.addEventListener("click", resetAll);

  // ------------------------------------------------------------------
  // Opciones de duración (la más alta primero, destacada)
  // ------------------------------------------------------------------
  function renderOptions() {
    if (!state.categoria) return;

    const opciones = [...state.categoria.opciones].sort((a, b) => {
      if (b.years !== a.years) return b.years - a.years;
      return b.pct - a.pct;
    });

    optionsGrid.innerHTML = "";
    optionsWrap.hidden = false;

    opciones.forEach((op, idx) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "option-card" + (idx === 0 ? " featured" : "");
      card.innerHTML = `
        <div class="years">${op.years} año${op.years > 1 ? "s" : ""}</div>
        <div class="tipo">${op.tipo}</div>
        <div class="monto" data-monto>—</div>
        <div class="pct">${(op.pct * 100).toFixed(2)}%</div>
      `;
      card.addEventListener("click", () => {
        state.opcion = op;
        [...optionsGrid.children].forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        calcularYMostrar();
      });
      optionsGrid.appendChild(card);
    });

    // Selecciona automáticamente la opción destacada (mayor duración)
    if (opciones.length) {
      state.opcion = opciones[0];
      optionsGrid.children[0].classList.add("selected");
    }

    actualizarMontosOpciones();
  }

  function actualizarMontosOpciones() {
    const precio = parseFloat(priceInput.value) || 0;
    const opciones = [...state.categoria.opciones].sort((a, b) => {
      if (b.years !== a.years) return b.years - a.years;
      return b.pct - a.pct;
    });
    [...optionsGrid.children].forEach((card, idx) => {
      const op = opciones[idx];
      const montoEl = card.querySelector("[data-monto]");
      montoEl.textContent = precio > 0 ? money(precio * op.pct) : "—";
    });
  }

  function excedeLimite(precio) {
    return precio > MAX_PRECIO;
  }

  function aplicarLimitePrecio(precio) {
    const overLimit = excedeLimite(precio);

    if (overLimit) {
      priceLimitMsg.hidden = false;
      optionsWrap.hidden = true;
      installWrap.hidden = true;
      resultWrap.hidden = true;
    } else {
      priceLimitMsg.hidden = true;
      if (state.categoria) {
        optionsWrap.hidden = false;
        installWrap.hidden = !state.aplicaInstalacion;
      }
    }

    return overLimit;
  }

  priceInput.addEventListener("input", () => {
    // Campo inteligente: solo dígitos y un punto decimal
    priceInput.value = priceInput.value.replace(/[^0-9.]/g, "");
    const precio = parseFloat(priceInput.value) || 0;

    if (aplicarLimitePrecio(precio)) return;

    actualizarMontosOpciones();
    if (state.opcion) calcularYMostrar();
  });

  installCheck.addEventListener("change", () => {
    state.instalacion = installCheck.checked;
    if (state.opcion) calcularYMostrar();
  });

  // ------------------------------------------------------------------
  // Cálculo y resultado
  // ------------------------------------------------------------------
  function calcularYMostrar() {
    const precio = parseFloat(priceInput.value) || 0;
    if (!state.opcion || precio <= 0 || excedeLimite(precio)) {
      resultWrap.hidden = true;
      return;
    }

    const montoGE = precio * state.opcion.pct;

    resGEMonto.textContent = money(montoGE);
    resGEDetalle.textContent = `${state.articulo} · ${state.opcion.years} año${state.opcion.years > 1 ? "s" : ""} (${state.opcion.tipo}) · ${(state.opcion.pct * 100).toFixed(2)}% sobre ${money(precio)}`;
    skuGELabel.textContent = `SKU ${state.opcion.sku}`;
    dibujarBarcode("barcodeGE", state.opcion.sku);

    let total = montoGE;

    if (state.instalacion) {
      resultInstallBlock.hidden = false;
      resInstallMonto.textContent = money(INSTALACION.monto);
      skuInstallLabel.textContent = `SKU ${INSTALACION.sku}`;
      dibujarBarcode("barcodeInstall", INSTALACION.sku);
      total += INSTALACION.monto;
    } else {
      resultInstallBlock.hidden = true;
    }

    resTotal.textContent = money(total);
    resultWrap.hidden = false;
  }

  function dibujarBarcode(svgId, sku) {
    try {
      JsBarcode(`#${svgId}`, String(sku), {
        format: "CODE128",
        width: 2,
        height: 60,
        displayValue: false,
        margin: 0,
      });
    } catch (err) {
      console.error("No se pudo generar el código de barras", err);
    }
  }

  // ------------------------------------------------------------------
  // Compartir app (QR con la URL actual)
  // ------------------------------------------------------------------
  shareBtn.addEventListener("click", () => {
    shareModal.hidden = false;
    qrHolder.innerHTML = "";
    qrUrl.textContent = location.href;
    try {
      // eslint-disable-next-line no-undef
      new QRCode(qrHolder, {
        text: location.href,
        width: 180,
        height: 180,
        colorDark: "#0f7a53",
        colorLight: "#ffffff",
      });
    } catch (err) {
      qrHolder.textContent = "No se pudo generar el QR en este dispositivo.";
    }
  });

  shareClose.addEventListener("click", () => (shareModal.hidden = true));
  shareModal.addEventListener("click", (e) => {
    if (e.target === shareModal) shareModal.hidden = true;
  });

  // ------------------------------------------------------------------
  // Init
  // ------------------------------------------------------------------
  tryAutoLogin();
})();
