using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using PetalAPI.Data;
using PetalAPI.Services;
using System.IO;
using System.Net.Sockets;

// Load .env file
DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);

// Add environment variables to configuration
builder.Configuration.AddEnvironmentVariables();

builder.Services.AddMemoryCache();

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
builder.Services.AddSwaggerGen(c =>
{
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    c.IncludeXmlComments(xmlPath);
});
builder.Services.AddHttpClient("Spotify", client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
}).ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
{
    ConnectCallback = async (context, cancellationToken) =>
    {
        var entry = await System.Net.Dns.GetHostEntryAsync(context.DnsEndPoint.Host, cancellationToken);
        var ip = entry.AddressList.FirstOrDefault(x => x.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork) 
             ?? throw new Exception($"No IPv4 address found for {context.DnsEndPoint.Host}");
        
        var socket = new System.Net.Sockets.Socket(System.Net.Sockets.AddressFamily.InterNetwork, System.Net.Sockets.SocketType.Stream, System.Net.Sockets.ProtocolType.Tcp);
        try
        {
            await socket.ConnectAsync(ip, context.DnsEndPoint.Port, cancellationToken);
            return new NetworkStream(socket, ownsSocket: true);
        }
        catch
        {
            socket.Dispose();
            throw;
        }
    }
});
// Register default as well for other usages not using named client, but best to migrate
builder.Services.AddHttpClient();

// Add SQLite Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection"))
    .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

// Add JWT Service
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<ISpotifyTokenService, SpotifyTokenService>();
builder.Services.AddScoped<ISpotifyAuthService, SpotifyAuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IListeningHistoryService, ListeningHistoryService>();
builder.Services.AddScoped<IListeningSessionService, ListeningSessionService>();
builder.Services.AddScoped<IPlaylistSyncService, PlaylistSyncService>();
builder.Services.AddScoped<ISavedTracksSyncService, SavedTracksSyncService>();
builder.Services.AddScoped<IPostService, PostService>();
builder.Services.AddScoped<ISpotifyDataService, SpotifyDataService>();

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

    // Apply migration for caching columns (manual safe execution)
    try 
    {
        var contentRoot = app.Environment.ContentRootPath;
        var scriptPath = Path.Combine(contentRoot, "scripts", "add_caching_columns.sql");
        if (File.Exists(scriptPath))
        {
            var existingCols = db.Database.SqlQueryRaw<string>("SELECT name FROM pragma_table_info('Users')").ToList();
            if (!existingCols.Contains("TopArtistsJson"))
            {
                var sql = File.ReadAllText(scriptPath);
                db.Database.ExecuteSqlRaw(sql);
                Console.WriteLine("Applied caching columns migration.");
            }
        }
    }
    catch (Exception ex)
    {
         Console.WriteLine($"Failed to apply caching columns: {ex.Message}");
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseHttpLogging();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Custom Middleware: Log request duration and details
app.Use(async (context, next) =>
{
    var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
    var sw = System.Diagnostics.Stopwatch.StartNew();
    
    // Log start (optional, but helpful for debugging hangs)
    // logger.LogInformation("[API Request] {Method} {Path} Started", context.Request.Method, context.Request.Path);
    
    await next();
    
    sw.Stop();
    logger.LogInformation("[API Request] {Method} {Path} responded {StatusCode} in {Elapsed}ms", 
        context.Request.Method, 
        context.Request.Path, 
        context.Response.StatusCode, 
        sw.ElapsedMilliseconds);
});

app.UseAuthentication();
app.UseAuthorization();

// Enable CORS for React Native app
app.UseCors(policy => policy
    .AllowAnyOrigin()
    .AllowAnyMethod()
    .AllowAnyHeader());

app.MapControllers();

app.Run();
