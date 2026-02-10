import { FeedPost } from "@/services/feedApi";
import React from "react";
import ForYouCard from "./for-you-card";
import ListeningSessionPost from "./listening-session-post";
import SharedAlbumPost from "./shared-album-post";
import SharedArtistPost from "./shared-artist-post";
import SharedPlaylistPost from "./shared-playlist-post";
import SharedTrackPost from "./shared-track-post";

interface FeedItemRouterProps {
  item: FeedPost | { type: "ForYou" };
}

export default function FeedItemRouter({ item }: FeedItemRouterProps) {
  switch (item.type) {
    case "ForYou":
      return <ForYouCard />;
    case "SharedTrack":
      return <SharedTrackPost item={item as FeedPost} />;
    case "SharedPlaylist":
      return <SharedPlaylistPost item={item as FeedPost} />;
    case "SharedAlbum":
      return <SharedAlbumPost item={item as FeedPost} />;
    case "SharedArtist":
      return <SharedArtistPost item={item as FeedPost} />;
    case "ListeningSession":
      return <ListeningSessionPost item={item as FeedPost} />;
    default:
      return null;
  }
}
