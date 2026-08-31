# memory-a archive

A static, self-contained version of the memory-a Tumblr theme — same design,
no platform dependency. Built with Eleventy, edited via Decap CMS, hosted
free on Netlify.

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
  Tumblr theme (drift, void, memory holes, spatial drift, age signal, video
  playback), with the Tumblr-only `flux` control removed.
- `src/admin/` — Decap CMS, the posting form.

## Deploying (one-time setup)

1. Push this folder to a new GitHub repo.
2. Create a Netlify account (sign in with GitHub) and "Add new site → Import
   from GitHub", pointing it at this repo. Netlify reads `netlify.toml`
   automatically.
3. In the deployed site's Netlify dashboard: **Site configuration → Identity
   → Enable Identity**, then **Registration → Invite only**. Under
   **Identity → Services**, enable **Git Gateway**.
4. Invite yourself as a user under Identity, and accept the invite email.
5. Visit `https://<your-site>.netlify.app/admin/` and log in — that's the
   posting form from then on, from any device.

## Posting a memory

Go to `/admin/`, click "New Memories", pick photo or video, upload the file,
write a caption, hit publish. Netlify rebuilds and redeploys automatically
within a minute or two.
