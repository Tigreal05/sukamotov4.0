/* Klien API tipis. Semua komunikasi ke backend lewat SM.api(). */
window.SM = window.SM || {};
SM.api = async function (path, options) {
  var opts = options || {};
  var init = { method: opts.method || "GET", headers: {} };
  if (opts.body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(opts.body);
  }
  var res, data = null;
  try {
    res = await fetch(path, init);
  } catch (e) {
    var netErr = new Error("Tidak dapat terhubung ke server.");
    netErr.errors = [];
    throw netErr;
  }
  try { data = await res.json(); } catch (e) { /* respons bukan JSON */ }
  if (!res.ok || !data || data.success === false) {
    var err = new Error((data && data.message) || "Terjadi kesalahan.");
    err.status = res.status;
    err.errors = (data && data.errors) || [];
    throw err;
  }
  return data;
};
