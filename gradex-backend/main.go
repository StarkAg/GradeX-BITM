package main

import (
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"gradex-backend/src/srm"
	"gradex-backend/src/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
)

// In-memory session storage (temporary - replace with database later)
var (
	sessionStore = make(map[string]*SessionData)
	sessionMutex sync.RWMutex
)

type SessionData struct {
	UserID    string
	Email     string
	Cookies   string
	LoginTime time.Time
	LastUsed  time.Time
}

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("[Server] No .env file found, using system environment variables")
	}

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "GradeX SRM Backend",
		ServerHeader: "GradeX",
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} (${latency})\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization",
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":    "ok",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	})

	// Stats endpoint - check active sessions and resource usage
	app.Get("/api/stats", handleStats)

	// API routes
	app.Post("/api/srm/login", handleLogin)
	app.Get("/api/srm/data", handleData)
	app.Get("/api/srm/calendar", handleCalendar)
	app.Get("/api/srm/timetable", handleTimetable)
	app.Post("/api/srm/logout", handleLogout)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("[Server] Starting GradeX SRM Backend on port %s...\n", port)
	log.Fatal(app.Listen(":" + port))
}

// handleLogin handles POST /api/srm/login
func handleLogin(c *fiber.Ctx) error {
	var req struct {
		UserID   string `json:"userId"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	if req.UserID == "" || req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "UserID, Email, and Password are required",
		})
	}

	log.Printf("[API] Login request for user_id: %s***, email: %s***\n", req.UserID[:min(8, len(req.UserID))], req.Email[:min(3, len(req.Email))])

	// Use working AttendanceFlow for login
	flow := srm.NewAttendanceFlow(req.Email, req.Password)

	if err := flow.Login(); err != nil {
		log.Printf("[API] Login error: %v\n", err)

		// Check if it's a CAPTCHA error
		if strings.Contains(err.Error(), "CAPTCHA") {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"error":   "CAPTCHA required",
				"captcha": true,
			})
		}

		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid credentials or login failed",
		})
	}

	// Store session
	cookies := flow.GetCookies()
	sessionMutex.Lock()
	sessionStore[req.UserID] = &SessionData{
		UserID:    req.UserID,
		Email:     req.Email,
		Cookies:   cookies,
		LoginTime: time.Now(),
		LastUsed:  time.Now(),
	}
	sessionMutex.Unlock()

	log.Printf("[API] ✓ Login successful for user_id: %s***\n", req.UserID[:min(8, len(req.UserID))])

	// Note: We don't validate session immediately after login because:
	// 1. SRM may need a moment for session to be fully established
	// 2. Parsing errors ("invalid response format") are not auth failures
	// 3. Network/temporary SRM issues shouldn't block valid logins
	// Session validation will happen when user actually tries to fetch data
	// If credentials are wrong, the initial Login() call would have failed

	// Fetch and cache timetable after successful login (non-blocking)
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	
	if supabaseURL != "" && supabaseKey != "" {
		go func() {
			// Wait a moment for session to be fully established
			time.Sleep(500 * time.Millisecond)
			
			// Fetch timetable
			timetableFlow := srm.NewAttendanceFlowWithCookies(cookies)
			timetable, err := timetableFlow.GetTimetable()
			if err != nil {
				log.Printf("[Cache] Failed to fetch timetable for caching: %v\n", err)
				return
			}

			// Convert timetable to map for caching
			timetableMap := make(map[string]interface{})
			if timetable != nil {
				// Convert Courses slice to []interface{} for JSON serialization
				coursesArray := make([]interface{}, len(timetable.Courses))
				for i, course := range timetable.Courses {
					coursesArray[i] = course
				}
				
				timetableMap["regNumber"] = timetable.RegNumber
				timetableMap["academicYear"] = timetable.AcademicYear
				timetableMap["batchNumber"] = timetable.BatchNumber
				timetableMap["studentName"] = timetable.StudentName
				timetableMap["program"] = timetable.Program
				timetableMap["department"] = timetable.Department
				timetableMap["semester"] = timetable.Semester
				timetableMap["courses"] = coursesArray // Always an array, never nil
				timetableMap["schedule"] = timetable.Schedule
				timetableMap["batch"] = timetable.Batch
			} else {
				// Ensure courses is always an array even if timetable is nil
				timetableMap["courses"] = []interface{}{}
			}

			// Save to cache
			if err := utils.SaveTimetableCache(req.UserID, timetableMap, supabaseURL, supabaseKey); err != nil {
				log.Printf("[Cache] Failed to cache timetable after login: %v\n", err)
			} else {
				log.Printf("[Cache] ✓ Cached timetable for user_id: %s***\n", req.UserID[:min(8, len(req.UserID))])
			}
		}()
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Login successful. Session established.",
	})
}

// handleData handles GET /api/srm/data?userId=xxx&refresh=false
func handleData(c *fiber.Ctx) error {
	userID := c.Query("userId")
	refresh := c.Query("refresh") == "true"

	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "userId parameter is required",
		})
	}

	// Get session
	sessionMutex.RLock()
	session, exists := sessionStore[userID]
	sessionMutex.RUnlock()

	if !exists || session.Cookies == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success":       false,
			"requiresLogin": true,
			"error":         "No valid session found. Please login first.",
		})
	}

	// Update last used
	sessionMutex.Lock()
	session.LastUsed = time.Now()
	sessionMutex.Unlock()

	log.Printf("[API] Fetching data for user_id: %s*** (refresh=%v)\n", userID[:min(8, len(userID))], refresh)

	// Create flow with stored cookies (we need to recreate it with cookies)
	flow := srm.NewAttendanceFlowWithCookies(session.Cookies)

	// Fetch all data concurrently
	type result struct {
		Key   string
		Value interface{}
		Error error
	}
	results := make(chan result, 5)

	// Attendance
	go func() {
		attendance, err := flow.GetAttendance()
		results <- result{"attendance", attendance, err}
	}()

	// Courses (need to implement)
	go func() {
		courses, err := flow.GetCourses()
		results <- result{"courses", courses, err}
	}()

	// Marks (need to implement)
	go func() {
		marks, err := flow.GetMarks()
		results <- result{"marks", marks, err}
	}()

	// User info (need to implement)
	go func() {
		user, err := flow.GetUserInfo()
		results <- result{"user", user, err}
	}()

	// Timetable (generated from courses)
	go func() {
		courses, err := flow.GetCourses()
		if err != nil {
			results <- result{"timetable", nil, err}
			return
		}
		timetable := flow.GenerateTimetable(courses)
		results <- result{"timetable", timetable, nil}
	}()

	// Collect results
	response := fiber.Map{
		"success": true,
		"data":    fiber.Map{},
	}

	for i := 0; i < 5; i++ {
		res := <-results
		if res.Error != nil {
			response["data"].(fiber.Map)[res.Key] = fiber.Map{
				"error": res.Error.Error(),
			}
		} else {
			response["data"].(fiber.Map)[res.Key] = res.Value
		}
	}

	return c.JSON(response)
}

// handleCalendar handles GET /api/srm/calendar?userId=xxx
func handleCalendar(c *fiber.Ctx) error {
	userID := c.Query("userId")

	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "userId parameter is required",
		})
	}

	// Get session
	sessionMutex.RLock()
	session, exists := sessionStore[userID]
	sessionMutex.RUnlock()

	if !exists || session.Cookies == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success":       false,
			"requiresLogin": true,
			"error":         "No valid session found. Please login first.",
		})
	}

	// Update last used
	sessionMutex.Lock()
	session.LastUsed = time.Now()
	sessionMutex.Unlock()

	flow := srm.NewAttendanceFlowWithCookies(session.Cookies)
	calendar, err := flow.GetCalendar()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success":  true,
		"calendar": calendar,
	})
}

// handleTimetable handles GET /api/srm/timetable?userId=xxx
func handleTimetable(c *fiber.Ctx) error {
	userID := c.Query("userId")

	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "userId parameter is required",
		})
	}

	// Get session
	sessionMutex.RLock()
	session, exists := sessionStore[userID]
	sessionMutex.RUnlock()

	if !exists || session.Cookies == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success":       false,
			"requiresLogin": true,
			"error":         "No valid session found. Please login first.",
		})
	}

	// Update last used
	sessionMutex.Lock()
	session.LastUsed = time.Now()
	sessionMutex.Unlock()

	// Check Supabase cache first
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	
	if supabaseURL != "" && supabaseKey != "" {
		cache, err := utils.GetTimetableCache(userID, supabaseURL, supabaseKey)
		if err != nil {
			log.Printf("[Cache] Error checking cache: %v\n", err)
		} else if cache != nil {
			log.Printf("[Cache] Cache HIT for user_id: %s***\n", userID[:min(8, len(userID))])
			// Return cached data
			return c.JSON(fiber.Map{
				"success":   true,
				"timetable": cache.RawData,
				"cached":    true,
			})
		}
		log.Printf("[Cache] Cache MISS for user_id: %s***\n", userID[:min(8, len(userID))])
	}

	// Cache miss or error - fetch from SRM
	log.Printf("[API] Fetching timetable from SRM for user_id: %s***\n", userID[:min(8, len(userID))])

	flow := srm.NewAttendanceFlowWithCookies(session.Cookies)
	timetable, err := flow.GetTimetable()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   err.Error(),
		})
	}

	// Convert timetable to map for caching
	timetableMap := make(map[string]interface{})
	if timetable != nil {
		// Convert Courses slice to []interface{} for JSON serialization
		coursesArray := make([]interface{}, len(timetable.Courses))
		for i, course := range timetable.Courses {
			coursesArray[i] = course
		}
		
		timetableMap["regNumber"] = timetable.RegNumber
		timetableMap["academicYear"] = timetable.AcademicYear
		timetableMap["batchNumber"] = timetable.BatchNumber
		timetableMap["studentName"] = timetable.StudentName
		timetableMap["program"] = timetable.Program
		timetableMap["department"] = timetable.Department
		timetableMap["semester"] = timetable.Semester
		timetableMap["courses"] = coursesArray // Always an array, never nil
		timetableMap["schedule"] = timetable.Schedule
		timetableMap["batch"] = timetable.Batch
	} else {
		// Ensure courses is always an array even if timetable is nil
		timetableMap["courses"] = []interface{}{}
	}

	// Save to cache (non-blocking)
	if supabaseURL != "" && supabaseKey != "" {
		go func() {
			if err := utils.SaveTimetableCache(userID, timetableMap, supabaseURL, supabaseKey); err != nil {
				log.Printf("[Cache] Failed to save cache: %v\n", err)
			} else {
				log.Printf("[Cache] Saved timetable cache for user_id: %s***\n", userID[:min(8, len(userID))])
			}
		}()
	}

	return c.JSON(fiber.Map{
		"success":   true,
		"timetable": timetable,
		"cached":    false,
	})
}

// handleLogout handles POST /api/srm/logout
func handleLogout(c *fiber.Ctx) error {
	var req struct {
		UserID string `json:"userId"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	sessionMutex.Lock()
	delete(sessionStore, req.UserID)
	sessionMutex.Unlock()

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Logged out successfully",
	})
}

// handleStats handles GET /api/stats - returns active sessions and resource info
func handleStats(c *fiber.Ctx) error {
	sessionMutex.RLock()
	activeSessions := len(sessionStore)
	
	// Get session details (without sensitive cookie data)
	sessions := make([]fiber.Map, 0, activeSessions)
	for userID, session := range sessionStore {
		sessions = append(sessions, fiber.Map{
			"userID":    userID[:min(8, len(userID))] + "***",
			"email":     session.Email[:min(3, len(session.Email))] + "***",
			"loginTime": session.LoginTime.Format(time.RFC3339),
			"lastUsed":  session.LastUsed.Format(time.RFC3339),
			"cookieSize": len(session.Cookies),
		})
	}
	sessionMutex.RUnlock()

	// Calculate total memory used by cookies (approximate)
	totalCookieSize := 0
	for _, session := range sessionStore {
		totalCookieSize += len(session.Cookies)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"stats": fiber.Map{
			"activeSessions": activeSessions,
			"totalCookieSize": totalCookieSize,
			"averageCookieSize": func() int {
				if activeSessions == 0 {
					return 0
				}
				return totalCookieSize / activeSessions
			}(),
			"sessions": sessions,
		},
	})
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
