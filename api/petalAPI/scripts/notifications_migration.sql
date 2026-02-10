-- Notifications System Migration
-- Run this script against petal.db to create the new tables

-- PostLikes table - tracks which users liked which posts
CREATE TABLE IF NOT EXISTS PostLikes (
    UserId INTEGER NOT NULL,
    PostId INTEGER NOT NULL,
    CreatedAt TEXT NOT NULL,
    PRIMARY KEY (UserId, PostId),
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (PostId) REFERENCES Posts(Id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS IX_PostLikes_CreatedAt ON PostLikes(CreatedAt);
CREATE INDEX IF NOT EXISTS IX_PostLikes_PostId ON PostLikes(PostId);

-- Reposts table - tracks repost relationships
CREATE TABLE IF NOT EXISTS Reposts (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    OriginalPostId INTEGER NOT NULL,
    RepostPostId INTEGER NOT NULL,
    CreatedAt TEXT NOT NULL,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (OriginalPostId) REFERENCES Posts(Id) ON DELETE RESTRICT,
    FOREIGN KEY (RepostPostId) REFERENCES Posts(Id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS IX_Reposts_UserId_OriginalPostId ON Reposts(UserId, OriginalPostId);
CREATE INDEX IF NOT EXISTS IX_Reposts_OriginalPostId ON Reposts(OriginalPostId);

-- Add OriginalPostId column to Posts table for repost references
ALTER TABLE Posts ADD COLUMN OriginalPostId INTEGER REFERENCES Posts(Id) ON DELETE SET NULL;

-- Notifications table
CREATE TABLE IF NOT EXISTS Notifications (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    ActorUserId INTEGER NOT NULL,
    Type INTEGER NOT NULL,  -- 0=Like, 1=Repost, 2=Follow
    PostId INTEGER,
    IsRead INTEGER NOT NULL DEFAULT 0,
    CreatedAt TEXT NOT NULL,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (ActorUserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (PostId) REFERENCES Posts(Id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS IX_Notifications_UserId_IsRead_CreatedAt ON Notifications(UserId, IsRead, CreatedAt);
CREATE INDEX IF NOT EXISTS IX_Notifications_UserId_CreatedAt ON Notifications(UserId, CreatedAt DESC);
