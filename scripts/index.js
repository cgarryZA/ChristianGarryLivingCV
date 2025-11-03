// ===== CONFIG =====
const GITHUB_USERNAME = "cgarryZA";
const LI_JSON_URL = "data/linkedin.json"; // manual JSON file

// ---- helpers
const $ = (s) => document.querySelector(s);

function setText(id, t) {
  const el = document.getElementById(id);
  if (el != null) el.textContent = t;
}

function setLinkOrText(id, label, val, href) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!val) {
    el.style.display = "none";
    return;
  }
  el.innerHTML = href
    ? `${label}: <a href="${href}" target="_blank" rel="noreferrer noopener">${val}</a>`
    : `${label}: ${val}`;
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        m
      ])
  );
}

function extractActivityId(url) {
  if (!url) return null;
  const m1 = url.match(/urn:li:activity:(\d+)/i);
  if (m1) return m1[1];
  const m2 = url.match(/activity[-:](\d+)/i);
  return m2 ? m2[1] : null;
}

const nf = new Intl.NumberFormat();

// ===== GitHub block =====
async function loadGithub() {
  const r = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}`);
  if (!r.ok) throw new Error(`GH profile ${r.status}`);
  const u = await r.json();

  const av = $("#avatar");
  if (av) av.src = u.avatar_url || `https://github.com/${GITHUB_USERNAME}.png`;
  setText("name", u.name || GITHUB_USERNAME);
  setText("login", "@" + (u.login || GITHUB_USERNAME));
  setText("bio", u.bio || "");

  setText("followers", `${nf.format(u.followers ?? 0)} followers`);
  setText("following", `${nf.format(u.following ?? 0)} following`);
  setText("public-repos", `${nf.format(u.public_repos ?? 0)} repos`);

  setLinkOrText("location", "📍 Location", u.location);
  setLinkOrText("company", "🏢 Company", u.company);

  let blog = u.blog;
  if (blog && !/^https?:\/\//i.test(blog)) blog = "https://" + blog;
  setLinkOrText("blog", "🔗 Website", blog, blog);

  // Set the invisible full-card link to GitHub profile
  const ghUrl = u.html_url || `https://github.com/${GITHUB_USERNAME}`;
  const ghA = document.getElementById("gh-url");
  if (ghA) ghA.href = ghUrl;

  // Green-Wall banner
  const gw = $("#gw");
  if (gw) {
    const qs = new URLSearchParams({ theme: "Classic" });
    gw.src = `https://green-wall.leoku.dev/api/og/share/${encodeURIComponent(
      GITHUB_USERNAME
    )}?${qs}`;
  }
}

// ===== Latest repo card =====
async function loadLatestRepo() {
  const r = await fetch(
    `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`
  );
  if (!r.ok) return;
  const repos = (await r.json())
    .filter((x) => !x.fork)
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
  const latest = repos[0];
  if (!latest) return;

  setText("repo-name", latest.name);
  const descEl = document.getElementById("repo-desc");
  if (descEl)
    descEl.innerHTML = latest.description
      ? escapeHtml(latest.description)
      : "No description";
  setText("repo-lang", latest.language ? `💻 ${latest.language}` : "");
  setText("repo-stars", `⭐ ${nf.format(latest.stargazers_count)}`);
  setText(
    "repo-updated",
    `🕒 Updated ${new Date(latest.pushed_at).toLocaleDateString()}`
  );

  const link = document.getElementById("latest-link");
  if (link) {
    link.href = latest.html_url;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
  }
}

// ===== LinkedIn from local JSON =====
async function loadLinkedIn() {
  const r = await fetch(LI_JSON_URL, { cache: "no-store" });
  if (!r.ok) {
    console.warn("[LI] data/linkedin.json not found");
    return;
  }
  const j = await r.json();

  // avatar (distinct from GitHub)
  if (j.avatar) {
    const liAv = document.getElementById("li-avatar");
    if (liAv) liAv.src = j.avatar;
  }

  if (j.name) setText("li-name", j.name);
  if (j.handle) setText("li-handle", `/in/${j.handle}`);
  if (j.headline) setText("li-headline", j.headline);

  const profileUrl = j.handle
    ? `https://www.linkedin.com/in/${j.handle}/`
    : j.profile || "#";

  // Set the invisible full-card link to LinkedIn profile
  const liA = document.getElementById("li-url");
  if (liA) liA.href = profileUrl;

  if (Number.isFinite(j.followers))
    setText("li-followers", `${nf.format(j.followers)} followers`);
  if (Number.isFinite(j.connections))
    setText("li-connections", `${nf.format(j.connections)} connections`);

  // Latest post (optional)
  const postUrl = j.latestPost;
  const fb = document.getElementById("li-fallback");
  if (fb) fb.href = postUrl || profileUrl;

  const actId = extractActivityId(postUrl);
  if (!actId) return;

  // ===== (CHANGED) Build scaled, non-scrolling embed =====
  const container = document.getElementById("li-embed");
  if (!container) return;

  // Clear any fallback
  container.innerHTML = "";

  // Create viewport (fixed visible height, no inner scrollbar)
  const viewport = document.createElement("div");
  viewport.className = "li-viewport";

  // Create scaler (uniformly shrink the iframe while keeping full width)
  const scaler = document.createElement("div");
  scaler.className = "li-scaler";

  // Official LinkedIn iframe
  const iframe = document.createElement("iframe");
  iframe.className = "li-iframe";
  iframe.src = `https://www.linkedin.com/embed/feed/update/urn:li:activity:${actId}`;
  iframe.loading = "lazy";
  iframe.allowFullscreen = true;

  scaler.appendChild(iframe);
  viewport.appendChild(scaler);
  container.appendChild(viewport);

  // (Optional) small link beneath preview:
  // const open = document.createElement("a");
  // open.className = "li-open";
  // open.href = postUrl;
  // open.target = "_blank";
  // open.rel = "noreferrer noopener";
  // open.textContent = "Open on LinkedIn →";
  // container.appendChild(open);
}

// ===== init =====
window.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadGithub();
  } catch (e) {
    console.error(e);
  }
  try {
    await loadLatestRepo();
  } catch (e) {
    console.error(e);
  }
  try {
    await loadLinkedIn();
  } catch (e) {
    console.error(e);
  }
});
