package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

// TimetableCache represents a cached timetable entry
type TimetableCache struct {
	ID               string                 `json:"id"`
	UserID           string                 `json:"user_id"`
	RegistrationNumber string               `json:"registration_number"`
	AcademicYear     string                 `json:"academic_year"`
	BatchNumber      int                    `json:"batch_number"`
	StudentName      string                 `json:"student_name"`
	Program          string                 `json:"program"`
	Department       string                 `json:"department"`
	Semester         string                 `json:"semester"`
	Courses          []interface{}          `json:"courses"`
	RawData          map[string]interface{} `json:"raw_data"`
	CreatedAt        time.Time              `json:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at"`
	ExpiresAt        time.Time              `json:"expires_at"`
}

// GetTimetableCache checks Supabase for cached timetable
func GetTimetableCache(userID, supabaseURL, supabaseKey string) (*TimetableCache, error) {
	if supabaseURL == "" || supabaseKey == "" {
		return nil, fmt.Errorf("supabase credentials not configured")
	}

	url := fmt.Sprintf("%s/rest/v1/timetable_cache?user_id=eq.%s&expires_at=gt.now()&select=*", supabaseURL, userID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("apikey", supabaseKey)
	req.Header.Set("Authorization", "Bearer "+supabaseKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=representation")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch cache: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusNoContent {
		return nil, nil // Cache miss
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("supabase error: %d - %s", resp.StatusCode, string(body))
	}

	var cache []TimetableCache
	if err := json.NewDecoder(resp.Body).Decode(&cache); err != nil {
		return nil, fmt.Errorf("failed to decode cache: %w", err)
	}

	if len(cache) == 0 {
		return nil, nil // Cache miss
	}

	return &cache[0], nil
}

// SaveTimetableCache saves timetable to Supabase cache
func SaveTimetableCache(userID string, timetable map[string]interface{}, supabaseURL, supabaseKey string) error {
	if supabaseURL == "" || supabaseKey == "" {
		return fmt.Errorf("supabase credentials not configured")
	}

	// Extract data from timetable response
	// Handle courses - convert to []interface{} and ensure all items are maps (not structs)
	var courses []interface{}
	coursesRaw, exists := timetable["courses"]
	if !exists || coursesRaw == nil {
		log.Printf("[Cache] WARNING: courses field missing or nil in timetable map")
		courses = []interface{}{}
	} else {
		// Always convert to JSON and back to ensure proper serialization
		// This handles []Course structs, []interface{}, []map[string]interface{}, etc.
		jsonData, err := json.Marshal(coursesRaw)
		if err != nil {
			log.Printf("[Cache] ERROR: Failed to marshal courses: %v", err)
			courses = []interface{}{}
		} else {
			// Unmarshal into []interface{} to ensure proper JSON format
			var temp []interface{}
			if err := json.Unmarshal(jsonData, &temp); err != nil {
				log.Printf("[Cache] ERROR: Failed to unmarshal courses JSON: %v", err)
				courses = []interface{}{}
			} else {
				courses = temp
				log.Printf("[Cache] Successfully extracted courses via JSON conversion, count: %d", len(courses))
			}
		}
		
		// Final safety check - ensure it's never nil
		if courses == nil {
			log.Printf("[Cache] WARNING: courses is nil after extraction, using empty array")
			courses = []interface{}{}
		}
	}
	
	// Log final courses count for debugging
	log.Printf("[Cache] Final courses array length: %d (will be saved to Supabase)", len(courses))
	regNumber, _ := timetable["regNumber"].(string)
	academicYear, _ := timetable["academicYear"].(string)
	batchNumber := 1
	if b, ok := timetable["batchNumber"].(float64); ok {
		batchNumber = int(b)
	} else if b, ok := timetable["batchNumber"].(int); ok {
		batchNumber = b
	} else if b, ok := timetable["batchNumber"].(string); ok {
		// Try to parse string batch number (e.g., "1" or "2")
		var parsed int
		if _, err := fmt.Sscanf(b, "%d", &parsed); err == nil && parsed > 0 {
			batchNumber = parsed
		}
	}
	studentName, _ := timetable["studentName"].(string)
	program, _ := timetable["program"].(string)
	department, _ := timetable["department"].(string)
	semester, _ := timetable["semester"].(string)

	// Prepare cache entry
	// Ensure courses is always an array (never null) to satisfy NOT NULL constraint
	cacheEntry := map[string]interface{}{
		"user_id":            userID,
		"registration_number": regNumber,
		"academic_year":      academicYear,
		"batch_number":       batchNumber,
		"student_name":       studentName,
		"program":            program,
		"department":         department,
		"semester":           semester,
		"courses":            courses, // Always an array, never nil
		"raw_data":           timetable,
		"expires_at":         time.Now().Add(7 * 24 * time.Hour).Format(time.RFC3339), // 7 days
	}
	
	// Debug: Verify courses is set correctly before sending
	if courses == nil {
		log.Printf("[Cache] CRITICAL ERROR: courses is nil in cacheEntry before marshaling!")
		cacheEntry["courses"] = []interface{}{}
	} else {
		log.Printf("[Cache] courses in cacheEntry: type=%T, len=%d", cacheEntry["courses"], len(courses))
		// Verify it's actually an array by checking first element
		if len(courses) > 0 {
			log.Printf("[Cache] First course sample: %+v", courses[0])
		}
	}
	
	// Debug: Marshal cacheEntry to see what we're actually sending
	debugJSON, _ := json.Marshal(cacheEntry)
	log.Printf("[Cache] CacheEntry JSON (first 500 chars): %s", string(debugJSON)[:min(500, len(debugJSON))])

	// Check if cache exists first, then use PATCH for update or POST for insert
	existingCache, _ := GetTimetableCache(userID, supabaseURL, supabaseKey)
	
	var url string
	var method string
	
	if existingCache != nil {
		// Update existing - use PATCH
		url = fmt.Sprintf("%s/rest/v1/timetable_cache?user_id=eq.%s", supabaseURL, userID)
		method = "PATCH"
	} else {
		// Insert new - use POST
		url = fmt.Sprintf("%s/rest/v1/timetable_cache", supabaseURL)
		method = "POST"
	}
	
	jsonData, err := json.Marshal(cacheEntry)
	if err != nil {
		return fmt.Errorf("failed to marshal cache: %w", err)
	}

	req, err := http.NewRequest(method, url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("apikey", supabaseKey)
	req.Header.Set("Authorization", "Bearer "+supabaseKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=representation")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to save cache: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		errorMsg := fmt.Sprintf("failed to save cache: supabase error: %d - %s", resp.StatusCode, string(body))
		log.Printf("[Cache] ERROR: %s", errorMsg)
		return fmt.Errorf(errorMsg)
	}

	if method == "PATCH" {
		log.Printf("[Cache] ✓ Updated timetable cache via PATCH for user_id: %s***", userID[:min(8, len(userID))])
	} else {
		log.Printf("[Cache] ✓ Created timetable cache via POST for user_id: %s***", userID[:min(8, len(userID))])
	}
	return nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

