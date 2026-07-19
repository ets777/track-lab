---
title: Backups
summary: Saving and restoring your whole database, automatically or by hand.
order: 10
---

A backup is a single encrypted file with your whole database. Make one from Settings → Backup database, and bring it back with Restore database. Files live in Documents/TrackLab/backups.

## Automatic backups

Set a schedule in Settings — daily, weekly or monthly. An automatic backup only runs when you have logged something new since the last one, so unchanged data is never re-saved.

## Passwords and compatibility

Set a backup password to encrypt your file with your own key; without one it still saves, just without that key. Restore asks for the password only when it needs it. Backups from older versions stay fully compatible — TrackLab migrates them on restore.
