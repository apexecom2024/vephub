# Security Specification - Eburon Hub

## Data Invariants
1. A user document cannot exist without a valid owner UID matching the document ID.
2. User preferences must be validated for size and type.
3. WhatsApp devices must belong to a valid user and have a strict state enum.
4. Chat history is private to the user.

## The Dirty Dozen Payloads (Denial Expected)
1. **Identity Spoofing**: Attempt to create `/users/attackerUID` document with `UID = victimUID`.
2. **Resource Poisoning**: Create a message with a 10MB `content` string.
3. **State Shortcutting**: Update device state to `admin_access` (not in enum).
4. **Shadow Update**: Update user profile with `isAdmin: true` field.
5. **Orphaned Write**: Create a device in a user subcollection that the logged-in user doesn't own.
6. **Path Poisoning**: Request `/users/long-garbage-string-id`.
7. **PII Leak**: Authenticated user attempts to list `/users` collection (blanket read).
8. **Query trust**: Attempt to query messages without `userId` filter.
9. **Tampering**: Update `createdAt` timestamp on a message.
10. **Malicious Auth**: Spoof `email_verified: false` to access admin fields.
11. **Type Poisoning**: Set `personaName` to a Boolean.
12. **Cross-User Access**: Attempt to `get` a device from another user's subcollection.

## Verification
All 12 payloads must return `PERMISSION_DENIED`.
