# ADR 0003: How the server finds a user's live connections

- **Status:** Accepted
- **Date:** 2026-11-19
- **Decision Makers:** Kapish Garg

## Context

New messages must reach the other people in a chat within 1 second, without them refreshing. Plain HTTP can't do this, because the server can only answer requests and can never speak first. So we use **Socket.IO**, which keeps a connection (a "socket") open between each browser tab and the server.

When a message is sent, the server has to answer one question: **which open sockets belong to the members of this conversation?**

Things that make this tricky:
- **One user can have several tabs open**, for example on a laptop and a phone. Each tab is its own socket with its own `socket.id`, and all of them should get the message.
- **A user can have zero tabs open.** That must not be an error.
- Sockets come and go all the time (tabs closed, Wi-Fi drops). Anything we keep track of must be cleaned up when they leave.
- Socket connections have to be logged in too, or anyone could listen for private messages.

The options:

1. **Our own map:** keep `{ userId: Set of sockets }` in memory. Add the socket on connect, remove it on disconnect, and delete the user's entry when their last socket leaves.
2. **Socket.IO rooms:** a room is a named group of sockets that Socket.IO manages for us.

## Decision

**Login:** when a socket connects, the browser sends the same httpOnly `token` cookie it uses for the REST API. We run `cookieParser` on the handshake (`io.engine.use(cookieParser())`), check the JWT in `io.use(...)`, and save `socket.userId`. A socket without a valid token is rejected and never connects.

**Mapping users to sockets:** we use **rooms, one room per user, named after the user's id.**
- On connect: `socket.join(socket.userId)`. Two tabs means two sockets in the same room.
- On disconnect: Socket.IO removes the socket from its rooms automatically.
- To deliver a message: `io.to(conversation.members.map(String)).emit("new_message", message)`. Socket.IO sends it once to every socket in those rooms, even if one socket is in several of them.

**Sending stays on HTTP.** The browser still sends messages with `POST /api/conversations/:id/messages`. That route validates the text, checks membership, saves to MongoDB, and **then** pushes to the sockets. Sockets are only used from the server to the browser.

We rejected **our own map** because it is extra code with easy-to-miss bugs: forgetting to remove a socket leaks memory and sends messages to dead connections. Rooms do the same job with no cleanup code.

## Consequences

**Good:**
- A user with several tabs gets the message in every tab. A user with no tabs gets nothing pushed, which is fine: the message is already saved, and they load it from history when they come back.
- The sender's own other tabs also get the message, so all their tabs stay in sync.
- All the rules (validation, membership check, saving) live in one place: the POST route. The socket code is very small.
- Measured locally, a message reached all receivers about **110–130 ms** after the POST, well under the 1 s target.

**Bad / things to remember:**
- **Rooms live in the server's memory.** With two or more server instances, a user on instance A won't get a message sent through instance B. Scaling out would need the Socket.IO Redis adapter. One instance is enough for E1.
- **Messages sent while a tab is offline are not pushed again on reconnect.** The client must reload history when it reconnects.
- **The socket keeps working after logout** until the tab closes or reconnects, because the token is only checked once, when the socket connects. A logged-out tab could keep receiving messages for a while.
- The client must connect with `withCredentials: true`, and the server's Socket.IO CORS settings must allow the frontend's address with credentials, or the cookie won't be sent.
