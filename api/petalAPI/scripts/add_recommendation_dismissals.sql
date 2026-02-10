-- Create RecommendationDismissals table
CREATE TABLE IF NOT EXISTS "RecommendationDismissals" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_RecommendationDismissals" PRIMARY KEY AUTOINCREMENT,
    "UserId" INTEGER NOT NULL,
    "TrackId" INTEGER NOT NULL,
    "DismissedAt" TEXT NOT NULL,
    CONSTRAINT "FK_RecommendationDismissals_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_RecommendationDismissals_Tracks_TrackId" FOREIGN KEY ("TrackId") REFERENCES "Tracks" ("Id") ON DELETE CASCADE
);

-- Create indices
CREATE UNIQUE INDEX IF NOT EXISTS "IX_RecommendationDismissals_UserId_TrackId" ON "RecommendationDismissals" ("UserId", "TrackId");
CREATE INDEX IF NOT EXISTS "IX_RecommendationDismissals_TrackId" ON "RecommendationDismissals" ("TrackId");
