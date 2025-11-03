// ==== CONFIG ====
const GITHUB_USERNAME = "cgarryZA";

// For LinkedIn embed, set ONE of these:
// 1) Preferred: the numeric activity id (from your post URL), e.g. "7222334455667788990"
const LINKEDIN_ACTIVITY_ID = ""; // <= put id here if you have it

// 2) Or: paste the full public post URL; we'll try to extract the id.
const LINKEDIN_POST_URL = ""; // e.g. "https://www.linkedin.com/feed/update/urn:li:activity:7222334455667788990/"

// Optional: profile URL used as a fallback link
const LINKEDIN_PROFILE_URL = "https://www.linkedin.com/in/christian-tt-garry"; // put your /in/… here if you want

// ---- DOM helpers ----
const $ = (sel) => document.querySelector(sel);
function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function setLinkOrText(id, label, val, href) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!val) { el.style.display = "none"; return; }
  if (href) el.innerHTML = `${label}: <a href="${href}" target="_blank" rel="noreferrer noopener">${val}</a>`;
  else el.textContent = `${label}: ${val}`;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) =>
    ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])
  );
}

// ==== Profile (REST v3) ====
async function loadProfile() {
  const res = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}`);
  if (!res.ok) throw new Error(`GitHub API error (${res.status})`);
  const u = await res.json();

  const avatar = document.getElementById("avatar");
  if (avatar) avatar.src = u.avatar_url || `https://github.com/${GITHUB_USERNAME}.png`;
  setText("name", u.name || GITHUB_USERNAME);
  setText("login", "@" + (u.login || GITHUB_USERNAME));
  setText("bio", u.bio || "");

  setText("followers", `${u.followers ?? 0} followers`);
  setText("following", `${u.following ?? 0} following`);
  setText("public-repos", `${u.public_repos ?? 0} repos`);

  setLinkOrText("location", "📍 Location", u.location);
  setLinkOrText("company", "🏢 Company", u.company);
  setLinkOrText(
    "twitter", "𝕏 Twitter",
    u.twitter_username,
    u.twitter_username ? `https://twitter.com/${u.twitter_username}` : null
  );

  let blog = u.blog;
  if (blog && !/^https?:\/\//i.test(blog)) blog = "https://" + blog;
  setLinkOrText("blog", "🔗 Website", blog, blog);

  const gw = $("#gw");
  if (gw) {
    const params = new URLSearchParams({ theme: "Classic" });
    gw.src = `https://green-wall.leoku.dev/api/og/share/${encodeURIComponent(GITHUB_USERNAME)}?${params.toString()}`;
  }
}

// ==== Latest Repo (REST v3) ====
async function loadLatestRepo() {
  const res = await fetch(
    `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`
  );
  if (!res.ok) return;

  const repos = (await res.json())
    .filter((r) => !r.fork)
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));

  const latest = repos[0];
  if (!latest) return;

  setText("repo-name", latest.name);
  const descEl = document.getElementById("repo-desc");
  if (descEl) descEl.innerHTML = latest.description ? escapeHtml(latest.description) : "No description";
  const langEl = document.getElementById("repo-lang");
  if (langEl) langEl.textContent = latest.language ? `💻 ${latest.language}` : "";
  const starsEl = document.getElementById("repo-stars");
  if (starsEl) starsEl.textContent = `⭐ ${latest.stargazers_count}`;
  const updEl = document.getElementById("repo-updated");
  if (updEl) updEl.textContent = `🕒 Updated ${new Date(latest.pushed_at).toLocaleDateString()}`;

  const link = document.getElementById("latest-link");
  if (link) {
    link.href = latest.html_url;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    link.title = `Open ${latest.full_name} on GitHub`;
  }
}

// ==== LinkedIn embed (no API, just iframe) ====
function parseActivityIdFromUrl(u) {
  if (!u) return null;
  // supports urls like:
  // - https://www.linkedin.com/feed/update/urn:li:activity:7222334455667788990/
  // - https://www.linkedin.com/posts/...-activity-7222334455667788990-...
  const m1 = u.match(/urn:li:activity:(\d+)/i);
  if (m1) return m1[1];
  const m2 = u.match(/activity[-:](\d+)/i);
  if (m2) return m2[1];
  return null;
}

function loadLinkedIn() {
  const container = document.getElementById("li-embed");
  const fallback = document.getElementById("li-link");
  if (!container || !fallback) return;

  const id = LINKEDIN_ACTIVITY_ID || parseActivityIdFromUrl(LINKEDIN_POST_URL);
  const linkHref = LINKEDIN_POST_URL || (LINKEDIN_PROFILE_URL || "#");
  fallback.href = linkHref;

  if (!id) {
    // No id found—show link only.
    return;
  }

  // Build iframe for the public embed
  const src = `https://www.linkedin.com/embed/feed/update/urn:li:activity:${id}`;
  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.width = "100%";
  iframe.height = "520";           // tweak height if your post is long
  iframe.style.border = "0";
  iframe.style.borderRadius = "12px";
  iframe.allowFullscreen = true;
  iframe.loading = "lazy";

  // Replace fallback link with iframe
  container.innerHTML = "";
  container.appendChild(iframe);
}

// ==== Init ====
window.addEventListener("DOMContentLoaded", async () => {
  try { await loadProfile(); } catch (e) { console.error(e); }
  try { await loadLatestRepo(); } catch (e) { console.error(e); }
  loadLinkedIn();
});
