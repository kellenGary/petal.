-- Migration: Add SongsOfTheDay table for Song of the Day feature
-- Run this script against mf.db

CREATE TABLE IF NOT EXISTS SongsOfTheDay (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    TrackId INTEGER NOT NULL,
    Date TEXT NOT NULL,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (TrackId) REFERENCES Tracks(Id) ON DELETE RESTRICT
);

-- Create unique index for one SOTD per user per day
CREATE UNIQUE INDEX IF NOT EXISTS IX_SongsOfTheDay_UserId_Date ON SongsOfTheDay(UserId, Date);

-- Index for efficient lookups by user
CREATE INDEX IF NOT EXISTS IX_SongsOfTheDay_UserId ON SongsOfTheDay(UserId);
