const BANRI_SHARED_SCRIPTS = [
  { src: "/assets/js/banri-theme.js?v=20260808a" },
  { src: "/assets/js/firebase-auth.js?v=20260808c", type: "module" },
  { src: "/assets/js/music-player.js?v=20260808b" }
];

function ensureBanriFavicon() {
  const existing = document.querySelector("link[rel~='icon']");
  if (existing) return;

  const icon = document.createElement("link");
  icon.rel = "icon";
  icon.type = "image/svg+xml";
  icon.href = "/assets/favicon.svg";
  document.head.appendChild(icon);
}

function loadBanriScript({ src, type }) {
  const baseSrc = src.split("?")[0];
  const existing = Array.from(document.scripts).find((script) => script.src.includes(baseSrc));
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    if (type) script.type = type;
    script.dataset.banriShared = "true";
    script.addEventListener("load", () => resolve(script), { once: true });
    script.addEventListener("error", () => reject(new Error(`Unable to load ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

function loadBanriSharedScripts() {
  BANRI_SHARED_SCRIPTS.forEach((script) => {
    loadBanriScript(script)
      .then(() => {
        if (window.BanriTheme && typeof window.BanriTheme.init === "function") {
          window.BanriTheme.init();
        }
      })
      .catch((error) => {
        console.warn(error.message);
      });
  });
}

function includeHTML() {
  ensureBanriFavicon();
  var z, i, elmnt, file, xhttp;
  /* Loop through a collection of all HTML elements: */
  z = document.getElementsByTagName("*");
  for (i = 0; i < z.length; i++) {
    elmnt = z[i];
    /*search for elements with a certain atrribute:*/
    file = elmnt.getAttribute("w3-include-html");
    if (file) {
      /* Make an HTTP request using the attribute value as the file name: */
      xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4) {
          if (this.status == 200) {elmnt.innerHTML = this.responseText;}
          if (this.status == 404) {elmnt.innerHTML = "Page not found.";}
          /* Remove the attribute, and call this function once more: */
          elmnt.removeAttribute("w3-include-html");
          includeHTML();
        }
      }
      xhttp.open("GET", file, true);
      xhttp.send();
      /* Exit the function: */
      return;
    }
  }

  document.dispatchEvent(new CustomEvent("banri:includes-ready"));
  loadBanriSharedScripts();
  if (window.BanriTheme && typeof window.BanriTheme.init === "function") {
    window.BanriTheme.init();
  }
}
