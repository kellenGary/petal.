-- AlbumTracks table migration for caching album track lists from Spotify API
-- This table stores the relationship between albums and their tracks

CREATE TABLE IF NOT EXISTS AlbumTracks (
    AlbumId INTEGER NOT NULL,
    Position INTEGER NOT NULL,
    TrackId INTEGER NOT NULL,
    CONSTRAINT PK_AlbumTracks PRIMARY KEY (AlbumId, Position),
    CONSTRAINT FK_AlbumTracks_Albums_AlbumId FOREIGN KEY (AlbumId) REFERENCES Albums (Id) ON DELETE CASCADE,
    CONSTRAINT FK_AlbumTracks_Tracks_TrackId FOREIGN KEY (TrackId) REFERENCES Tracks (Id) ON DELETE RESTRICT
);

-- Index for efficient track lookups
CREATE INDEX IF NOT EXISTS IX_AlbumTracks_TrackId ON AlbumTracks (TrackId);
