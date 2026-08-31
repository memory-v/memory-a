# Posting-form login (GitHub OAuth via Cloudflare Worker)

GitHub Pages only serves static files, so the one thing it can't do is the
"log in with GitHub" handshake the posting form (`/admin/`) needs — that
handshake requires a client secret, which can't live in a static file. This
folder is that one small exception: a few lines of server code, run for
free on Cloudflare's Workers platform.

## 1. Create a GitHub OAuth App

1. Go to https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**
2. **Application name**: `memory-a admin`
3. **Homepage URL**: your GitHub Pages URL (e.g. `https://memory-v.github.io/memory-a/`)
4. **Authorization callback URL**: leave a placeholder for now, e.g.
   `https://example.com/callback` — you'll come back and fix this after
   step 2 gives you the real Worker URL
5. Click **Register application**
6. Click **Generate a new client secret** and copy both the **Client ID**
   and the **Client secret** somewhere safe — you'll need them in step 2

## 2. Deploy the Worker

1. Sign up at https://dash.cloudflare.com (free) if you don't have an account
2. **Workers & Pages** → **Create** → **Workers** → **create a Worker with no starter template**... give it a name, e.g. `memory-a-oauth`
3. Once created, click **Edit code** and replace everything with the contents of `worker.js` in this folder
4. Click **Deploy**
5. Go to the Worker's **Settings → Variables and Secrets**, add two:
   - `GITHUB_CLIENT_ID` — from step 1
   - `GITHUB_CLIENT_SECRET` — from step 1 (mark it as a "Secret" type)
6. Note the Worker's URL, shown at the top — looks like
   `https://memory-a-oauth.<your-subdomain>.workers.dev`

## 3. Wire it all together

1. Back in the GitHub OAuth App (step 1), edit the **Authorization callback
   URL** to `https://<your-worker-url>/callback`
2. In this repo, open `src/admin/config.yml` and replace
   `https://REPLACE_WITH_WORKER_URL` with your actual Worker URL (no
   trailing slash)
3. Commit and push — once GitHub Pages redeploys, visit `/admin/` and
   click **Login with GitHub**

That's the whole setup — it only needs to be done once.
