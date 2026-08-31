# memory-a archive

A static, self-contained version of the memory-a Tumblr theme — same design,
no platform dependency. Built with Eleventy, edited via Decap CMS, hosted
free on GitHub Pages.

## Try it locally

```bash
npm install
npm run serve
```

Opens at http://localhost:8080. Edit files under `src/posts/` to see the
feed update.

## Structure

- `src/posts/*.md` — one file per memory. Frontmatter: `date`, `type`
  (`photo`/`video`), `image`, `video`, `poster`; the markdown body becomes
  the caption.
- `src/uploads/` — photo/video files, referenced from post frontmatter.
- `src/_includes/` — the page shell (`base.njk`), the post card markup
  (`post-card.njk`), and the single-post layout (`post.njk`).
- `src/css/style.css`, `src/js/site.js` — carried over from the original
  Tumblr theme (memory holes, spatial drift, age signal, video playback),
  with the Tumblr-only `flux` control and the Supabase-backed `drift`
  comment system removed.
- `src/admin/` — Decap CMS, the posting form.
- `.github/workflows/deploy.yml` — builds the site and deploys it to
  GitHub Pages on every push (free, unlimited for a public repo).
- `oauth-worker/` — the one small piece of server code the setup needs:
  a Cloudflare Worker that handles the "log in with GitHub" handshake for
  the posting form. See `oauth-worker/README.md` for one-time setup.

## Deploying (one-time setup)

1. Rename this GitHub repo to `<your-github-username>.github.io` (Settings
   → repository name) — this makes GitHub Pages serve it at the domain
   root, which is what the site's file paths assume. Skip this step only
   if you're pointing a custom domain at it instead.
2. In the repo: **Settings → Pages → Build and deployment → Source**, set
   to **GitHub Actions**. The workflow in this repo handles the rest
   automatically on every push.
3. Follow `oauth-worker/README.md` to set up the posting form's login
   (one-time, roughly 10 minutes).

## Posting a memory

Go to `/admin/`, click "New Memories", pick photo or video, upload the file,
write a caption, hit publish. GitHub Pages rebuilds and redeploys
automatically within a minute or two.
