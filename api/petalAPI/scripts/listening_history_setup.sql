-- Listening History System - Database Setup Script
-- This script ensures all necessary tables and columns exist

-- The ListeningHistory table should already exist from EF Core migrations
-- But here's what it should look like:

-- CREATE TABLE ListeningHistory (
--     Id INTEGER PRIMARY KEY AUTOINCREMENT,
--     UserId INTEGER NOT NULL,
--     TrackId INTEGER NOT NULL,
--     PlayedAt TEXT NOT NULL,
--     MsPlayed INTEGER NOT NULL,
--     ContextUri TEXT NULL,
--     DeviceType TEXT NULL,
--     Source INTEGER NOT NULL,
--     DedupeKey TEXT NULL,
--     FOREIGN KEY(UserId) REFERENCES Users(Id),
--     FOREIGN KEY(TrackId) REFERENCES Tracks(Id)
-- );

-- The SpotifySyncState table should also exist:
-- CREATE TABLE SpotifySyncStates (
--     Id INTEGER PRIMARY KEY AUTOINCREMENT,
--     UserId INTEGER NOT NULL UNIQUE,
--     RecentlyPlayedLastAt TEXT NULL,
--     LikedTracksLastAt TEXT NULL,
--     LikedAlbumsLastAt TEXT NULL,
--     FollowedArtistsLastAt TEXT NULL,
--     PlaylistsLastSnapshotId TEXT NULL,
--     LastFullSyncAt TEXT NULL,
--     FOREIGN KEY(UserId) REFERENCES Users(Id)
-- );

-- OPTIONAL: Add location columns for map tracking
-- Uncomment these lines if you want to store location data

ALTER TABLE ListeningHistory ADD COLUMN Latitude DECIMAL(10, 8) NULL;
ALTER TABLE ListeningHistory ADD COLUMN Longitude DECIMAL(11, 8) NULL;
ALTER TABLE ListeningHistory ADD COLUMN LocationAccuracy REAL NULL;

-- OPTIONAL: Create index for faster queries
CREATE INDEX IF NOT EXISTS IX_ListeningHistory_UserId_PlayedAt 
ON ListeningHistory(UserId, PlayedAt DESC);

CREATE INDEX IF NOT EXISTS IX_ListeningHistory_DedupeKey 
ON ListeningHistory(DedupeKey);

CREATE INDEX IF NOT EXISTS IX_ListeningHistory_Source 
ON ListeningHistory(Source);

-- OPTIONAL: Create view for recent listening activity
CREATE VIEW IF NOT EXISTS RecentListeningActivity AS
SELECT 
    lh.Id,
    u.DisplayName,
    t.Name as TrackName,
    a.Name as ArtistName,
    lh.PlayedAt,
    lh.MsPlayed,
    lh.Source,
    lh.DeviceType
FROM ListeningHistory lh
JOIN Users u ON lh.UserId = u.Id
JOIN Tracks t ON lh.TrackId = t.Id
LEFT JOIN TrackArtists ta ON t.Id = ta.TrackId
LEFT JOIN Artists a ON ta.ArtistId = a.Id
WHERE lh.PlayedAt >= datetime('now', '-7 days')
ORDER BY lh.PlayedAt DESC;

-- OPTIONAL: Create view for listening statistics
CREATE VIEW IF NOT EXISTS ListeningStatistics AS
SELECT 
    u.Id,
    u.DisplayName,
    COUNT(DISTINCT lh.Id) as TotalListens,
    COUNT(DISTINCT lh.TrackId) as UniqueTracks,
    COUNT(DISTINCT t.Album) as UniqueAlbums,
    COUNT(CASE WHEN lh.Source = 0 THEN 1 END) as AppListens,
    COUNT(CASE WHEN lh.Source = 1 THEN 1 END) as SpotifyApiListens,
    MIN(lh.PlayedAt) as FirstListenAt,
    MAX(lh.PlayedAt) as LastListenAt
FROM Users u
LEFT JOIN ListeningHistory lh ON u.Id = lh.UserId
LEFT JOIN Tracks t ON lh.TrackId = t.Id
GROUP BY u.Id, u.DisplayName;

-- OPTIONAL: Create view for deduplication check
CREATE VIEW IF NOT EXISTS PotentialDuplicates AS
SELECT 
    UserId,
    TrackId,
    PlayedAt,
    COUNT(*) as Count
FROM ListeningHistory
GROUP BY UserId, TrackId, PlayedAt
HAVING COUNT(*) > 1;

-- OPTIONAL: Create trigger to auto-update timestamps
-- (if your ListeningHistory model has an UpdatedAt field)
CREATE TRIGGER IF NOT EXISTS UpdateListeningHistoryTimestamp
AFTER UPDATE ON ListeningHistory
BEGIN
    UPDATE ListeningHistory SET UpdatedAt = datetime('now') 
    WHERE Id = NEW.Id;
END;

-- Verify setup
SELECT 'ListeningHistory table exists' as Status;
SELECT COUNT(*) as ListeningHistoryCount FROM ListeningHistory;
SELECT COUNT(*) as SpotifySyncStateCount FROM SpotifySyncStates;
SELECT COUNT(DISTINCT UserId) as UsersWithListeningHistory FROM ListeningHistory;

-- Sample queries for verification:

-- Check recent syncs
-- SELECT UserId, RecentlyPlayedLastAt FROM SpotifySyncStates ORDER BY RecentlyPlayedLastAt DESC LIMIT 10;

-- Check entries by source
-- SELECT Source, COUNT(*) FROM ListeningHistory GROUP BY Source;

-- Check for duplicates
-- SELECT * FROM PotentialDuplicates;

-- Check listening stats
-- SELECT * FROM ListeningStatistics ORDER BY TotalListens DESC LIMIT 10;

-- Check recent activity (last 7 days)
-- SELECT * FROM RecentListeningActivity LIMIT 20;
