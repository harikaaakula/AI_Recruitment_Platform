const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'recruitment.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables - ERD COMPLIANT STRUCTURE
db.serialize(() => {
  // Users table (recruiters only - candidates are separate)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('recruiter')),
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Candidates table
  db.run(`
    CREATE TABLE IF NOT EXISTS candidates (
      candidate_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      resume_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Job roles table
  db.run(`
    CREATE TABLE IF NOT EXISTS job_roles (
      role_id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      requirements TEXT,
      salary_range TEXT,
      location TEXT,
      status TEXT DEFAULT 'active',
      recruiter_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recruiter_id) REFERENCES users (id)
    )
  `);

  // Applications table
  db.run(`
    CREATE TABLE IF NOT EXISTS applications (
      application_id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates (candidate_id),
      FOREIGN KEY (role_id) REFERENCES job_roles (role_id)
    )
  `);

  // AI Analysis table
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_analysis (
      analysis_id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      ai_score REAL NOT NULL,
      skills_matched TEXT,
      skill_gaps TEXT,
      experience_years INTEGER,
      experience_level TEXT CHECK(experience_level IN ('entry', 'mid', 'senior', 'lead')),
      education TEXT,
      certifications TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications (application_id)
    )
  `);

  // Tests table
  db.run(`
    CREATE TABLE IF NOT EXISTS tests (
      test_id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      test_score REAL,
      test_token TEXT UNIQUE,
      test_completed_at DATETIME,
      answers TEXT,
      verified_skills TEXT,
      unverified_skills TEXT,
      untested_skills TEXT,
      verification_details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications (application_id)
    )
  `);

  // Decisions table
  db.run(`
    CREATE TABLE IF NOT EXISTS decisions (
      decision_id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      composite_score REAL,
      resume_weight INTEGER,
      test_weight INTEGER,
      final_decision TEXT,
      decision_notes TEXT,
      decided_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      decided_by INTEGER NOT NULL,
      FOREIGN KEY (application_id) REFERENCES applications (application_id),
      FOREIGN KEY (decided_by) REFERENCES users (id)
    )
  `);

  // Seed database with sample data
  setTimeout(() => {
    // Check if we need to seed data (only if no job roles exist)
    db.get('SELECT COUNT(*) as count FROM job_roles', (err, row) => {
      if (!err && row.count === 0) {
        console.log('Seeding database with sample data...');
        seedSampleData();
      }
    });
  }, 1000);
});

const seedSampleData = async () => {
  const bcrypt = require('bcryptjs');
  
  // Create default recruiter account
  const hashedPassword = await bcrypt.hash('password123', 10);

  db.run(
    'INSERT OR IGNORE INTO users (id, email, password, role, name) VALUES (?, ?, ?, ?, ?)',
    [1, 'recruiter@example.com', hashedPassword, 'recruiter', 'Demo Recruiter'],
    (err) => {
      if (!err) console.log('Created default recruiter account: recruiter@example.com / password123');
    }
  );

  console.log('✅ Database initialized with default recruiter account');
  console.log('📝 To add data, run: python backend/scripts/generate_candidates.py');
};

module.exports = db;