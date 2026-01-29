-- Add caching columns to Users table
ALTER TABLE Users ADD COLUMN TopArtistsJson TEXT NULL;
ALTER TABLE Users ADD COLUMN TopArtistsUpdatedAt TEXT NULL;
