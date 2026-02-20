-- ========================================
-- HEALTH TRACKING PLATFORM - Database Schema
-- Data Engineer: AMRANE
-- Ticket: SCRUM-12
-- Description: Database schema for health tracking application
-- ========================================

-- Drop tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS anomalies;
DROP TABLE IF EXISTS heart_rate;
DROP TABLE IF EXISTS sleep_records;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS users;

-- ========================================
-- TABLE: users
-- Description: User profiles and basic information
-- ========================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    age INT CHECK (age >= 18 AND age <= 120),
    gender ENUM('M', 'F', 'Other'),
    weight_kg FLOAT CHECK (weight_kg > 0),
    height_cm FLOAT CHECK (height_cm > 0 AND height_cm < 300),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User profiles for health tracking application';

-- ========================================
-- TABLE: activities
-- Description: Physical activities tracking
-- ========================================
CREATE TABLE activities (
    activity_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity_type ENUM('running', 'walking', 'cycling', 'gym', 'swimming', 'yoga', 'other') NOT NULL,
    distance_km FLOAT CHECK (distance_km >= 0),
    duration_minutes INT CHECK (duration_minutes > 0) NOT NULL,
    calories_burned INT CHECK (calories_burned >= 0),
    steps INT CHECK (steps >= 0),
    avg_heart_rate INT CHECK (avg_heart_rate > 0 AND avg_heart_rate < 250),
    max_heart_rate INT CHECK (max_heart_rate > 0 AND max_heart_rate < 250),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    
    -- Foreign key
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_activity_type (activity_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Physical activities performed by users';

-- ========================================
-- TABLE: sleep_records
-- Description: Daily sleep tracking
-- ========================================
CREATE TABLE sleep_records (
    sleep_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    sleep_date DATE NOT NULL,
    total_hours FLOAT CHECK (total_hours >= 0 AND total_hours <= 24),
    deep_sleep_hours FLOAT CHECK (deep_sleep_hours >= 0),
    light_sleep_hours FLOAT CHECK (light_sleep_hours >= 0),
    rem_sleep_hours FLOAT CHECK (rem_sleep_hours >= 0),
    awakenings INT CHECK (awakenings >= 0),
    quality_score INT CHECK (quality_score >= 0 AND quality_score <= 100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    
    -- Unique constraint: one sleep record per user per day
    UNIQUE KEY uk_user_sleep_date (user_id, sleep_date),
    
    -- Foreign key
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_sleep_date (sleep_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Daily sleep records with quality metrics';

-- ========================================
-- TABLE: heart_rate
-- Description: Heart rate measurements
-- ========================================
CREATE TABLE heart_rate (
    hr_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    bpm INT NOT NULL CHECK (bpm > 0 AND bpm < 250),
    context ENUM('resting', 'exercising', 'sleeping', 'stressed', 'other') DEFAULT 'other',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_context (context)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Heart rate measurements in different contexts';

-- ========================================
-- TABLE: anomalies
-- Description: Health anomalies detection
-- ========================================
CREATE TABLE anomalies (
    anomaly_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    anomaly_type ENUM(
        'high_resting_hr', 
        'low_resting_hr', 
        'insufficient_sleep', 
        'excessive_sleep', 
        'low_activity', 
        'excessive_activity', 
        'irregular_pattern', 
        'other'
    ) NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
    value FLOAT,
    threshold FLOAT,
    description TEXT NOT NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP NULL,
    
    -- Foreign key
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_detected_at (detected_at),
    INDEX idx_anomaly_type (anomaly_type),
    INDEX idx_severity (severity),
    INDEX idx_resolved (resolved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Detected health anomalies and alerts';

-- ========================================
-- VIEWS: Useful aggregated data
-- ========================================

-- View: User statistics summary
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.user_id,
    u.username,
    u.email,
    COUNT(DISTINCT a.activity_id) as total_activities,
    COALESCE(SUM(a.steps), 0) as total_steps,
    COALESCE(SUM(a.calories_burned), 0) as total_calories,
    COALESCE(AVG(s.total_hours), 0) as avg_sleep_hours,
    COALESCE(AVG(s.quality_score), 0) as avg_sleep_quality,
    COUNT(DISTINCT an.anomaly_id) as total_anomalies
FROM users u
LEFT JOIN activities a ON u.user_id = a.user_id
LEFT JOIN sleep_records s ON u.user_id = s.user_id
LEFT JOIN anomalies an ON u.user_id = an.user_id AND an.resolved = FALSE
GROUP BY u.user_id, u.username, u.email;

-- View: Daily activity summary
CREATE OR REPLACE VIEW daily_activity_summary AS
SELECT 
    user_id,
    DATE(timestamp) as activity_date,
    COUNT(*) as num_activities,
    SUM(steps) as total_steps,
    SUM(calories_burned) as total_calories,
    SUM(duration_minutes) as total_duration_minutes,
    AVG(avg_heart_rate) as avg_heart_rate
FROM activities
GROUP BY user_id, DATE(timestamp)
ORDER BY activity_date DESC;

-- ========================================
-- INITIAL DATA (Optional - for testing)
-- ========================================

-- Uncomment to create a test user
-- INSERT INTO users (username, email, first_name, last_name, age, gender, weight_kg, height_cm) 
-- VALUES ('test_user', 'test@example.com', 'Test', 'User', 30, 'M', 75.0, 175.0);

-- ========================================
-- END OF SCHEMA
-- ========================================