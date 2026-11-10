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

const categories = [
  { label: "가공식품", icon: "prepared", featured: true },
  { label: "전체", icon: "grid" },
  { label: "들기름", image: "perilla-photo.webp" },
  { label: "참기름", image: "sesame-photo.webp" },
  { label: "고춧가루", image: "chili-photo.webp" },
  { label: "깨·가루", image: "seeds-photo.webp" },
  { label: "세트", icon: "package" }
];

const categoryPaths = {
  prepared: "M5 12a7 7 0 0 0 14 0H5z M3 12h18 M9 20h6 M9 4c-2 2 2 3 0 5 M15 4c-2 2 2 3 0 5",
  grid: "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z",
  package: "m4 8 8-4 8 4v8l-8 4-8-4z M4 8l8 4 8-4 M12 12v8 M8 6l8 4"
};

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

function categoryLabel(product) {
  return product.kind ? product.category + " · " + product.kind : product.category;
}

function makeCard(product) {
  const card = element("article", "", "product-card");
  const meta = element("div", "", "card-meta");
  const arrow = element("span", "↗", "card-arrow");
  arrow.setAttribute("aria-hidden", "true");
  meta.append(element("span", categoryLabel(product)), arrow);
  const heading = element("h3");
  const button = element("button", product.name, "card-title");
  button.type = "button";
  button.dataset.product = product.id;
  button.setAttribute("aria-haspopup", "dialog");
  heading.append(button);
  const bottom = element("div", "", "card-bottom");
  const ingredientSummary = product.ingredients.length > 3
    ? "국산 " + product.ingredients.length + "종"
    : "국산 " + product.ingredients.map(([name, , amount]) =>
      product.ingredients.length === 1 && amount ? name + " " + amount : name
    ).join(" · ");
  bottom.append(element("span", "원재료"), element("strong", ingredientSummary));
  card.append(meta, heading, element("p", [product.maker, product.size].join(" · "), "card-maker"), bottom);
  return card;
}

function render() {
  const terms = query.value.trim().split(/\s+/).filter(Boolean).map(canonical);
  const matches = products.filter(product => {
    if (category !== "전체" && product.category !== category) return false;
    const words = canonical([product.name, product.maker, product.size, categoryLabel(product), ...product.ingredients.flat()].join(" "));
    return terms.every(term => words.includes(term));
  });
  results.replaceChildren(...matches.slice(0, visible).map(makeCard));
  count.textContent = "상품 " + matches.length + "개";
  empty.hidden = matches.length > 0;
  more.hidden = visible >= matches.length;
}

function makeLink(label, href, className, sponsored = false) {
  const link = element("a", label + " ↗", className);
  link.href = href;
  link.target = "_blank";
  link.rel = sponsored ? "noopener noreferrer sponsored" : "noopener noreferrer";
  return link;
}

function showDetail(product) {
  const purchases = product.purchase ?? [];
  const hasCoupangPartnersLink = purchases.some(purchase => purchase.affiliate === "coupang");
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

  document.querySelector("#detail-category").textContent = categoryLabel(product);
  const title = element("h2", product.name, "detail-title");
  title.id = "detail-title";
  if (product.category === "세트") table.createCaption().textContent = "함량은 구성품별 표시를 기준으로 합니다.";
  const evidence = element("div", "", "evidence");
  evidence.append(
    element("h3", "확인 근거", "detail-heading"),
    element("p", product.evidence, "evidence-quote"),
    element("p", product.source + " 상품정보 · " + product.checkedAt + " 확인", "evidence-meta")
  );
  const links = element("div", "", "detail-links");
  links.append(makeLink(product.source + "에서 보기", product.url, "primary"));
  for (const purchase of purchases) {
    links.append(makeLink(purchase.label, purchase.url, "outline", purchase.affiliate === "coupang"));
  }
  detail.replaceChildren(
    title,
    ...(hasCoupangPartnersLink ? [element("p", "이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.", "affiliate-note")] : []),
    element("p", [product.maker, product.size].join(" · "), "detail-meta"),
    element("h3", "원재료와 원산지", "detail-heading"), table, evidence,
    element("h3", "구매처", "detail-heading"), links,
    element("p", "가격과 판매 상태는 구매처에서 확인할 수 있습니다.", "link-note")
  );
  dialog.showModal();
  dialog.scrollTop = 0;
}

function categoryVisual({ image, icon }) {
  const visual = element("span", "", "filter-visual");
  visual.setAttribute("aria-hidden", "true");
  if (image) {
    const img = document.createElement("img");
    img.src = "./assets/" + image;
    img.width = 48;
    img.height = 48;
    img.alt = "";
    visual.append(img);
  } else {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", categoryPaths[icon]);
    svg.append(path);
    visual.append(svg);
  }
  return visual;
}

for (const item of categories) {
  const { label } = item;
  const button = element("button", "", "filter");
  button.append(categoryVisual(item), element("span", label, "filter-label"));
  if (item.featured) button.classList.add("filter-featured");
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
