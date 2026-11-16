/* MTI6-GTADWIY-COCKPIT — Our Accounts screen (read-only)
 * Everything about money in one place, labelled honestly:
 * - Cockpit money already in the app (expenses) and live crypto
 *   prices are shown or linked.
 * - Selling channels are a research list, NOT live balances:
 *   no seller balance appears here until you open a seller account
 *   yourself (identity/bank verification is required for payouts)
 *   and connect it with a token through a server-side proxy.
 * - The store search below is a BUYER catalog search (Shopify
 *   storefront), not a seller balance.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  var CHANNELS = [
    { name: "Shopify", note: "Sell through your own store. Payouts require identity and bank verification. Balance: not connected — needs your store owner token + server proxy." },
    { name: "Amazon Seller", note: "Sell on a major marketplace. Payouts require identity, tax, and bank verification. Balance: not connected." },
    { name: "eBay", note: "Sell new and used items. Payouts require identity and bank verification. Balance: not connected." },
    { name: "Etsy", note: "Sell handmade, vintage, and craft supplies. Payouts require identity and bank verification. Balance: not connected." },
    { name: "Temu (seller)", note: "Sell through Temu's marketplace. Seller onboarding requires business verification. Balance: not connected." },
    { name: "Alibaba", note: "Wholesale and supplier selling. Supplier onboarding requires business verification. Balance: not connected." }
  ];

  async function render(root) {
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("accounts") : U.el("div", {}, ""));
    root.appendChild(U.el("h2", { class: "section-title" }, "💼 Our Accounts"));
    root.appendChild(U.el("p", { class: "api-subtitle" }, "All of your money in one place — as far as it can honestly be shown today. Cockpit expenses live in Resource Tracker, crypto prices are live, and selling-channel balances appear only after you open that seller account yourself and connect it. No balance is ever guessed."));

    var channels = U.el("ul", { class: "price-offer-list" });
    CHANNELS.forEach(function (c) { channels.appendChild(U.el("li", {}, c.name + " — " + c.note)); });
    root.appendChild(U.el("div", { class: "api-panel" }, [U.el("h3", {}, "Selling channels"), channels]));

    var store = U.el("input", { class: "price-input", type: "text", placeholder: "Shopify store domain, e.g. allbirds.com", "aria-label": "Shopify store domain" });
    var product = U.el("input", { class: "price-input", type: "text", placeholder: "Product name", "aria-label": "Product name" });
    var btn = U.el("button", { class: "btn btn-primary", type: "button" }, "Search store");
    var out = U.el("div", { class: "api-meta" }, "Buyer catalog search only — this is not your seller balance.");
    btn.addEventListener("click", function () {
      out.textContent = "Searching…";
      if (!global.PriceScout) { out.textContent = "Price Scouts did not load. Reload and try again."; return; }
      global.PriceScout.getProducts(store.value, product.value).then(function (r) {
        if (r.status === "error") { out.textContent = r.note; return; }
        if (!r.offers || !r.offers.length) { out.textContent = "No matching products in that store's catalog."; return; }
        out.innerHTML = "";
        var list = U.el("ul", { class: "price-offer-list" });
        r.offers.forEach(function (o) { list.appendChild(U.el("li", {}, o.title + (o.variant ? " (" + o.variant + ")" : "") + " — $" + o.price + (o.available ? "" : " (unavailable)"))); });
        out.appendChild(list);
      });
    });
    root.appendChild(U.el("div", { class: "api-panel" }, [U.el("h3", {}, "Shopify store search (buyer catalog)"), U.el("div", { class: "price-input-row" }, [store, product, btn]), out]));
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.accounts = { render: render };
})(window);
