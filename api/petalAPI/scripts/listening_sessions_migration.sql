-- Listening Sessions migration script
-- Creates tables for tracking automatic listening sessions

BEGIN TRANSACTION;

-- ListeningSessions table - stores session metadata
CREATE TABLE IF NOT EXISTS ListeningSessions (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    StartedAt TEXT NOT NULL,
    EndedAt TEXT,
    TotalDurationMs INTEGER NOT NULL DEFAULT 0,
    TrackCount INTEGER NOT NULL DEFAULT 0,
    Status INTEGER NOT NULL DEFAULT 0,  -- 0=Active, 1=Posted, 2=Cancelled
    CreatedAt TEXT NOT NULL,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS IX_ListeningSessions_UserId_Status ON ListeningSessions(UserId, Status);
CREATE INDEX IF NOT EXISTS IX_ListeningSessions_Status_EndedAt ON ListeningSessions(Status, EndedAt);

-- ListeningSessionTracks junction table - tracks in each session
CREATE TABLE IF NOT EXISTS ListeningSessionTracks (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    ListeningSessionId INTEGER NOT NULL,
    ListeningHistoryId INTEGER NOT NULL,
    TrackId INTEGER NOT NULL,
    PlayedAt TEXT NOT NULL,
    Position INTEGER NOT NULL,
    FOREIGN KEY (ListeningSessionId) REFERENCES ListeningSessions(Id) ON DELETE CASCADE,
    FOREIGN KEY (ListeningHistoryId) REFERENCES ListeningHistory(Id) ON DELETE CASCADE,
    FOREIGN KEY (TrackId) REFERENCES Tracks(Id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS IX_ListeningSessionTracks_SessionId ON ListeningSessionTracks(ListeningSessionId);
CREATE UNIQUE INDEX IF NOT EXISTS UX_ListeningSessionTracks_Session_History ON ListeningSessionTracks(ListeningSessionId, ListeningHistoryId);

COMMIT;

-- Add ListeningSessionId to Posts table (separate transaction for ALTER)
-- Note: SQLite doesn't support adding FK constraints via ALTER, so we add the column without constraint
-- The FK relationship is enforced at the application level
ALTER TABLE Posts ADD COLUMN ListeningSessionId INTEGER;
