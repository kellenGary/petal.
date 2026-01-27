using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using PetalAPI.Data;
using PetalAPI.Services;
using System.IO;

// Load .env file
DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);

// Add environment variables to configuration
builder.Configuration.AddEnvironmentVariables();

// Add HTTP logging (minimal)
builder.Services.AddHttpLogging(logging =>
{
    logging.LoggingFields = Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.RequestPath | 
                            Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.RequestMethod |
                            Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.ResponseStatusCode;
});

// Add services to the container.
// Configure JSON options to allow enum values to be passed as strings (e.g. "Public")
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddOpenApi();
builder.Services.AddHttpClient(); // Add HttpClient for Spotify API calls

// Add SQLite Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection"))
    .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

// Add JWT Service
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<ISpotifyTokenService, SpotifyTokenService>();
builder.Services.AddScoped<IListeningHistoryService, ListeningHistoryService>();
builder.Services.AddScoped<IListeningSessionService, ListeningSessionService>();
builder.Services.AddScoped<IPlaylistSyncService, PlaylistSyncService>();
builder.Services.AddScoped<ISavedTracksSyncService, SavedTracksSyncService>();
builder.Services.AddScoped<PostService>();

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secretKey = jwtSettings["SecretKey"];

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey!)),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

var app = builder.Build();

// Ensure database is created
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    // Apply SQL views from script
    try
    {
        var contentRoot = app.Environment.ContentRootPath;
        var scriptPath = Path.Combine(contentRoot, "scripts", "create_views.sql");
        if (File.Exists(scriptPath))
        {
            var sql = File.ReadAllText(scriptPath);
            db.Database.ExecuteSqlRaw(sql);
            Console.WriteLine("Applied SQL views from scripts/create_views.sql");
        }
        else
        {
            Console.WriteLine($"SQL view script not found at: {scriptPath}");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Failed to apply SQL views: {ex.Message}");
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseHttpLogging();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

// Enable CORS for React Native app
app.UseCors(policy => policy
    .AllowAnyOrigin()
    .AllowAnyMethod()
    .AllowAnyHeader());

app.MapControllers();

app.Run();
