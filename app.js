/**
 * app.js — Lógica del Preciador GE
 * Depende de data.js (CATALOGO, INSTALACION, ACCESS_CODES).
 *
 * Dos flujos de cotización, comparten la misma tarjeta de Resultado:
 *   Flujo A "Cotizar por Artículo": buscas el artículo -> precio -> duración -> instalación (si aplica)
 *   Flujo B "Cotizar por Precio":   escribes el precio -> subcategoría -> duración -> instalación (si aplica)
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

  const sortOpciones = (opciones) =>
    [...opciones].sort((a, b) => {
      if (b.years !== a.years) return b.years - a.years;
      return b.pct - a.pct;
    });

  const excedeLimite = (precio) => precio > MAX_PRECIO;

  // Índice plano de artículos elegibles para el buscador dinámico (Flujo A)
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

  // ¿Esta subcategoría tiene algún artículo elegible para instalación?
  // (se usa en el Flujo B, donde no se conoce el artículo exacto)
  CATALOGO.forEach((cat) => {
    cat.aplicaInstalacion = cat.articulos.some((art) =>
      matchesAny(art, INSTALACION.articulos)
    );
  });

  // ------------------------------------------------------------------
  // Estado
  // ------------------------------------------------------------------
  let activeFlow = null; // 'articulo' | 'precio' | null

  let stateA = {
    categoria: null,
    articulo: null,
    opcion: null,
    instalacion: false,
    aplicaInstalacion: false,
  };

  let stateB = {
    categoria: null,
    opcion: null,
    instalacion: false,
    aplicaInstalacion: false,
    step: 0, // 0=precio, 1=subcategoria, 2=duracion, 3=instalacion/resultado
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

  const backBtn = $("backBtn");

  // Flujo A
  const searchCard = $("searchCard");
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

  // Flujo B
  const priceModeCard = $("priceModeCard");
  const priceModeInput = $("priceModeInput");
  const priceModeLimitMsg = $("priceModeLimitMsg");

  const flowBWrap = $("flowBWrap");
  const subcatGrid = $("subcatGrid");
  const durStepB = $("durStepB");
  const optionsGridB = $("optionsGridB");
  const installWrapB = $("installWrapB");
  const installCheckB = $("installCheckB");

  // Resultado (compartido)
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
  // Botón Regresar (esquina superior derecha)
  // ------------------------------------------------------------------
  function updateBackButton() {
    backBtn.hidden = activeFlow === null;
  }

  backBtn.addEventListener("click", () => {
    if (activeFlow === "articulo") {
      resetTodo();
    } else if (activeFlow === "precio") {
      if (stateB.step >= 3) {
        collapseFlowBTo(2);
      } else if (stateB.step === 2) {
        collapseFlowBTo(1);
      } else if (stateB.step === 1) {
        collapseFlowBTo(0);
      } else {
        resetTodo();
      }
    }
  });

  // ------------------------------------------------------------------
  // Reinicio general (ambos flujos)
  // ------------------------------------------------------------------
  function resetTodo() {
    resetFlowA();
    resetFlowB();
    activeFlow = null;
    updateBackButton();
    searchInput.focus();
  }

  resetBtn.addEventListener("click", resetTodo);

  // ====================================================================
  // FLUJO A — Cotizar por Artículo
  // ====================================================================
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    if (q.length < 2) {
      searchResults.hidden = true;
      searchEmpty.hidden = true;
      return;
    }

    activeFlow = "articulo";
    resetFlowB();
    updateBackButton();

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
    activeFlow = "articulo";
    resetFlowB();
    updateBackButton();

    stateA.categoria = entry.categoria;
    stateA.articulo = entry.articulo;
    stateA.opcion = null;
    stateA.instalacion = false;

    selectedCat.textContent = entry.categoria.subNombre;
    selectedName.textContent = entry.articulo;
    selectedWrap.hidden = false;

    searchInput.value = "";
    searchResults.hidden = true;
    searchEmpty.hidden = true;

    stateA.aplicaInstalacion = matchesAny(entry.articulo, INSTALACION.articulos);
    installWrap.hidden = !stateA.aplicaInstalacion;
    installCheck.checked = false;

    priceLimitMsg.hidden = true;
    renderOptions(stateA.categoria, optionsGrid, (op) => {
      stateA.opcion = op;
      calcularYMostrarA();
    });
    stateA.opcion = sortOpciones(stateA.categoria.opciones)[0];

    resultWrap.hidden = true;
    priceInput.value = "";
    priceInput.focus();
  }

  clearSelection.addEventListener("click", resetTodo);

  function resetFlowA() {
    stateA = {
      categoria: null,
      articulo: null,
      opcion: null,
      instalacion: false,
      aplicaInstalacion: false,
    };
    selectedWrap.hidden = true;
    optionsWrap.hidden = true;
    installWrap.hidden = true;
    priceLimitMsg.hidden = true;
    searchInput.value = "";
    priceInput.value = "";
    searchResults.hidden = true;
    searchEmpty.hidden = true;
    if (activeFlow === "articulo") resultWrap.hidden = true;
  }

  function actualizarMontosOpciones(categoria, grid, precio) {
    const opciones = sortOpciones(categoria.opciones);
    [...grid.children].forEach((card, idx) => {
      const op = opciones[idx];
      const montoEl = card.querySelector("[data-monto]");
      montoEl.textContent = precio > 0 ? money(precio * op.pct) : "—";
    });
  }

  function aplicarLimitePrecioA(precio) {
    const overLimit = excedeLimite(precio);
    if (overLimit) {
      priceLimitMsg.hidden = false;
      optionsWrap.hidden = true;
      installWrap.hidden = true;
      resultWrap.hidden = true;
    } else {
      priceLimitMsg.hidden = true;
      if (stateA.categoria) {
        optionsWrap.hidden = false;
        installWrap.hidden = !stateA.aplicaInstalacion;
      }
    }
    return overLimit;
  }

  priceInput.addEventListener("input", () => {
    priceInput.value = priceInput.value.replace(/[^0-9.]/g, "");
    const precio = parseFloat(priceInput.value) || 0;

    if (aplicarLimitePrecioA(precio)) return;

    if (stateA.categoria) actualizarMontosOpciones(stateA.categoria, optionsGrid, precio);
    if (stateA.opcion) calcularYMostrarA();
  });

  installCheck.addEventListener("change", () => {
    stateA.instalacion = installCheck.checked;
    if (stateA.opcion) calcularYMostrarA();
  });

  function calcularYMostrarA() {
    const precio = parseFloat(priceInput.value) || 0;
    if (!stateA.opcion || precio <= 0 || excedeLimite(precio)) {
      resultWrap.hidden = true;
      return;
    }
    mostrarResultado({
      detalle: stateA.articulo,
      opcion: stateA.opcion,
      precio,
      instalacionOn: stateA.instalacion,
    });
  }

  // ====================================================================
  // FLUJO B — Cotizar por Precio
  // ====================================================================
  function aplicarLimitePrecioB(precio) {
    const overLimit = excedeLimite(precio);
    if (overLimit) {
      priceModeLimitMsg.hidden = false;
      flowBWrap.hidden = true;
      resultWrap.hidden = true;
    } else {
      priceModeLimitMsg.hidden = true;
    }
    return overLimit;
  }

  priceModeInput.addEventListener("input", () => {
    priceModeInput.value = priceModeInput.value.replace(/[^0-9.]/g, "");
    const precio = parseFloat(priceModeInput.value) || 0;

    if (aplicarLimitePrecioB(precio)) return;

    // Solo se construye la lista de subcategorías la primera vez que hay
    // un precio válido; si el vendedor ya avanzó (subcategoría/duración
    // elegidas) y solo ajusta el precio, no se reconstruye ni se pierde
    // la selección visual ya hecha.
    if (precio > 0 && stateB.step === 0) {
      activeFlow = "precio";
      resetFlowA();
      updateBackButton();
      mostrarSubcategorias();
      stateB.step = 1;
    }

    // Recalcula montos visibles con el precio actual
    if (stateB.categoria) actualizarMontosOpciones(stateB.categoria, optionsGridB, precio);
    if (stateB.opcion) calcularYMostrarB();
  });

  function mostrarSubcategorias() {
    flowBWrap.hidden = false;
    subcatGrid.innerHTML = "";

    CATALOGO.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "subcat-item";
      const resumen = cat.opciones
        .map((o) => (o.tipo === "Garantía" ? `${o.years} año${o.years > 1 ? "s" : ""}` : o.tipo))
        .join(" / ");
      btn.innerHTML = `
        <span class="name">${cat.subNombre}</span>
        <span class="opts">${resumen}</span>
      `;
      btn.addEventListener("click", () => selectSubcategoria(cat, btn));
      subcatGrid.appendChild(btn);
    });
  }

  function selectSubcategoria(categoria, btnEl) {
    stateB.categoria = categoria;
    stateB.opcion = null;
    stateB.instalacion = false;
    stateB.aplicaInstalacion = !!categoria.aplicaInstalacion;
    stateB.step = 2;

    [...subcatGrid.children].forEach((c) => c.classList.remove("selected"));
    btnEl.classList.add("selected");

    installCheckB.checked = false;
    installWrapB.hidden = !stateB.aplicaInstalacion;
    resultWrap.hidden = true;

    const precio = parseFloat(priceModeInput.value) || 0;

    renderOptions(categoria, optionsGridB, (op) => {
      stateB.opcion = op;
      stateB.step = 3;
      calcularYMostrarB();
    });
    stateB.opcion = sortOpciones(categoria.opciones)[0];
    durStepB.hidden = false;
    actualizarMontosOpciones(categoria, optionsGridB, precio);

    if (precio > 0) calcularYMostrarB();
  }

  installCheckB.addEventListener("change", () => {
    stateB.instalacion = installCheckB.checked;
    if (stateB.opcion) calcularYMostrarB();
  });

  function calcularYMostrarB() {
    const precio = parseFloat(priceModeInput.value) || 0;
    if (!stateB.opcion || precio <= 0 || excedeLimite(precio)) {
      resultWrap.hidden = true;
      return;
    }
    // El resultado ya está visible (aunque sea con la opción destacada
    // preseleccionada, sin que el vendedor haya tocado una tarjeta): el
    // contador de pasos debe reflejarlo para que "Regresar" retroceda
    // de forma consistente.
    stateB.step = 3;
    mostrarResultado({
      detalle: `Cotización por precio · ${stateB.categoria.subNombre}`,
      opcion: stateB.opcion,
      precio,
      instalacionOn: stateB.instalacion,
    });
  }

  function collapseFlowBTo(step) {
    stateB.step = step;
    if (step < 3) resultWrap.hidden = true;
    if (step < 2) {
      durStepB.hidden = true;
      installWrapB.hidden = true;
      stateB.opcion = null;
    }
    if (step < 1) {
      flowBWrap.hidden = true;
      stateB.categoria = null;
      priceModeInput.value = "";
      priceModeLimitMsg.hidden = true;
    }
    if (step >= 1) {
      [...subcatGrid.children].forEach((c) => c.classList.remove("selected"));
    }
  }

  function resetFlowB() {
    stateB = {
      categoria: null,
      opcion: null,
      instalacion: false,
      aplicaInstalacion: false,
      step: 0,
    };
    flowBWrap.hidden = true;
    durStepB.hidden = true;
    installWrapB.hidden = true;
    priceModeInput.value = "";
    priceModeLimitMsg.hidden = true;
    if (activeFlow === "precio") resultWrap.hidden = true;
  }

  // ====================================================================
  // Componentes compartidos
  // ====================================================================

  // Tarjetas de duración: la de mayor duración primero, destacada y preseleccionada.
  function renderOptions(categoria, grid, onSelect) {
    const opciones = sortOpciones(categoria.opciones);
    grid.innerHTML = "";

    opciones.forEach((op, idx) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "option-card" + (idx === 0 ? " featured selected" : "");
      card.innerHTML = `
        <div class="years">${op.years} año${op.years > 1 ? "s" : ""}</div>
        <div class="tipo">${op.tipo}</div>
        <div class="monto" data-monto>—</div>
        <div class="pct">${(op.pct * 100).toFixed(2)}%</div>
      `;
      card.addEventListener("click", () => {
        [...grid.children].forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        onSelect(op);
      });
      grid.appendChild(card);
    });
  }

  // Resultado final: monto, detalle, SKU + código de barras, e instalación si aplica.
  function mostrarResultado({ detalle, opcion, precio, instalacionOn }) {
    const montoGE = precio * opcion.pct;

    resGEMonto.textContent = money(montoGE);
    resGEDetalle.textContent = `${detalle} · ${opcion.years} año${opcion.years > 1 ? "s" : ""} (${opcion.tipo}) · ${(opcion.pct * 100).toFixed(2)}% sobre ${money(precio)}`;
    skuGELabel.textContent = `SKU ${opcion.sku}`;
    dibujarBarcode("barcodeGE", opcion.sku);

    let total = montoGE;

    if (instalacionOn) {
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
