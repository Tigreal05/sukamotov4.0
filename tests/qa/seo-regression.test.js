// Phase 8 — SEO regression tests.
// Menjamin: metadata unik, canonical + substitusi SITE_URL, robots meta benar,
// sitemap/robots.txt valid, admin/API non-indexable, JSON-LD parseable, H1 ada.
const test = require("node:test");
const assert = require("node:assert/strict");

// SITE_URL diset sebelum createApp agar canonical/og:url/sitemap/robots memakai origin
// yang sama dengan server uji (self-referencing absolut).
process.env.NODE_ENV = process.env.NODE_ENV || "test";
const { createApp } = require("../../src/app");

const app = createApp();
let server, origin;

test.before(async () => {
  await new Promise((r) => { server = app.listen(0, "127.0.0.1", r); });
  origin = `http://127.0.0.1:${server.address().port}`;
  process.env.SITE_URL = origin; // route dinamis & substitusi HTML membaca nilai ini per-request
});
test.after(() => new Promise((r) => server.close(r)));

const PUBLIC_PAGES = ["/", "/graduates/", "/wedding/", "/event/", "/invinite/"];

async function get(url) {
  const res = await fetch(origin + url);
  return { status: res.status, type: res.headers.get("content-type") || "", body: await res.text() };
}

function meta(content, prop) {
  const re = new RegExp(`<meta\\s+(?:property|name)="${prop}"\\s+content="([^"]*)"`);
  const m = content.match(re);
  return m ? m[1] : null;
}

test("setiap halaman publik: title unik, description unik, canonical sesuai URL sendiri", async () => {
  const titles = new Set(), descs = new Set();
  for (const p of PUBLIC_PAGES) {
    const r = await get(p);
    assert.equal(r.status, 200, `${p} harus 200`);
    const title = (r.body.match(/<title>([^<]*)<\/title>/i) || [])[1];
    const desc = meta(r.body, "description");
    const canonical = (r.body.match(/<link rel="canonical" href="([^"]+)"/i) || [])[1];
    assert.ok(title && title.length >= 15 && title.length <= 65, `${p}: title 15-65 char -> "${title}"`);
    assert.ok(desc && desc.length >= 60 && desc.length <= 170, `${p}: description 60-170 char -> panjang ${desc && desc.length}`);
    assert.equal(canonical, origin + p, `${p}: canonical harus absolut dan cocok dengan URL sendiri (SITE_URL tersubstitusi)`);
    assert.doesNotMatch(r.body, /__SITE_URL__/, `${p}: placeholder domain tidak boleh bocor ke respons`);
    assert.ok(!titles.has(title), `${p}: title duplikat`);
    assert.ok(!descs.has(desc), `${p}: description duplikat`);
    titles.add(title); descs.add(desc);
  }
});

test("halaman publik: index,follow + OG lengkap + Twitter card + H1 tepat satu", async () => {
  for (const p of PUBLIC_PAGES) {
    const r = await get(p);
    assert.match(r.body, /<meta name="robots" content="index, follow">/, `${p}: robots index,follow`);
    for (const prop of ["og:title", "og:description", "og:type", "og:url", "og:image", "og:site_name"]) {
      assert.ok(meta(r.body, prop), `${p}:缺少 ${prop}`);
    }
    assert.ok((meta(r.body, "og:image") || "").startsWith(origin), `${p}: og:image harus absolut dari domain sendiri`);
    assert.equal(meta(r.body, "twitter:card"), "summary_large_image", `${p}: twitter:card`);
    assert.ok(meta(r.body, "twitter:image"), `${p}: twitter:image`);
    const h1s = r.body.match(/<h1[\s>]/gi) || [];
    assert.equal(h1s.length, 1, `${p}: harus punya tepat 1 H1 (dapat ${h1s.length})`);
  }
});

test("demo-dark: noindex,follow dan tidak masuk sitemap", async () => {
  const r = await get("/invinite/demo-dark/");
  assert.equal(r.status, 200);
  assert.match(r.body, /<meta name="robots" content="noindex, follow">/, "demo harus noindex,follow");
  const sm = await get("/sitemap.xml");
  assert.doesNotMatch(sm.body, /demo-dark/, "demo tidak boleh masuk sitemap");
});

test("404: status HTTP 404 asli (bukan soft-404), noindex, link kembali ke beranda", async () => {
  const r = await get("/halaman-yang-tidak-ada");
  assert.equal(r.status, 404);
  assert.match(r.body, /noindex/i);
  assert.match(r.body, /Kembali ke Beranda/);
});

test("robots.txt: mengizinkan /, men-disallow /admin/ dan /api/, memuat Sitemap absolut", async () => {
  const r = await get("/robots.txt");
  assert.equal(r.status, 200);
  assert.match(r.type, /text\/plain/);
  assert.match(r.body, /^User-agent: \*/m);
  assert.match(r.body, /^Allow: \/$/m);
  assert.match(r.body, /^Disallow: \/admin\//m);
  assert.match(r.body, /^Disallow: \/api\//m);
  assert.doesNotMatch(r.body, /^Disallow: \/$/m, "jangan memblokir seluruh situs");
  assert.match(r.body, new RegExp(`^Sitemap: ${origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/sitemap\\.xml$`, "m"));
});

test("sitemap.xml: XML valid, hanya halaman publik yang layak index, URL absolut", async () => {
  const r = await get("/sitemap.xml");
  assert.equal(r.status, 200);
  assert.match(r.type, /application\/xml/);
  assert.match(r.body, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(r.body, /<\/urlset>\s*$/, "sitemap harus tertutup rapi (well-formed)");
  // Tidak ada tag menggantung sederhana: jumlah <url> == jumlah </url>
  assert.equal((r.body.match(/<url>/g) || []).length, (r.body.match(/<\/url>/g) || []).length);
  for (const p of PUBLIC_PAGES) assert.ok(r.body.includes(`${origin}${p}<`), `sitemap harus memuat ${p}`);
  for (const banned of ["/admin", "/api", "404"]) assert.doesNotMatch(r.body, new RegExp(banned), `sitemap tidak boleh memuat ${banned}`);
});

test("JSON-LD semua halaman: parseable, tanpa data fiktif (rating/review/aggregate)", async () => {
  for (const p of [...PUBLIC_PAGES, "/invinite/demo-dark/"]) {
    const r = await get(p);
    const blocks = [...r.body.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)];
    for (const b of blocks) {
      const json = JSON.parse(b[1]); // akan melempar bila tidak valid
      const s = JSON.stringify(json);
      assert.doesNotMatch(s, /aggregateRating|review|ratingValue/i, `${p}: structured data memuat rating/review fiktif`);
    }
  }
  const home = await get("/");
  assert.match(home.body, /"@type":\s*"Organization"/);
  assert.match(home.body, /"@type":\s*"FAQPage"/);
});

test("API responses: X-Robots-Tag noindex + tidak pernah HTML indexable", async () => {
  const res = await fetch(origin + "/api/health");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("x-robots-tag"), "noindex, nofollow");
  const nf = await fetch(origin + "/api/random-endpoint");
  assert.equal(nf.headers.get("x-robots-tag"), "noindex, nofollow");
});

test("halaman admin (bila dibuat nanti): wajib noindex — guard regresi", async () => {
  for (const p of ["/admin/", "/admin/login.html"]) {
    const res = await fetch(origin + p);
    if (res.status === 404) continue; // modul admin belum ada di repo ini (temuan Phase 6)
    const body = await res.text();
    assert.match(body, /noindex/i, `${p}: admin page wajib noindex`);
  }
});

test("favicon & apple-touch-icon tersedia dan diserve", async () => {
  for (const p of ["/assets/images/favicon.svg", "/favicon.ico", "/apple-touch-icon.png", "/assets/images/og-image.jpg"]) {
    const res = await fetch(origin + p);
    assert.equal(res.status, 200, `${p} harus tersedia`);
  }
});

test("attribute lang, charset, viewport ada di semua halaman publik", async () => {
  for (const p of PUBLIC_PAGES) {
    const r = await get(p);
    assert.match(r.body, /<html lang="id">/i, `${p}: lang=id`);
    assert.match(r.body, /<meta charset="UTF-8">/i, `${p}: charset`);
    assert.match(r.body, /width=device-width/, `${p}: viewport`);
  }
});
