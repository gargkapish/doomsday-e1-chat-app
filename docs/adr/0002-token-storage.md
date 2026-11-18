# ADR 0002: Where to keep the login token

- **Status:** Accepted
- **Date:** 2026-11-17
- **Decision Makers:** Kapish Garg

## Context

When a user logs in, the server gives them a token (a JWT). The browser has to keep this token somewhere and send it with every request, so the server knows who is asking.

There are two common places to keep it:

1. **localStorage:** a small storage box in the browser that our JavaScript code can read and write.
2. **An httpOnly cookie:** a cookie that the browser stores and sends automatically. JavaScript on the page cannot read it at all.

Each one is open to a different attack:

- **XSS (Cross-Site Scripting):** an attacker manages to run their own JavaScript on our page (for example, through a chat message that contains a script). If the token is in localStorage, their script can read it and send it to themselves. With our token, they can act as the user until it expires.
- **CSRF (Cross-Site Request Forgery):** a different website tricks the user's browser into sending a request to our server. Because the browser attaches cookies automatically, the request would arrive "logged in".

## Decision

We keep the token in an **httpOnly cookie** named `token`, set by the server on login, with these settings:

- `httpOnly: true`: JavaScript cannot read the cookie, so an XSS attack cannot steal the token.
- `sameSite: "lax"`: the browser does not send the cookie on requests started by other websites (except plain link clicks). This blocks most CSRF attacks.
- `secure: true` in production: the cookie is only sent over HTTPS, so nobody on the network can read it. It is off on localhost because local development uses plain HTTP.
- `maxAge`: 7 days, the same as the token's own expiry (`expiresIn: "7d"`).

We rejected **localStorage**. One XSS bug anywhere in the app would leak every logged-in user's token, and there is no setting that prevents it.

## Consequences

**Good:**
- Our JavaScript never touches the token, so XSS cannot steal it.
- The browser sends the cookie by itself, so we don't write code to attach the token to each request.

**Bad / things to remember:**
- CSRF becomes the risk we must watch. `sameSite: "lax"` covers it, as long as we never change data with a GET request (that is why logout is a POST).
- The React frontend must send requests with `credentials: "include"`, or the browser will not send the cookie. The server's CORS settings must allow credentials from our frontend's address.
- **Logout only deletes the browser's copy of the token.** The server keeps no list of tokens, so if someone stole a token before logout, it keeps working until it expires (up to 7 days). Fixing this would need a token blocklist or short-lived tokens with refresh tokens. That is out of scope for E1.
- If `JWT_SECRET` ever leaks, anyone can create valid tokens for any user. It must stay in `.env` and never be committed.
