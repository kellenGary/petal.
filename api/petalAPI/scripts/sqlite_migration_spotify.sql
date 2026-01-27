-- Spotify schema migration script
-- Preserves existing tables and only creates missing ones

BEGIN TRANSACTION;

-- Artists
CREATE TABLE IF NOT EXISTS Artists (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    SpotifyId TEXT NOT NULL,
    Name TEXT NOT NULL,
    GenresJson TEXT,
    ImageUrl TEXT,
    Popularity INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS IX_Artists_SpotifyId ON Artists(SpotifyId);

-- Albums
CREATE TABLE IF NOT EXISTS Albums (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    SpotifyId TEXT NOT NULL,
    Name TEXT NOT NULL,
    ReleaseDate TEXT,
    AlbumType TEXT,
    ImageUrl TEXT,
    Label TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS IX_Albums_SpotifyId ON Albums(SpotifyId);

-- Tracks
CREATE TABLE IF NOT EXISTS Tracks (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    SpotifyId TEXT NOT NULL,
    Name TEXT NOT NULL,
    DurationMs INTEGER NOT NULL DEFAULT 0,
    Explicit INTEGER NOT NULL DEFAULT 0,
    Popularity INTEGER,
    Isrc TEXT,
    AlbumId INTEGER,
    FOREIGN KEY (AlbumId) REFERENCES Albums(Id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS IX_Tracks_SpotifyId ON Tracks(SpotifyId);

-- TrackArtists (bridge)
CREATE TABLE IF NOT EXISTS TrackArtists (
    TrackId INTEGER NOT NULL,
    ArtistId INTEGER NOT NULL,
    ArtistOrder INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (TrackId, ArtistId),
    FOREIGN KEY (TrackId) REFERENCES Tracks(Id) ON DELETE CASCADE,
    FOREIGN KEY (ArtistId) REFERENCES Artists(Id) ON DELETE CASCADE
);

-- Playlists
CREATE TABLE IF NOT EXISTS Playlists (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    SpotifyId TEXT NOT NULL,
    Name TEXT NOT NULL,
    Description TEXT,
    OwnerSpotifyId TEXT,
    OwnerUserId INTEGER,
    Public INTEGER NOT NULL DEFAULT 0,
    Collaborative INTEGER NOT NULL DEFAULT 0,
    SnapshotId TEXT,
    ImageUrl TEXT,
    FOREIGN KEY (OwnerUserId) REFERENCES Users(Id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS IX_Playlists_SpotifyId ON Playlists(SpotifyId);

-- PlaylistTracks
CREATE TABLE IF NOT EXISTS PlaylistTracks (
    PlaylistId INTEGER NOT NULL,
    Position INTEGER NOT NULL,
    TrackId INTEGER NOT NULL,
    AddedAt TEXT,
    AddedBySpotifyId TEXT,
    AddedByUserId INTEGER,
    PRIMARY KEY (PlaylistId, Position),
    FOREIGN KEY (PlaylistId) REFERENCES Playlists(Id) ON DELETE CASCADE,
    FOREIGN KEY (TrackId) REFERENCES Tracks(Id) ON DELETE RESTRICT,
    FOREIGN KEY (AddedByUserId) REFERENCES Users(Id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS IX_PlaylistTracks_PlaylistId_AddedAt ON PlaylistTracks(PlaylistId, AddedAt);

-- UserLikedTracks
CREATE TABLE IF NOT EXISTS UserLikedTracks (
    UserId INTEGER NOT NULL,
    TrackId INTEGER NOT NULL,
    LikedAt TEXT NOT NULL,
    PRIMARY KEY (UserId, TrackId),
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (TrackId) REFERENCES Tracks(Id) ON DELETE RESTRICT
);

-- UserLikedAlbums
CREATE TABLE IF NOT EXISTS UserLikedAlbums (
    UserId INTEGER NOT NULL,
    AlbumId INTEGER NOT NULL,
    LikedAt TEXT NOT NULL,
    PRIMARY KEY (UserId, AlbumId),
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (AlbumId) REFERENCES Albums(Id) ON DELETE RESTRICT
);

-- UserFollowedArtists
CREATE TABLE IF NOT EXISTS UserFollowedArtists (
    UserId INTEGER NOT NULL,
    ArtistId INTEGER NOT NULL,
    FollowedAt TEXT NOT NULL,
    PRIMARY KEY (UserId, ArtistId),
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (ArtistId) REFERENCES Artists(Id) ON DELETE RESTRICT
);

-- UserPlaylists
CREATE TABLE IF NOT EXISTS UserPlaylists (
    UserId INTEGER NOT NULL,
    PlaylistId INTEGER NOT NULL,
    Relation INTEGER NOT NULL,
    FollowedAt TEXT,
    PRIMARY KEY (UserId, PlaylistId),
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (PlaylistId) REFERENCES Playlists(Id) ON DELETE CASCADE
);

-- ListeningHistory
CREATE TABLE IF NOT EXISTS ListeningHistory (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    TrackId INTEGER NOT NULL,
    PlayedAt TEXT NOT NULL,
    Longitude INTEGER,
    Latitude INTEGER,
    MsPlayed INTEGER NOT NULL DEFAULT 0,
    ContextUri TEXT,
    DeviceType TEXT,
    Source INTEGER NOT NULL DEFAULT 0,
    DedupeKey TEXT,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (TrackId) REFERENCES Tracks(Id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS IX_ListeningHistory_UserId_PlayedAt ON ListeningHistory(UserId, PlayedAt);
CREATE UNIQUE INDEX IF NOT EXISTS UX_ListeningHistory_DedupeKey_NotNull ON ListeningHistory(DedupeKey) WHERE DedupeKey IS NOT NULL;

-- Follows (social graph)
CREATE TABLE IF NOT EXISTS Follows (
    FollowerUserId INTEGER NOT NULL,
    FolloweeUserId INTEGER NOT NULL,
    CreatedAt TEXT NOT NULL,
    PRIMARY KEY (FollowerUserId, FolloweeUserId),
    FOREIGN KEY (FollowerUserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (FolloweeUserId) REFERENCES Users(Id) ON DELETE CASCADE
);

-- Posts (feed)
CREATE TABLE IF NOT EXISTS Posts (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    Type INTEGER NOT NULL,
    TrackId INTEGER,
    AlbumId INTEGER,
    PlaylistId INTEGER,
    SourceListeningHistoryId INTEGER,
    CreatedAt TEXT NOT NULL,
    Visibility INTEGER NOT NULL DEFAULT 0,
    MetadataJson TEXT,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (TrackId) REFERENCES Tracks(Id) ON DELETE RESTRICT,
    FOREIGN KEY (AlbumId) REFERENCES Albums(Id) ON DELETE RESTRICT,
    FOREIGN KEY (PlaylistId) REFERENCES Playlists(Id) ON DELETE RESTRICT,
    FOREIGN KEY (SourceListeningHistoryId) REFERENCES ListeningHistory(Id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS IX_Posts_UserId_CreatedAt ON Posts(UserId, CreatedAt);

-- SpotifySyncStates
CREATE TABLE IF NOT EXISTS SpotifySyncStates (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL UNIQUE,
    RecentlyPlayedLastAt TEXT,
    LikedTracksLastAt TEXT,
    LikedAlbumsLastAt TEXT,
    FollowedArtistsLastAt TEXT,
    PlaylistsLastSnapshotId TEXT,
    LastFullSyncAt TEXT,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

COMMIT;
