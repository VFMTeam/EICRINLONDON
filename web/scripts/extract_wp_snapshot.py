"""One-off helper: split pages rendered by the old WordPress theme into
content partials for the Next.js site.

Usage: python3 scripts/extract_wp_snapshot.py <snapshot-dir> <web-dir>
The snapshot dir holds raw HTML saved from the running WordPress site.
"""
import json
import re
import sys
from pathlib import Path

snap, web = Path(sys.argv[1]), Path(sys.argv[2])
ORIGIN = "http://localhost:8080"
PAGES = {
    "home": "home.html",
    "about": "about.html",
    "areas": "areas.html",
    "contact": "contact.html",
    "privacy": "privacy.html",
    "cookies": "cookies.html",
    "terms": "terms.html",
    "request-a-quote": "quote.html",
}


def clean(html: str) -> str:
    html = html.replace(ORIGIN + "/wp-content/themes/EICR-London/assets/images/", "/images/")
    html = html.replace(ORIGIN + "/", "/").replace(ORIGIN, "/")
    # WordPress nonces and AJAX-only hidden fields are not used by the new site.
    html = re.sub(r'<input type="hidden" name="(nonce|_wpnonce|_wp_http_referer)"[^>]*>', "", html)
    return html.strip()


def between(html: str, start: str, end: str) -> str:
    i = html.index(start)
    return html[i:html.index(end, i)]


out = web / "content"
(out / "pages").mkdir(parents=True, exist_ok=True)
home = (snap / "home.html").read_text()
body = home[home.index("<body"):]
header = body[body.index('<a class="eicr-skip-link"'):body.index("</header>") + len("</header>")]
footer = between(home, "</main>", '<script type="speculationrules">')[len("</main>"):]
(out / "header.html").write_text(clean(header))
(out / "footer.html").write_text(clean(footer))

theme_css = re.search(r'<style id="eicr-theme-inline-css">(.*?)</style>', home, re.S).group(1)
(web / "public" / "css").mkdir(parents=True, exist_ok=True)
(web / "public" / "css" / "theme-vars.css").write_text(theme_css.strip() + "\n")

meta = {}
for name, file in PAGES.items():
    html = (snap / file).read_text()
    main = between(html, '<main id="main-content">', "</main>")[len('<main id="main-content">'):]
    (out / "pages" / f"{name}.html").write_text(clean(main) + "\n")
    title = re.search(r"<title>(.*?)</title>", html, re.S).group(1)
    desc = re.search(r'<meta name="description" content="([^"]*)"', html)
    meta[name] = {"title": title.replace("&amp;", "&").replace("&#8211;", "–"),
                  "description": desc.group(1).replace("&amp;", "&") if desc else ""}
(out / "meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n")
print("ok", list(meta))
