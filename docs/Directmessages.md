# TalkTravel — Flow: Direct Messages (Post-Login)

> **Purpose:** Reference for Playwright automation of Direct Messages — the `/chats` surface where users hold 1:1 conversations with other users. Covers opening the DM page from left nav vs `Chat` on a user profile, chat list rendering with last-message previews, opening a conversation, sending messages with real-time delivery, receiving messages, the typing indicator, read receipts, email mirroring, scroll-to-load older messages, visiting a sender's profile from the chat, and the empty state.
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged in

> **Prerequisite:** Real-time messaging inherently requires two accounts. Set up `auth/user-a.json` and `auth/user-b.json` as separate `storageState` files. Use `browser.newContext()` twice (or two Playwright projects) to run both accounts concurrently for real-time delivery, typing indicator, and read-receipt tests. Some tests need pre-existing conversation history — seed via API in `beforeEach`.

---

## Flow overview

```
Two entry points:
   Left nav → Messages     ────┐
   Any user profile → Chat  ───┴─→ /chats (DM page)
                                          ↓
      ┌────────────────────────────────────────────────────────────┐
      │  Left panel: chat list                                     │
      │     Row per conversation: avatar + nickname + last msg     │
      │     Timestamp of last message                              │
      │     Unread indicator (bold row OR count badge)             │
      │                                                            │
      │  Right panel: active conversation OR empty state           │
      │     Header: recipient avatar + nickname (click → profile)  │
      │     Message history (scroll up to load older)              │
      │     Typing indicator when the other person is typing       │
      │     Read receipts on sent messages                         │
      │     Input box at bottom with Send button                   │
      │                                                            │
      │  Empty state (no chats): "You have no active chats..."     │
      └────────────────────────────────────────────────────────────┘
                                          ↓
   Actions inside conversation:
      Type + Send             →  message appears instantly + email sent
      Click recipient header  →  opens their user profile
      Scroll to top           →  loads older messages
      Receive incoming msg    →  appears in real-time in the thread
      Other user typing       →  typing indicator visible
```

DMs are the platform's real-time 1:1 communication surface. Two navigation entry points converge on `/chats`: the left-nav Messages item (opens the DM page with the chat list) and the `Chat` button on another user's profile (opens `/chats` with that conversation already active — if it doesn't exist, a new conversation is created). Messages send instantly, appear in real-time on the recipient's screen (typing indicator + arriving message), and are mirrored via email. Read receipts confirm delivery.

---

## Step 1 — Open DMs from left nav

**Action:** From any post-login page, click `Messages` in the left navigation.
**Expected URL:** `/chats`

### Elements that must be visible
- **Header:** search bar, `+ Create Post`, Messages icon (may show unread badge), Notifications, Profile avatar
- **Left navigation:** with `Messages` visually active
- **Chat list panel** (left side of main area) — rows of conversations, OR empty state
- **Conversation panel** (right side) — active conversation OR empty state placeholder
- **Footer**

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Left nav Messages link | `nav[aria-label="Primary"] >> text=Messages` |
| Messages icon in header | `[data-testid="messages-icon"]` |
| Chat list panel | `[data-testid="chat-list"]` or `aside[aria-label="Conversations"]` |
| Chat list row | `[data-testid="chat-list"] >> [data-testid="chat-row"]` |
| Conversation panel | `[data-testid="conversation-panel"]` |
| Conversation header | `[data-testid="conversation-header"]` |
| Recipient nickname in header | `[data-testid="conversation-header"] >> [data-testid="recipient-name"]` |
| Message history container | `[data-testid="message-history"]` |
| Individual message | `[data-testid="message"]` |
| Own message | `[data-testid="message"][data-sender="self"]` |
| Received message | `[data-testid="message"][data-sender="other"]` |
| Message input | `[data-testid="message-input"]` or `textarea[placeholder*="message"]` |
| Send button | `button[aria-label="Send"]` or `[data-testid="send-message"]` |
| Typing indicator | `[data-testid="typing-indicator"]` or `text=/is typing/i` |
| Read receipt | `[data-testid="read-receipt"]` or `text=/Read/i` |
| Empty state (no chats) | `text=/no active chats/i` |

### Assertions
- `await page.locator('nav[aria-label="Primary"] >> text=Messages').click()`
- `await expect(page).toHaveURL(/\/chats$/)`
- `await expect(page.locator('[data-testid="chat-list"]')).toBeVisible()`

---

## Step 2 — Open DMs by clicking Chat on a user profile

**Action:** Navigate to another user's profile. Click the `Chat` button.
**Expected URL:** `/chats` (with that user's conversation active).

### Behavior
- If a conversation with this user already exists, it becomes active in the right panel.
- If NOT, a new empty conversation is created and opened.
- The chat list on the left shows the conversation (new or existing).

### Assertions
- `await page.goto('https://talktravel.com/user/<other-username>')`
- `await page.locator('button:has-text("Chat")').click()`
- `await expect(page).toHaveURL(/\/chats/)`
- `await expect(page.locator('[data-testid="conversation-header"] >> [data-testid="recipient-name"]')).toContainText('<other-username>')`

---

## Step 3 — Chat list shows conversations with last message + timestamp

**Action:** With the user having at least one existing conversation, inspect the chat list.

### Elements per chat row
- Recipient avatar
- Recipient nickname
- Preview of the last message (own or received)
- Timestamp of the last message
- Unread indicator (bold row, dot, or count badge — confirm with engineering)

### Assertions
- `const chatRow = page.locator('[data-testid="chat-row"]').first()`
- `await expect(chatRow.locator('[data-testid="chat-avatar"]')).toBeVisible()`
- `await expect(chatRow.locator('[data-testid="chat-nickname"]')).toBeVisible()`
- `await expect(chatRow.locator('[data-testid="chat-last-message"]')).toBeVisible()`
- `await expect(chatRow.locator('[data-testid="chat-timestamp"]')).toBeVisible()`

---

## Step 4 — Click a conversation to load its thread

**Action:** Click a row in the chat list.

### Behavior
- The right panel loads the conversation's full message history.
- The active conversation is visually highlighted in the chat list.
- Read receipts update — unread messages become read.

### Assertions
- `const chatRow = page.locator('[data-testid="chat-row"]').first()`
- `const recipient = await chatRow.locator('[data-testid="chat-nickname"]').textContent()`
- `await chatRow.click()`
- `await expect(page.locator('[data-testid="conversation-header"] >> [data-testid="recipient-name"]')).toContainText(recipient)`
- `await expect(page.locator('[data-testid="message"]').first()).toBeVisible()`

---

## Step 5 — Send a message

**Action:** In the active conversation, type text in the message input. Click Send (or press Enter).

### Behavior
- The typed message appears instantly in the message history (optimistic UI).
- Message input clears.
- Message shows a delivery status (sent → delivered → read — confirm with engineering).
- An email notification is sent to the recipient (side effect; hard to assert directly from UI tests).

### Assertions
- `const messageText = `Automation msg ${Date.now()}``
- `await page.locator('[data-testid="message-input"]').fill(messageText)`
- `await page.locator('[data-testid="send-message"]').click()`
- `await expect(page.locator('[data-testid="message"][data-sender="self"]').last()).toContainText(messageText)`
- `await expect(page.locator('[data-testid="message-input"]')).toHaveValue('')`

---

## Step 6 — Message shows delivery status (Read receipt)

**Action:** After sending a message, wait for the recipient to open the conversation. Verify the read receipt appears on the sent message.

### Behavior
- Once the recipient opens the conversation, the sender's message updates to show `Read` (or similar indicator).
- Some implementations show `Sent → Delivered → Read` as a progression; others show only Read.

### Assertions
- `// In sender's browser context, after recipient opens conversation`
- `const lastSent = page.locator('[data-testid="message"][data-sender="self"]').last()`
- `await expect(lastSent.locator('[data-testid="read-receipt"]')).toBeVisible({ timeout: 5000 })`

---

## Step 7 — Real-time incoming message from recipient

**Action:** In a second browser context (recipient's), send a message. In the first context (sender's), verify the message arrives in real-time.

### Behavior
- The incoming message appears in the sender's thread without a page refresh.
- Chat list preview updates with the new last-message text and timestamp.
- If sender is on a different conversation OR not viewing chats, the header Messages icon shows an unread badge increment.

### Assertions
- `// User B sends`
- `await pageB.locator('[data-testid="message-input"]').fill('Reply from B')`
- `await pageB.locator('[data-testid="send-message"]').click()`
- `// User A sees the message in real-time`
- `await expect(pageA.locator('[data-testid="message"][data-sender="other"]').last()).toContainText('Reply from B', { timeout: 5000 })`

---

## Step 8 — Typing indicator

**Action:** In the recipient's browser context, click into the message input and start typing (without sending). In the sender's context, verify the typing indicator appears.

### Behavior
- While the other user is typing, a typing indicator is visible in the sender's view (e.g., *"[username] is typing..."* or animated dots).
- Indicator disappears when the other user stops typing OR sends the message.

### Assertions
- `// User B starts typing`
- `await pageB.locator('[data-testid="message-input"]').click()`
- `await pageB.locator('[data-testid="message-input"]').type('Slowly typing...')`
- `// User A sees the indicator`
- `await expect(pageA.locator('[data-testid="typing-indicator"]')).toBeVisible({ timeout: 5000 })`
- `// User B stops (blur or clear)`
- `await pageB.locator('[data-testid="message-input"]').fill('')`
- `await expect(pageA.locator('[data-testid="typing-indicator"]')).not.toBeVisible({ timeout: 5000 })`

---

## Step 9 — Click recipient header to open their profile

**Action:** In the active conversation, click the recipient's name or avatar in the conversation header.
**Expected URL:** `/user/{recipient-username}`

### Behavior
- Navigates to the recipient's user profile.
- Full profile behavior applies (Add Friend / Chat / Follow / Block / Report per profile flow).

### Assertions
- `await page.locator('[data-testid="conversation-header"]').click()`
- `await expect(page).toHaveURL(/\/user\/[a-zA-Z0-9_-]+/)`

---

## Step 10 — Scroll to top to load older messages

**Action:** In a conversation with a long history, scroll to the top of the message history.

### Behavior
- Older messages load progressively as the user scrolls up.
- Loading indicator appears briefly during fetch.
- Scroll position preserved after new messages load (user doesn't get thrown back to the top).

### Assertions
- `const historyContainer = page.locator('[data-testid="message-history"]')`
- `const initialCount = await page.locator('[data-testid="message"]').count()`
- `await historyContainer.evaluate(el => el.scrollTop = 0)`
- `// Wait for older messages to load`
- `await expect(page.locator('[data-testid="message"]')).not.toHaveCount(initialCount, { timeout: 5000 })`

---

## Step 11 — Send on Enter (keyboard shortcut)

**Action:** Focus the message input. Type text. Press Enter.

### Behavior
- Enter submits the message (same as clicking Send).
- Shift+Enter (if supported) inserts a newline WITHOUT sending — confirm with engineering.

### Assertions
- `await page.locator('[data-testid="message-input"]').fill('Enter to send')`
- `await page.locator('[data-testid="message-input"]').press('Enter')`
- `await expect(page.locator('[data-testid="message"][data-sender="self"]').last()).toContainText('Enter to send')`

---

## Step 12 — Empty state (no active chats)

**Action:** With an account that has ZERO conversations, navigate to `/chats`.

### Behavior
- Chat list panel is empty.
- Right panel shows the empty state: *"You have no active chats right now"* (or similar).
- No conversation is active.

### Assertions
- `// Precondition: user has 0 chats`
- `await page.goto('https://talktravel.com/chats')`
- `await expect(page.locator('[data-testid="chat-row"]')).toHaveCount(0)`
- `await expect(page.locator('text=/no active chats/i')).toBeVisible()`

---

## Step 13 — Chat history persists across navigation

**Action:** Open a conversation. Navigate away (e.g., to Homepage). Come back to Messages.

### Behavior
- The chat list preserves the recent conversation order.
- Reopening a specific conversation loads its full history (up to the paginated limit).
- No history is lost.

### Assertions
- `// Open conversation`
- `await page.locator('[data-testid="chat-row"]').first().click()`
- `const messageCount = await page.locator('[data-testid="message"]').count()`
- `// Navigate away`
- `await page.goto('https://talktravel.com/')`
- `// Return`
- `await page.goto('https://talktravel.com/chats')`
- `await page.locator('[data-testid="chat-row"]').first().click()`
- `await expect(page.locator('[data-testid="message"]')).toHaveCount(messageCount)`

---

## Step 14 — Unread badge in header updates on incoming message

**Action:** With sender inactive (not on `/chats`), have recipient send a message. Verify header Messages icon shows an unread badge.

### Behavior
- Header Messages icon renders a red badge with unread count.
- Badge decrements when the sender opens the conversation.

### Assertions
- `// User A on Homepage; User B sends a message to A`
- `await pageA.goto('https://talktravel.com/')`
- `await pageB.locator('[data-testid="send-message"]').click()`
- `await expect(pageA.locator('[data-testid="messages-icon"] >> [data-testid="unread-badge"]')).toBeVisible({ timeout: 5000 })`

---

## Sample Playwright test (end-to-end)

```javascript
import { test, expect } from '@playwright/test';

test.describe('Direct Messages', () => {

  test('Open Messages from left nav', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'auth/user-a.json' });
    const page = await context.newPage();
    await page.goto('https://talktravel.com/');
    await page.locator('nav[aria-label="Primary"] >> text=Messages').click();
    await expect(page).toHaveURL(/\/chats$/);
    await expect(page.locator('[data-testid="chat-list"]')).toBeVisible();
  });

  test('Chat button on user profile opens conversation', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'auth/user-a.json' });
    const page = await context.newPage();
    await page.goto('https://talktravel.com/user/user-b');
    await page.locator('button:has-text("Chat")').click();
    await expect(page).toHaveURL(/\/chats/);
    await expect(page.locator('[data-testid="conversation-header"]')).toContainText('user-b');
  });

  test('Send a message from A to B, B receives in real-time', async ({ browser }) => {
    const contextA = await browser.newContext({ storageState: 'auth/user-a.json' });
    const contextB = await browser.newContext({ storageState: 'auth/user-b.json' });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Both users open the chat with each other
    await pageA.goto('https://talktravel.com/user/user-b');
    await pageA.locator('button:has-text("Chat")').click();
    await pageB.goto('https://talktravel.com/user/user-a');
    await pageB.locator('button:has-text("Chat")').click();

    // A sends
    const messageText = `Hello from A ${Date.now()}`;
    await pageA.locator('[data-testid="message-input"]').fill(messageText);
    await pageA.locator('[data-testid="send-message"]').click();
    await expect(pageA.locator('[data-testid="message"][data-sender="self"]').last()).toContainText(messageText);

    // B receives in real-time
    await expect(pageB.locator('[data-testid="message"][data-sender="other"]').last()).toContainText(messageText, { timeout: 5000 });
  });

  test('Typing indicator visible to the other user', async ({ browser }) => {
    const contextA = await browser.newContext({ storageState: 'auth/user-a.json' });
    const contextB = await browser.newContext({ storageState: 'auth/user-b.json' });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Both users active in the conversation
    await pageA.goto('https://talktravel.com/user/user-b');
    await pageA.locator('button:has-text("Chat")').click();
    await pageB.goto('https://talktravel.com/user/user-a');
    await pageB.locator('button:has-text("Chat")').click();

    // B starts typing
    await pageB.locator('[data-testid="message-input"]').click();
    await pageB.locator('[data-testid="message-input"]').type('Slowly...', { delay: 100 });

    // A sees typing indicator
    await expect(pageA.locator('[data-testid="typing-indicator"]')).toBeVisible({ timeout: 5000 });
  });

  test('Read receipt appears after recipient opens conversation', async ({ browser }) => {
    const contextA = await browser.newContext({ storageState: 'auth/user-a.json' });
    const contextB = await browser.newContext({ storageState: 'auth/user-b.json' });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // A sends to B while B is not on chats
    await pageA.goto('https://talktravel.com/user/user-b');
    await pageA.locator('button:has-text("Chat")').click();
    await pageA.locator('[data-testid="message-input"]').fill('Please read this');
    await pageA.locator('[data-testid="send-message"]').click();

    // B opens the conversation
    await pageB.goto('https://talktravel.com/chats');
    await pageB.locator('[data-testid="chat-row"]').first().click();

    // A sees the read receipt
    const lastSent = pageA.locator('[data-testid="message"][data-sender="self"]').last();
    await expect(lastSent.locator('[data-testid="read-receipt"]')).toBeVisible({ timeout: 5000 });
  });

  test('Click recipient header opens their profile', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'auth/user-a.json' });
    const page = await context.newPage();
    await page.goto('https://talktravel.com/chats');
    await page.locator('[data-testid="chat-row"]').first().click();
    await page.locator('[data-testid="conversation-header"]').click();
    await expect(page).toHaveURL(/\/user\/[a-zA-Z0-9_-]+/);
  });

  test('Empty state when user has no chats', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'auth/no-chats.json' });
    const page = await context.newPage();
    await page.goto('https://talktravel.com/chats');
    await expect(page.locator('[data-testid="chat-row"]')).toHaveCount(0);
    await expect(page.locator('text=/no active chats/i')).toBeVisible();
  });
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Direct navigation to `/chats` | Page loads correctly |
| 2 | Direct navigation to `/chats` while logged out | Redirects to `/login` |
| 3 | Click Chat on own profile | Should not be possible — button hidden or disabled (confirm) |
| 4 | Send empty message (whitespace only) | Send button disabled OR submission blocked |
| 5 | Send message with only emojis | Sends successfully |
| 6 | Send very long message (>2000 chars) | Truncated OR rejected (confirm) |
| 7 | Send message with URL — link auto-preview? | Confirm behavior |
| 8 | Send message with @mention or #topic | Confirm whether mentions/topics create clickable chips |
| 9 | Multiple messages sent in rapid succession | All arrive in order |
| 10 | Recipient blocks sender mid-conversation | Sender may or may not see the block (confirm); messages fail silently or with error |
| 11 | Sender blocks recipient | New messages fail; existing conversation persists (confirm) |
| 12 | Recipient deletes their account | Conversation shows "Deleted user"; message input disabled |
| 13 | Network drops mid-send | Message shows retry OR queues; user sees pending state |
| 14 | Session expires while typing | Next send action redirects to login |
| 15 | Recipient in a different timezone | Timestamps display in viewer's timezone |
| 16 | Message with rich text formatting (bold, italic) | Rendered correctly if supported (confirm formatting support) |
| 17 | Message with image attachment | Confirm support for image attachments |
| 18 | Two conversations open in two browser tabs | Both update in real-time OR one at a time (confirm) |
| 19 | Very long conversation history (500+ messages) | Paginated / infinite scroll works smoothly |
| 20 | Chat list sort order | Most recent conversation first |
| 21 | Chat list preview truncation | Long messages truncated with ellipsis |
| 22 | Notifications bell increments when new DM arrives | Separate from Messages icon; confirm both update |
| 23 | Sound / desktop notification on new message | Confirm platform notification behavior |
| 24 | Mobile viewport (~375px) | Chat list and conversation panel may stack OR toggle (confirm mobile layout) |
| 25 | Reduced motion preference | No animation on typing indicator |
| 26 | Screen reader announcement of new messages | Confirm accessibility (aria-live region) |
| 27 | Message input keyboard shortcut Shift+Enter | Inserts newline without sending (confirm) |
| 28 | Message input keyboard shortcut Cmd/Ctrl+Enter | Sends message (confirm alternative) |
| 29 | Copy-paste image into message input | Confirm support |
| 30 | Drag-drop file into conversation | Confirm support |
| 31 | Chat becomes read-only if recipient is banned | Confirm behavior |
| 32 | Chat during a network partition | Messages queue and send when reconnected (confirm) |
| 33 | Email mirror confirmed (out of scope for UI test) | Verify via email inbox check |
| 34 | Two-way typing indicator (both users typing) | Both indicators visible simultaneously to both users |
| 35 | Typing indicator times out if user stops typing | Should disappear after a few seconds of inactivity |

---

## Known issues to watch for

- The exact ARIA / role structure of chat list and conversation panel is unconfirmed.
- Real-time delivery mechanism is unspecified — likely WebSocket, but could be Server-Sent Events, long-polling, or Firebase. Test timeouts should be generous (5s+) to accommodate any of these.
- Typing indicator debounce and timeout are unspecified.
- Read receipt semantics are unspecified — is it delivered-on-open or delivered-on-scroll-to-message?
- Whether email mirroring can be disabled per-user is unspecified.
- The empty state copy is unspecified — use regex matcher.
- Whether chat history is paginated or infinite-scroll is unspecified.
- Message ordering under high concurrency (both users sending simultaneously) is unspecified.
- Group chats — the source doc suggests only 1:1 conversations exist. Confirm no group DMs.
- Whether messages support attachments (images, files, links with previews) is unspecified.
- Mobile viewport UX pattern (stacked vs toggled panels) is unspecified.
- Whether the header Messages icon is a link to `/chats` or opens a dropdown panel is unspecified.
- Whether the unread badge shows an exact count or a generic dot is unspecified.

---

## Notes for the automation engineer

- **Two accounts minimum.** `auth/user-a.json` and `auth/user-b.json` are required for real-time delivery, typing indicator, and read-receipt tests. Add `auth/no-chats.json` for empty-state tests.
- **Use `browser.newContext()` twice** in the same test to simulate two users in parallel. This is faster than launching two full browsers.
- **Seed conversations via API.** For tests that need pre-existing chat history, seed a conversation with N messages before the test runs. Manual UI-based history creation is prohibitively slow.
- **For real-time tests**, use generous timeouts on the receiver side (5000ms) since network round-trips and WebSocket events add latency:
```js
  await expect(pageB.locator('[data-testid="message"]').last()).toContainText(text, { timeout: 5000 });
```
- **For typing indicator tests**, control typing speed with `type(text, { delay: 100 })` to give the debounce time to register the typing state.
- **For read receipt tests**, ensure the recipient opens the conversation AFTER the sender's message has been delivered — otherwise the receipt may fire before the assertion.
- **For unread badge tests**, ensure the sender is on a page OTHER than `/chats` when the recipient sends — otherwise the badge may auto-clear.
- **Do NOT test email mirroring from within UI tests.** That requires access to an inbox / mail server; test it separately via integration tests or manual QA.
- **Cleanup considerations.** Test conversations accumulate over time. Either:
  - Delete conversations via API in `afterEach`.
  - Use disposable test accounts that are reset nightly.
  - Accept accumulation in staging.
- **For message text**, use timestamped strings (`Hello ${Date.now()}`) for unique identification.
- **For long conversation tests** (edge case #19), seed 100+ messages via API rather than sending manually.
- **Do NOT hardcode chat list order** — conversations sort by most recent activity, which changes with every new message.
- **For clipboard-related edge cases** (copy-paste image), grant clipboard permissions in Playwright context:
```js
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });
```
- **Screen reader / accessibility tests** (edge case #26) can use `@axe-core/playwright` for automated a11y auditing.
- **Isolate real-time tests from other tests** — WebSocket state and real-time listeners can cause test pollution if a previous test leaves connections open.
- **For flaky real-time assertions**, consider a retry helper:
```js
  await expect(async () => {
    await expect(locator).toBeVisible();
  }).toPass({ timeout: 10000 });
```