/* Menu mobile + penanda link aktif */
(function () {
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("nav-menu");
  if (!toggle || !menu) return;
  function setOpen(open) {
    menu.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
  }
  toggle.addEventListener("click", function () { setOpen(!menu.classList.contains("open")); });
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
  var path = location.pathname.replace(/index\.html$/, "");
  menu.querySelectorAll("a[data-page]").forEach(function (a) {
    if (a.getAttribute("data-page") === path) a.setAttribute("aria-current", "page");
  });
})();
