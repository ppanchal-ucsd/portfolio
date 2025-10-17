console.log("IT'S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// {
//   const navLinks = $$("nav a");
//   const currentLink = navLinks.find(
//     (a) => a.host === location.host && a.pathname === location.pathname
//   );
//   currentLink?.classList.add("current");
// }

// STEP 3 — automatic navigation with correct paths & current highlighting
{
  const pages = [
      { url: "",          title: "Home" },
      { url: "projects/", title: "Projects" },
      { url: "resume/",   title: "Resume" },
      { url: "contact/",  title: "Contact" },
    // add all your other internal pages here
    { url: "https://github.com/ppanchal-ucsd/portfolio", title: "GitHub" },
  ];

  // Change '/<repo-name>/' to your GitHub Pages repo name (if deploying)
  const BASE_PATH =
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
      ? "/"
      : "/<repo-name>/";

  const nav = document.createElement("nav");
  document.body.prepend(nav);

  for (const p of pages) {
    let url = p.url;
    // Prefix internal links with BASE_PATH; leave absolute URLs alone
    url = !url.startsWith("http") ? BASE_PATH + url : url;

    const a = document.createElement("a");
    a.href = url;
    a.textContent = p.title;

    // highlight the current page
    a.classList.toggle(
      "current",
      a.host === location.host && a.pathname === location.pathname
    );

    // open external links in a new tab
    a.toggleAttribute("target", a.host !== location.host);
    if (a.target) a.target = "_blank";

    nav.append(a);
  }
}

// Insert a 3-state Theme switch (Automatic / Light / Dark)
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

