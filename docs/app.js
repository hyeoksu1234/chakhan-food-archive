"use strict";

const products = window.catalogProducts;
const filters = document.querySelector("#filters");
const results = document.querySelector("#products");
const query = document.querySelector("#query");
const count = document.querySelector("#count");
const empty = document.querySelector("#empty");
const more = document.querySelector("#more");
const dialog = document.querySelector("#details");
const detail = document.querySelector("#detail-content");
const pageSize = 12;

const categories = ["전체", "들기름", "참기름", "고춧가루", "깨·가루", "세트"];
const productCodes = new Map(products.map((item, index) => [
  item.id, String(index + 1).padStart(2, "0")
]));

let category = "전체";
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

function makeCard(product) {
  const card = element("article", "", "product-card");
  const meta = element("div", "", "card-meta");
  meta.append(element("span", product.category), element("span", "기록 " + productCodes.get(product.id), "card-code"));
  const heading = element("h3");
  const button = element("button", product.name, "card-title");
  button.type = "button";
  button.dataset.product = product.id;
  button.setAttribute("aria-haspopup", "dialog");
  heading.append(button);
  const bottom = element("div", "", "card-bottom");
  const arrow = element("span", "↗", "card-arrow");
  arrow.setAttribute("aria-hidden", "true");
  const ingredientSummary = product.ingredients.map(([name, , amount]) =>
    product.ingredients.length === 1 ? [name, amount].join(" ") : name
  ).join(" · ");
  bottom.append(element("strong", ingredientSummary + " · 국산"), arrow);
  card.append(meta, heading, element("p", [product.maker, product.size].join(" · "), "card-maker"), bottom);
  return card;
}

function render() {
  const terms = query.value.trim().split(/\s+/).filter(Boolean).map(canonical);
  const matches = products.filter(product => {
    if (category !== "전체" && product.category !== category) return false;
    const words = canonical([product.name, product.maker, product.size, product.category, ...product.ingredients.flat()].join(" "));
    return terms.every(term => words.includes(term));
  });
  results.replaceChildren(...matches.slice(0, visible).map(makeCard));
  count.textContent = "상품 " + matches.length + "개";
  empty.hidden = matches.length > 0;
  more.hidden = visible >= matches.length;
}

function makeLink(label, href, className) {
  const link = element("a", label + " ↗", className);
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function showDetail(product) {
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
    for (const value of ingredient) tr.append(element("td", value));
  }

  document.querySelector("#detail-number").textContent = "기록 " + productCodes.get(product.id) + " / " + product.category;
  const title = element("h2", product.name, "detail-title");
  title.id = "detail-title";
  if (product.category === "세트") table.createCaption().textContent = "함량은 구성품별 표시를 기준으로 합니다.";
  const evidence = element("div", "", "evidence");
  evidence.append(element("p", product.evidence), element("p", product.source + " 상품정보 · 확인 " + product.checkedAt));
  const links = element("div", "", "detail-links");
  links.append(makeLink(product.source + "에서 보기", product.url, "primary"));
  for (const purchase of product.purchase ?? []) links.append(makeLink(purchase.label, purchase.url, "outline"));
  detail.replaceChildren(
    title, element("p", [product.maker, product.size].join(" · "), "detail-meta"),
    element("h3", "원재료와 원산지", "detail-heading"), table, evidence, links,
    element("p", "가격과 판매 상태는 구매처에서 확인할 수 있습니다.", "link-note")
  );
  dialog.showModal();
  dialog.scrollTop = 0;
}

for (const label of categories) {
  const button = element("button", label, "filter");
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
query.form.addEventListener("submit", event => event.preventDefault());
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
