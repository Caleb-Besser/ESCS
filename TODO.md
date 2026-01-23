# Migration Fix TODO

## Completed

- [x] Added missing imports (fs, Store) to main.js
- [x] Updated preload.js to pass userId to getOldData
- [x] Updated IPC handler to look for old data in multiple locations:
  - Default electron-store
  - Old custom store location (escs-data/user_data.json)
  - Direct JSON files in userData directory
  - User-specific data in old store
- [x] Updated migration.js to pass userId to IPC call

## Testing Needed

- [ ] Test migration with old data in default store location
- [ ] Test migration with old data in custom store location
- [ ] Test migration with JSON files directly
- [ ] Test migration with user-specific data
- [ ] Verify no data loss during migration
- [ ] Verify migration only runs once per user

## Notes

- Old system stored data as: users.{userId}.students and users.{userId}.history
- New system migrates to Firestore under users/{userId}/students/{studentId}
- Migration checks localStorage, electron-store (multiple locations), and JSON files
