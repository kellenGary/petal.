using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Security.Claims;
using MFAPI.Services;
using MFAPI.Data;
using System.ComponentModel;

namespace MFAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DbController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<DbController> _logger;
    private readonly AppDbContext _context;

    public DbController(
        IHttpClientFactory httpClientFactory,
        ILogger<DbController> logger,
        AppDbContext context)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _context = context;
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        _logger.LogInformation("[API] Fetching all users from database");

        var users = await _context.Users.ToListAsync();

        _logger.LogInformation("[API] Retrieved {UserCount} users", users.Count);

        return Ok(users);
    }
}

