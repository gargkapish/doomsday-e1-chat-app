# Errors Log

Real bugs I hit while building the E1 chat app, what I first thought, and what was actually wrong.

---

## 1. Server crash: `require` in an ES module

- **Symptom:** The server crashed the moment I ran `npm run dev`.
- **Exact error:** `ReferenceError: require is not defined in ES module scope, you can use import instead`
- **Initial hypothesis:** dotenv was not installed properly.
- **Root cause:** I had set `"type": "module"` in `package.json`, which makes Node treat every `.js` file as an ES module. ES modules use `import`, and `require` does not exist in them. I was still writing `require("dotenv").config()`.
- **Fix:** Replaced it with `import "dotenv/config";` as the very first line of `index.js`, so the `.env` values are loaded before any other file reads them.
- **Lesson:** Pick one module system and stick to it. With `"type": "module"`, always use `import`/`export`. When a tutorial shows `require`, translate it.

---

## 2. "Cannot GET /" in the browser

- **Symptom:** The terminal said `Server on 3000`, but opening `http://localhost:3000` showed `Cannot GET /`.
- **Exact error:** `Cannot GET /`
- **Initial hypothesis:** The server was not running, or the port was wrong.
- **Root cause:** Not a bug. The server was running fine, but there was no route for `/`. Express answers any unknown path with "Cannot GET <path>".
- **Fix:** Nothing to fix. Visiting `/health` (a route I had defined) returned `{"status":"ok"}`.
- **Lesson:** "Cannot GET" means the server is up but has no route for that path. A crashed server gives "connection refused" instead.

---

## 3. `/api/auth/me` always said "Not logged in"

- **Symptom:** Login worked and set the cookie, but `/api/auth/me` still returned 401, even when I sent the cookie.
- **Exact error:** `{"error":"Not logged in"}`
- **Initial hypothesis:** The cookie was not being saved or sent by curl.
- **Root cause:** In `index.js`, `app.use(cookieParser())` came **after** `app.use("/api/auth", authRoutes)`. Express runs middleware top to bottom, so the auth routes ran before the cookies were read, and `req.cookies` was empty.
- **Fix:** Moved `app.use(cookieParser())` above all the routes, next to `express.json()`.
- **Lesson:** Middleware order matters. Anything that prepares `req` (body parsing, cookies) must come before the routes that use it.

---

## 4. Unclear validation error from zod

- **Symptom:** Calling search without `?q=` returned an error message a user would not understand.
- **Exact error:** `Invalid input: expected string, received undefined`
- **Initial hypothesis:** My `.min(1, "...")` message should have covered it.
- **Root cause:** `.min()` only runs when the value **is** a string. When the field is missing entirely, zod fails earlier, on the type check, and uses its default message.
- **Fix:** Passed my own message for the type check: `z.string({ error: "Search text is required" })`.
- **Lesson:** "Missing" and "too short" are two different checks. Give each one its own message.

---

## 5. Server crash: route file name did not match the import

- **Symptom:** The server crashed on start after I added the conversations routes.
- **Exact error:** `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../src/routes/conversations.js'`
- **Initial hypothesis:** The model file had the wrong name, so I renamed `models/conversation.js` to `conversations.js`. The error did not go away.
- **Root cause:** The **route** file was saved as `routes/conversation.js` (singular), but `index.js` imported `routes/conversations.js` (plural). The path in the error message was pointing at the routes folder all along, not the models folder.
- **Fix:** Undid the model rename, and renamed the route file with `git mv src/routes/conversation.js src/routes/conversations.js`.
- **Lesson:** Read the full path in the error. It names the exact file it can't find. Also, ES modules need the exact file name, including `.js`.

---

## 6. Server crash: schema pasted into the wrong file

- **Symptom:** The server stopped right after I added message-history pagination.
- **Exact error:** `ReferenceError: z is not defined`
- **Initial hypothesis:** Not sure at first; the route code looked correct.
- **Root cause:** I pasted `historySchema` into `src/models/conversation.js` (the model) instead of `src/routes/conversations.js` (the routes). The model file never imports zod, so `z` did not exist there. And even with that import, the route file couldn't have used a variable defined in another file without exporting it.
- **Fix:** Deleted the schema from the model file and pasted it next to `messageSchema` in the routes file.
- **Lesson:** `models/` describes the shape of the data; `routes/` handles requests and validation. When something "is not defined", first check which file you are in.
