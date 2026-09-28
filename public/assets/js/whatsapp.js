/* Satu sumber nomor & pembentuk link WhatsApp untuk seluruh situs */
window.SM = window.SM || {};
SM.WA_NUMBER = "6285156918852";
SM.waUrl = function (text) {
  return "https://wa.me/" + SM.WA_NUMBER + "?text=" + encodeURIComponent(text);
};
document.querySelectorAll("a[data-wa]").forEach(function (a) {
  a.href = SM.waUrl(a.getAttribute("data-wa"));
  a.target = "_blank";
  a.rel = "noopener";
});
