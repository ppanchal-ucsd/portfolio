export async function fetchJSON(url) {
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) {
    throw new Error(`fetchJSON failed: ${res.status} ${res.statusText} for ${url}`);
  }
  return await res.json();
}

console.log("IT'S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

export function renderProjects(projects, containerEl, headingLevel = 'h2') {
  if (!containerEl) return;
  containerEl.innerHTML = '';
  for (const p of projects) {
    const yearText = (p.year !== undefined && p.year !== null && p.year !== '') ? ` (${p.year})` : '';
    const article = document.createElement('article');
    article.innerHTML = `
      <${headingLevel}>${p.title}${yearText}</${headingLevel}>
      <img src="${p.image}" alt="${p.title}">
      <p>${p.description}</p>
    `;
    containerEl.appendChild(article);
  }
}

{
  const pages = [
    { url: "",           title: "Home" },
    { url: "projects/",  title: "Projects" },
    { url: "resume/",    title: "Resume" },
    { url: "contact/",   title: "Contact" },
    { url: "meta/",      title: "Meta" },
    { url: "https://github.com/ppanchal-ucsd/portfolio", title: "GitHub" },
  ];

  const baseMeta = document.querySelector('meta[name="site-base"]');
  const BASE_PATH = baseMeta?.content ??
    (location.hostname === "localhost" || location.hostname === "127.0.0.1" ? "/" : "/portfolio/");

  const nav = document.createElement("nav");
  const mount = document.querySelector("header") || document.body;
  mount.prepend(nav);

  const normalizePath = (p) =>
    (p || "/").replace(/index\.html$/, "").replace(/\/+$/, "/") || "/";
  const here = normalizePath(location.pathname);

  for (const p of pages) {
    let href = p.url;
    if (!/^https?:\/\//i.test(href)) {
      href = BASE_PATH.replace(/\/$/, "/") + href;
    }
    const a = document.createElement("a");
    a.href = href;
    a.textContent = p.title;

    if (a.host !== location.host) a.target = "_blank";

    const targetPath = normalizePath(new URL(a.href).pathname);
    if (targetPath === here) a.classList.add("current");

    nav.append(a);
  }
}

document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme">
    Theme:
    <select id="theme-switch">
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
`
);

{
  const select = document.querySelector("#theme-switch");

  function setColorScheme(value) {
    document.documentElement.style.setProperty("color-scheme", value);
    if (select) select.value = value;
  }

  if ("colorScheme" in localStorage) {
    setColorScheme(localStorage.colorScheme);
  }

  select?.addEventListener("input", (event) => {
    const value = event.target.value;
    setColorScheme(value);
    localStorage.colorScheme = value;
  });
}

export async function fetchGitHubData(username) {
  if (!username) throw new Error('fetchGitHubData: missing username');
  return await fetchJSON(`https://api.github.com/users/${encodeURIComponent(username)}`);
}



