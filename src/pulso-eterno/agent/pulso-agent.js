/* ══════════════════════════════════════════════════════════════
   PULSO ETERNO · AGENTE
   ──────────────────────────────────────────────────────────────
   Cole este arquivo no projeto alvo e adicione antes do </body>:

     <script src="pulso-agent.js"></script>

   Ele abre um canal com o Studio via postMessage. Só responde a
   mensagens que começam com "pulso:", e só age quando o Studio
   pede. Não faz nada sozinho, não envia nada para fora.

   Para tirar: remova a linha do script. Não deixa resíduo.
   ══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__pulsoAgent) return;
  window.__pulsoAgent = true;

  var CLICKABLE = "button,[role=button],a[href],input,select,summary,[onclick],[data-tip]";
  var inspecting = false;
  var hover = null;
  var applied = [];

  /* ── identificação ─────────────────────────────────────────── */

  function selectorFor(el) {
    if (el.id) return "#" + el.id;
    var path = [], node = el, depth = 0;
    while (node && depth < 4 && node !== document.body) {
      var cls = Array.prototype.slice.call(node.classList)
        .filter(function (c) { return !/^(css|sc)-[a-z0-9]{4,}$/i.test(c); })
        .slice(0, 2);
      var part = node.tagName.toLowerCase() + (cls.length ? "." + cls.join(".") : "");
      var parent = node.parentElement;
      if (parent) {
        var same = Array.prototype.filter.call(parent.children, function (c) {
          try { return c.matches(part); } catch (e) { return false; }
        });
        if (same.length > 1) part += ":nth-of-type(" + (same.indexOf(node) + 1) + ")";
      }
      path.unshift(part);
      if (node.id) { path[0] = "#" + node.id; break; }
      node = parent; depth++;
    }
    return path.join(" > ");
  }

  function labelFor(el) {
    var t = el.getAttribute("data-tip") || el.getAttribute("aria-label") || el.getAttribute("title");
    var txt = (el.textContent || "").replace(/\s+/g, " ").trim();
    return (t || txt || el.className.toString().split(" ")[0] || el.tagName.toLowerCase()).slice(0, 48);
  }

  function reply(msg) {
    try { window.parent.postMessage(msg, "*"); } catch (e) { /* sem pai */ }
  }

  /* ── inspeção ──────────────────────────────────────────────── */

  function ensureHover() {
    if (hover) return hover;
    hover = document.createElement("div");
    hover.style.cssText =
      "position:fixed;z-index:2147483000;pointer-events:none;border:2px dashed #2563eb;" +
      "background:rgba(37,99,235,.12);border-radius:3px;transition:all .07s linear;opacity:0";
    document.body.appendChild(hover);
    return hover;
  }

  function onMove(e) {
    if (!inspecting) return;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
    var r = el.getBoundingClientRect();
    var h = ensureHover();
    h.style.left = (r.left - 2) + "px";
    h.style.top = (r.top - 2) + "px";
    h.style.width = (r.width + 4) + "px";
    h.style.height = (r.height + 4) + "px";
    h.style.opacity = "1";
  }

  function onClick(e) {
    if (!inspecting) return;
    e.preventDefault(); e.stopPropagation();
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
    reply({
      type: "pulso:picked",
      selector: selectorFor(el),
      label: labelFor(el),
      tag: el.tagName.toLowerCase(),
      classes: Array.prototype.slice.call(el.classList),
    });
  }

  function setInspect(on) {
    inspecting = on;
    document.documentElement.style.cursor = on ? "crosshair" : "";
    if (!on && hover) hover.style.opacity = "0";
  }

  /* ── varredura ─────────────────────────────────────────────── */

  function scan() {
    var seen = {}, items = [];
    Array.prototype.forEach.call(document.querySelectorAll(CLICKABLE), function (el) {
      var r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;
      var label = labelFor(el);
      if (!label || seen[label.toLowerCase()]) return;
      seen[label.toLowerCase()] = 1;
      items.push({ label: label, selector: selectorFor(el), tag: el.tagName.toLowerCase() });
    });
    reply({ type: "pulso:found", items: items });
  }

  /* ── dossiê ────────────────────────────────────────────────── */

  var RELEVANT = [
    "display", "position", "width", "height", "padding", "margin", "flex",
    "gap", "font-family", "font-size", "font-weight", "color", "background-color",
    "border", "border-radius", "box-shadow", "opacity", "transform", "cursor",
  ];

  function dossier(selector) {
    var el = document.querySelector(selector);
    if (!el) { reply({ type: "pulso:error", message: "Elemento não encontrado." }); return; }

    var cs = getComputedStyle(el), css = "";
    RELEVANT.forEach(function (p) {
      var v = cs.getPropertyValue(p).trim();
      if (v && v !== "none" && v !== "auto" && v !== "0px" && v !== "normal") {
        css += "  " + p + ": " + v + ";\n";
      }
    });

    reply({
      type: "pulso:dossier",
      selector: selector,
      markup: el.outerHTML.slice(0, 3000),
      css: selector + " {\n" + css + "}",
    });
  }

  /* ── aplicar estilo ────────────────────────────────────────── */

  function apply(selector, css) {
    var el = document.querySelector(selector);
    if (!el) { reply({ type: "pulso:error", message: "Elemento não encontrado." }); return; }
    if (/@import|javascript:|<script/i.test(css)) {
      reply({ type: "pulso:error", message: "Trecho recusado por segurança." });
      return;
    }

    applied.push({ selector: selector, previous: el.getAttribute("style") || "" });

    var body = css.indexOf("{") >= 0 ? css.slice(css.indexOf("{") + 1, css.lastIndexOf("}")) : css;
    var n = 0;
    body.split(";").forEach(function (decl) {
      var i = decl.indexOf(":");
      if (i < 0) return;
      var prop = decl.slice(0, i).trim();
      var val = decl.slice(i + 1).trim().replace(/!important/gi, "");
      if (!/^[a-z-]+$/.test(prop) || !val) return;
      el.style.setProperty(prop, val, "important");
      n++;
    });

    reply({ type: "pulso:ok", action: "apply", detail: n + " propriedade(s)." });
  }

  /* ── injetar elemento ──────────────────────────────────────── */

  function inject(payload) {
    var anchor = payload.selector ? document.querySelector(payload.selector) : document.body;
    if (!anchor) { reply({ type: "pulso:error", message: "Âncora não encontrada." }); return; }

    if (payload.css) {
      var style = document.createElement("style");
      style.setAttribute("data-pulso", "elemento adicionado pelo Dev PulsoEterno");
      style.textContent = "/* elemento adicionado pelo Dev PulsoEterno */\n" + payload.css;
      document.head.appendChild(style);
    }

    var host = document.createElement("div");
    host.setAttribute("data-pulso-injected", "1");
    host.innerHTML = payload.html || "";

    var pos = payload.position || "beforeend";
    if (pos === "before") anchor.parentNode.insertBefore(host, anchor);
    else if (pos === "after") anchor.parentNode.insertBefore(host, anchor.nextSibling);
    else anchor.appendChild(host);

    if (payload.js) {
      var s = document.createElement("script");
      s.setAttribute("data-pulso", "elemento adicionado pelo Dev PulsoEterno");
      s.textContent = "/* elemento adicionado pelo Dev PulsoEterno */\n" + payload.js;
      document.body.appendChild(s);
    }

    reply({ type: "pulso:ok", action: "inject", detail: "Elemento inserido." });
  }

  function revertAll() {
    applied.reverse().forEach(function (a) {
      var el = document.querySelector(a.selector);
      if (!el) return;
      if (a.previous) el.setAttribute("style", a.previous);
      else el.removeAttribute("style");
    });
    var n = applied.length;
    applied = [];
    Array.prototype.forEach.call(document.querySelectorAll("[data-pulso-injected],[data-pulso]"), function (n2) {
      n2.parentNode.removeChild(n2);
    });
    reply({ type: "pulso:ok", action: "revert", detail: n + " alteração(ões) desfeita(s)." });
  }

  /* ── canal ─────────────────────────────────────────────────── */

  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || typeof d !== "object" || typeof d.type !== "string") return;
    if (d.type.indexOf("pulso:") !== 0) return;

    switch (d.type) {
      case "pulso:ping":
        reply({
          type: "pulso:pong",
          href: location.href,
          title: document.title,
          elements: document.querySelectorAll(CLICKABLE).length,
        });
        break;
      case "pulso:scan": scan(); break;
      case "pulso:inspect": setInspect(!!d.on); break;
      case "pulso:dossier": dossier(d.selector); break;
      case "pulso:apply": apply(d.selector, d.css); break;
      case "pulso:inject": inject(d); break;
      case "pulso:revert": revertAll(); break;
    }
  });

  window.addEventListener("mousemove", onMove, true);
  window.addEventListener("click", onClick, true);

  // Avisa o Studio que chegou.
  reply({
    type: "pulso:pong",
    href: location.href,
    title: document.title,
    elements: document.querySelectorAll(CLICKABLE).length,
  });

  console.info("[Pulso Eterno] agente ativo em", location.href);
})();
