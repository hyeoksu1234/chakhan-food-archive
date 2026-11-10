"use strict";

const products = window.catalogProducts;
const filters = document.querySelector("#filters");
const results = document.querySelector("#products");
const query = document.querySelector("#query");
const coupangOnly = document.querySelector("#coupang-only");
const count = document.querySelector("#count");
const empty = document.querySelector("#empty");
const more = document.querySelector("#more");
const dialog = document.querySelector("#details");
const detail = document.querySelector("#detail-content");
const pageSize = 12;

const categories = ["가공식품", "전체", "들기름", "참기름", "고춧가루", "깨·가루", "세트"];

let category = "가공식품";
let visible = pageSize;

function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content) node.textContent = content;
  if (className) node.className = className;
  return node;
}

function canonical(text) {
  return text.normalize("NFKC").toLowerCase().replace(/[\s·ㆍ-]+/g, "")
    .replaceAll("고추가루", "고춧가루").replaceAll("국내산", "국산");
}

function categoryLabel(product) {
  return product.kind ? product.category + " · " + product.kind : product.category;
}

function hasCoupangLink(product) {
  return product.purchase?.some(purchase => purchase.affiliate === "coupang");
}

function productSize(product) {
  return product.coupangSize ?? product.size;
}

function productImage(product, className, lazy = false) {
  const frame = element("div", "", className);
  const image = element("img");
  image.alt = "";
  image.width = 212;
  image.height = 212;
  image.loading = lazy ? "lazy" : "eager";
  image.decoding = "async";
  image.addEventListener("error", () => frame.remove(), { once: true });
  image.src = product.thumbnail;
  frame.append(image);
  return frame;
}

function makeCard(product, index) {
  const card = element("article", "", "product-card");
  if (product.thumbnail) card.append(productImage(product, "card-photo", index >= 4));
  const heading = element("h3");
  const button = element("button", product.name, "card-title");
  button.type = "button";
  button.dataset.product = product.id;
  button.setAttribute("aria-haspopup", "dialog");
  heading.append(button);
  const specs = element("p", "", "card-specs");
  specs.append(element("span", product.maker), element("span", productSize(product)));
  const bottom = element("div", "", "card-bottom");
  const ingredientSummary = product.ingredients.length > 3
    ? "국산 " + product.ingredients.length + "종"
    : "국산 " + product.ingredients.map(([name, , amount]) =>
      product.ingredients.length === 1 && amount ? name + " " + amount : name
    ).join(" · ");
  bottom.append(element("span", "원재료"), element("strong", ingredientSummary));
  card.append(element("p", product.kind ?? product.category, "card-kind"), heading, specs, bottom);
  return card;
}

function render() {
  const terms = query.value.trim().split(/\s+/).filter(Boolean).map(canonical);
  const matches = products.filter(product => {
    if (category !== "전체" && product.category !== category) return false;
    if (coupangOnly?.checked && !hasCoupangLink(product)) return false;
    const words = canonical([product.name, product.maker, productSize(product), categoryLabel(product), ...product.ingredients.flat()].join(" "));
    return terms.every(term => words.includes(term));
  });
  results.replaceChildren(...matches.slice(0, visible).map(makeCard));
  count.textContent = "상품 " + matches.length + "개";
  empty.hidden = matches.length > 0;
  empty.textContent = coupangOnly?.checked
    ? "이 조건에 맞는 쿠팡 상품이 없습니다. 다른 분류를 보거나 쿠팡 필터를 꺼 보세요."
    : "검색 결과가 없습니다. 다른 상품명이나 원재료로 검색해 보세요.";
  more.hidden = visible >= matches.length;
}

function makeLink(label, href, className, sponsored = false) {
  const link = element("a", label + " ↗", className);
  link.href = href;
  link.target = "_blank";
  link.rel = sponsored ? "noopener noreferrer sponsored" : "noopener noreferrer";
  return link;
}

function coupangCopyControls(url) {
  const button = element("button", "쿠팡 링크 복사", "outline");
  button.type = "button";
  const address = element("input", "", "copy-address");
  address.type = "url";
  address.value = url;
  address.readOnly = true;
  address.hidden = true;
  address.setAttribute("aria-label", "쿠팡 구매 링크");
  const status = element("p", "", "copy-status");
  status.setAttribute("role", "status");
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(url);
      address.hidden = true;
      status.textContent = "복사했습니다. 다른 브라우저의 주소창에 붙여 넣으세요.";
    } catch {
      address.hidden = false;
      address.focus();
      address.select();
      status.textContent = "선택된 주소를 복사해 다른 브라우저에서 열어 주세요.";
    }
  });
  return { button, address, status };
}

function showDetail(product) {
  const purchases = product.purchase ?? [];
  const coupangPurchase = purchases.find(purchase => purchase.affiliate === "coupang");
  const table = element("table", "", "detail-table");
  const header = table.createTHead().insertRow();
  for (const label of ["원재료", "원산지", "표시 함량"]) {
    const th = element("th", label);
    th.scope = "col";
    header.append(th);
  }
  const body = table.createTBody();
  for (const ingredient of product.ingredients) {
    const tr = body.insertRow();
    for (const value of ingredient) tr.append(element("td", value ?? "미표시"));
  }

  const title = element("h2", product.name, "detail-title");
  title.id = "detail-title";
  if (product.category === "세트") table.createCaption().textContent = "함량은 구성품별 표시를 기준으로 합니다.";
  const evidence = element("div", "", "evidence");
  evidence.append(
    element("h3", "확인 근거", "detail-heading"),
    element("p", product.evidence, "evidence-quote"),
    element("p", product.source + " 상품정보 · " + product.checkedAt + " 확인", "evidence-meta"),
    makeLink("원재료 표기 원문", product.url, "evidence-link")
  );
  const links = element("div", "", "detail-links");
  for (const purchase of purchases) {
    links.append(makeLink(purchase.label, purchase.url, links.childElementCount ? "outline" : "primary", purchase.affiliate === "coupang"));
  }
  const copy = coupangPurchase ? coupangCopyControls(coupangPurchase.url) : null;
  if (copy) links.append(copy.button);
  if (!purchases.length || product.source !== "쿠팡") {
    const sourceLabel = product.coupangSize ? product.source + "에서 " + product.size + " 보기" : product.source + "에서 보기";
    links.append(makeLink(sourceLabel, product.url, purchases.length ? "outline" : "primary"));
  }
  const overview = element("div", "", "detail-overview");
  if (product.thumbnail) overview.append(productImage(product, "detail-photo"));
  const summary = element("div", "", "detail-summary");
  summary.append(element("p", categoryLabel(product), "detail-category"), title,
    element("p", [product.maker, productSize(product)].join(" · "), "detail-meta"));
  overview.append(summary);
  const facts = element("section", "", "detail-facts");
  facts.append(element("h3", "원재료와 원산지", "detail-heading"), table, evidence);
  const buy = element("section", "", "detail-purchase");
  buy.append(element("h3", "구매처", "detail-heading"),
    ...(coupangPurchase ? [element("p", "이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.", "affiliate-note")] : []), links,
    ...(copy ? [element("p", "앱 안에서 쿠팡이 열리지 않으면 링크를 복사해 웹 브라우저에서 열어 보세요.", "link-note"), copy.address, copy.status] : []),
    element("p", "가격과 판매 상태는 구매처에서 확인할 수 있습니다.", "link-note")
  );
  detail.replaceChildren(overview, facts, buy);
  dialog.showModal();
  dialog.scrollTop = 0;
}

for (const label of categories) {
  const button = element("button", label, "filter");
  button.setAttribute("aria-controls", "products");
  button.type = "button";
  button.setAttribute("aria-pressed", String(label === category));
  button.addEventListener("click", () => {
    category = label;
    visible = pageSize;
    for (const filter of filters.children) filter.setAttribute("aria-pressed", String(filter === button));
    render();
  });
  filters.append(button);
}

query.addEventListener("input", () => {
  visible = pageSize;
  render();
});
coupangOnly?.addEventListener("change", () => {
  visible = pageSize;
  render();
});
query.form.addEventListener("submit", event => {
  event.preventDefault();
  document.querySelector("#catalog-title").focus();
});
results.addEventListener("click", event => {
  const button = event.target.closest("[data-product]");
  if (button) showDetail(products.find(product => product.id === button.dataset.product));
});
more.addEventListener("click", () => {
  const next = visible;
  visible += pageSize;
  render();
  results.children[next]?.querySelector("button").focus();
});
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});

render();
