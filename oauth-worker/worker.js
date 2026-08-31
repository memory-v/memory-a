// Cloudflare Worker: GitHub OAuth handshake for Decap CMS.
//
// GitHub Pages can only serve static files — it can't keep a client secret
// or exchange an OAuth code for a token. This tiny Worker is the one piece
// of server code the whole setup needs: it does that one handshake and
// nothing else. Deployed once, essentially free forever at this scale.
//
// Requires two secrets set in the Worker's settings (Cloudflare dashboard
// -> Workers & Pages -> this worker -> Settings -> Variables and Secrets):
//   GITHUB_CLIENT_ID
//   GITHUB_CLIENT_SECRET
// (from a GitHub OAuth App — see README for how to create one)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth") {
      const params = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        redirect_uri: `${url.origin}/callback`,
        scope: "repo,user",
      });
      return Response.redirect(
        `https://github.com/login/oauth/authorize?${params}`,
        302
      );
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) {
        return new Response("Missing code", { status: 400 });
      }

      const tokenRes = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
          }),
        }
      );
      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        return new Response(
          `OAuth error: ${tokenData.error_description || tokenData.error}`,
          { status: 400 }
        );
      }

      // Decap CMS's documented popup handshake: it posts a message to us
      // first to establish origin, we reply with the token in the same
      // format, then close the popup.
      const payload = JSON.stringify({
        token: tokenData.access_token,
        provider: "github",
      });

      const html = `<!doctype html>
<html><body>
<script>
(function() {
  function receiveMessage(e) {
    window.opener.postMessage(
      'authorization:github:success:${payload.replace(/'/g, "\\'")}',
      e.origin
    );
    window.removeEventListener('message', receiveMessage, false);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script>
</body></html>`;

      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
