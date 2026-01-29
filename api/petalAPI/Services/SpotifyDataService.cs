using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PetalAPI.Data;
using PetalAPI.Models;

namespace PetalAPI.Services;

public interface ISpotifyDataService
{
    Task<Artist?> GetOrCreateArtistAsync(string spotifyId, string artistName, string accessToken);
    Task<Artist?> GetOrCreateArtistAsync(JsonElement artistSimpleElement, string accessToken);
}

public class SpotifyDataService : ISpotifyDataService
{
    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SpotifyDataService> _logger;

    public SpotifyDataService(
        AppDbContext context,
        IHttpClientFactory httpClientFactory,
        ILogger<SpotifyDataService> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<Artist?> GetOrCreateArtistAsync(JsonElement artistElement, string accessToken)
    {
        var spotifyId = artistElement.TryGetProperty("id", out var idProp) 
            ? idProp.GetString() 
            : null;
        
        var name = artistElement.TryGetProperty("name", out var nameProp) 
            ? nameProp.GetString() ?? "Unknown" 
            : "Unknown";

        if (string.IsNullOrEmpty(spotifyId))
        {
            return null;
        }

        return await GetOrCreateArtistAsync(spotifyId, name, accessToken);
    }

    public async Task<Artist?> GetOrCreateArtistAsync(string spotifyId, string artistName, string accessToken)
    {
        if (string.IsNullOrEmpty(spotifyId))
        {
            return null;
        }

        // Check if artist already exists
        var existingArtist = await _context.Artists
            .FirstOrDefaultAsync(a => a.SpotifyId == spotifyId);

        if (existingArtist != null)
        {
            // If the existing artist has minimal data (e.g. no image/popularity/genres), we might want to update it.
            // For now, let's assume if it exists we return it, but maybe check if we need to enrich it later?
            // To be safe and follow the request "fetch genres/profile/popularity", we should probably backfill if missing.
            if (existingArtist.ImageUrl == null || existingArtist.Popularity == null)
            {
                // Fall through to fetch from Spotify and update
                 _logger.LogDebug("[SpotifyData] Artist {Name} exists but missing details, fetching from Spotify...", existingArtist.Name);
            }
            else
            {
                return existingArtist;
            }
        }

        // Fetch full artist object from Spotify to get genres/images/popularity
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        try 
        {
            var response = await client.GetAsync($"https://api.spotify.com/v1/artists/{spotifyId}");
            
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                var artistData = JsonSerializer.Deserialize<JsonElement>(content);

                // Get image URL
                string? imageUrl = null;
                if (artistData.TryGetProperty("images", out var imagesElement) && 
                    imagesElement.ValueKind == JsonValueKind.Array && 
                    imagesElement.GetArrayLength() > 0)
                {
                    imageUrl = imagesElement[0].TryGetProperty("url", out var urlProp) 
                        ? urlProp.GetString() 
                        : null;
                }

                // Get genres
                string? genresJson = null;
                if (artistData.TryGetProperty("genres", out var genresElement) && 
                    genresElement.ValueKind == JsonValueKind.Array)
                {
                    var genres = new List<string>();
                    foreach (var genre in genresElement.EnumerateArray())
                    {
                        var genreStr = genre.GetString();
                        if (!string.IsNullOrEmpty(genreStr))
                        {
                            genres.Add(genreStr);
                        }
                    }
                    if (genres.Count > 0)
                    {
                        genresJson = JsonSerializer.Serialize(genres);
                    }
                }

                int? popularity = artistData.TryGetProperty("popularity", out var popularityProp) 
                    ? popularityProp.GetInt32() 
                    : null;
                
                // Update name from full object if available (might be better than simplified one)
                var fullName = artistData.TryGetProperty("name", out var fnProp) ? fnProp.GetString() : artistName;

                if (existingArtist != null)
                {
                    // Update existing
                    existingArtist.ImageUrl = imageUrl;
                    existingArtist.GenresJson = genresJson;
                    existingArtist.Popularity = popularity;
                    await _context.SaveChangesAsync();
                     _logger.LogDebug("[SpotifyData] Updated artist details: {Name}", existingArtist.Name);
                    return existingArtist;
                }
                else 
                {
                    // Create new
                    var artist = new Artist
                    {
                        SpotifyId = spotifyId,
                        Name = fullName ?? artistName,
                        GenresJson = genresJson,
                        ImageUrl = imageUrl,
                        Popularity = popularity
                    };

                    _context.Artists.Add(artist);
                    await _context.SaveChangesAsync();
                    _logger.LogDebug("[SpotifyData] Created artist with details: {Name}", artist.Name);
                    return artist;
                }
            }
            else 
            {
                _logger.LogWarning("[SpotifyData] Failed to fetch artist details for {Id}: {Status}", spotifyId, response.StatusCode);
                
                // If checking for update, just return existing
                if (existingArtist != null) return existingArtist;

                // Fallback: create with minimal info
                var artist = new Artist
                {
                    SpotifyId = spotifyId,
                    Name = artistName
                };
                
                try
                {
                    _context.Artists.Add(artist);
                    await _context.SaveChangesAsync();
                    return artist;
                }
                catch (DbUpdateException) 
                {
                    // Race condition
                    _context.ChangeTracker.Clear();
                    return await _context.Artists.FirstOrDefaultAsync(a => a.SpotifyId == spotifyId);
                }
            }
        }
        catch (Exception ex)
        {
             _logger.LogError(ex, "[SpotifyData] Error fetching artist {Id}", spotifyId);
             if (existingArtist != null) return existingArtist;
             return null;
        }
    }
}
