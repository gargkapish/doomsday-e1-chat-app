# ADR 0001: Where to store chat messages

- **Status:** Accepted
- **Date:** 2026-11-18
- **Decision Makers:** Kapish Garg

## Context

The app has conversations (one-to-one chats and group chats), and each conversation has messages. Messages must be saved forever (persistent history) and shown in order.

MongoDB gives us two ways to store them:

1. **Inside the conversation (embedding):** the conversation document holds an array of all its messages.
   ```js
   { _id: "conv1", members: [...], messages: [{ text: "hi" }, { text: "yo" }, ...] }
   ```
2. **In a separate collection (referencing):** each message is its own document and stores the `_id` of the conversation it belongs to.
   ```js
   // conversations
   { _id: "conv1", members: [...] }
   // messages
   { _id: "m1", conversation: "conv1", sender: "u1", text: "hi" }
   ```

Things that matter for a chat app:
- A busy group can collect many thousands of messages.
- When a chat opens, we only need to show the latest few messages, not all of them.
- Many people may send messages to the same group at the same time.
- The PRD asks that 1,000 seeded messages load without freezing the UI.

## Decision

We store messages in a **separate `messages` collection**. Each message stores:
- `conversation`: the `_id` of its conversation
- `sender`: the `_id` of the user who sent it
- `text`, plus `createdAt` and `updatedAt`, which Mongoose adds automatically

We add a **compound index** on `{ conversation: 1, createdAt: 1 }`. With it, "get the messages of conversation X in time order" jumps straight to the right messages instead of scanning every message in the database.

We rejected **embedding**, because:
- **Size limit:** one MongoDB document can be at most 16 MB. A busy chat would hit this limit, and then new messages could not be saved.
- **Slow writes:** every new message makes the conversation document bigger, and the whole document has to be written again.
- **Slow reads:** to show the last 50 messages, we would load the conversation with all its messages.
- **Conflicts:** two people sending at the same moment would both be changing the same document.

## Consequences

**Good:**
- No size limit on a conversation's history; each message is a small document.
- Sending a message is one small insert, and it doesn't touch the conversation document.
- We can load messages in pages (for example, the latest 50, then older ones on scroll) using the index.
- Listing a user's conversations is fast, because it doesn't load any messages.

**Bad / things to remember:**
- Showing a conversation and its messages takes two queries (one for the conversation, one for the messages) instead of one.
- If a conversation is deleted, its messages must be deleted separately, or they are left behind.
- Every message query must filter by `conversation`, and must first check that the user is a member of that conversation. Otherwise anyone could read other people's messages.
- The index makes writes slightly slower and uses some storage. That is a fair cost for fast reads.
