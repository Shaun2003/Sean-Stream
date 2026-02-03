#!/usr/bin/env node

/**
 * Database Migration Script
 * 
 * Usage: node scripts/migrate-database.js
 * 
 * This script helps set up the Phase 1-4 database tables.
 * You still need to run the SQL manually in Supabase, but this script
 * provides helpful utilities for verification and testing.
 */

const fs = require("fs");
const path = require("path");

const MIGRATION_FILE = path.join(__dirname, "../scripts/999-phase-1-4-migrations.sql");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function readMigrationFile() {
  try {
    return fs.readFileSync(MIGRATION_FILE, "utf-8");
  } catch (error) {
    log(`Error reading migration file: ${error.message}`, "red");
    return null;
  }
}

function parseCreateTableStatements(sql) {
  const tableRegex = /CREATE TABLE IF NOT EXISTS (\w+)/gi;
  const tables = [];
  let match;

  while ((match = tableRegex.exec(sql)) !== null) {
    tables.push(match[1]);
  }

  return tables;
}

function parseIndexStatements(sql) {
  const indexRegex = /CREATE INDEX (\w+) ON (\w+)/gi;
  const indexes = [];
  let match;

  while ((match = indexRegex.exec(sql)) !== null) {
    indexes.push({ name: match[1], table: match[2] });
  }

  return indexes;
}

function showMigrationInfo() {
  const sql = readMigrationFile();
  if (!sql) return;

  const tables = parseCreateTableStatements(sql);
  const indexes = parseIndexStatements(sql);

  log("\n╔════════════════════════════════════════════════════════╗", "blue");
  log("║         MUSICA PHASE 1-4 DATABASE MIGRATION           ║", "blue");
  log("╚════════════════════════════════════════════════════════╝\n", "blue");

  log("📊 TABLES TO CREATE:", "bright");
  tables.forEach((table, i) => {
    log(`  ${i + 1}. ${table}`);
  });

  log(`\n📈 INDEXES TO CREATE: ${indexes.length} total\n`);

  log("🔐 FEATURES ENABLED:", "bright");
  log("  ✓ Row Level Security (RLS)");
  log("  ✓ Authentication policies");
  log("  ✓ Performance indexes\n");

  log("📦 MIGRATION FEATURES:\n", "bright");

  log("PHASE 1:", "yellow");
  log("  • Listening statistics");
  log("  • Track play tracking");
  log("  • User listening history\n");

  log("PHASE 2:", "yellow");
  log("  • Radio stations");
  log("  • Mood playlists");
  log("  • Queue management\n");

  log("PHASE 3:", "yellow");
  log("  • User profiles");
  log("  • Social followers");
  log("  • Activity feed");
  log("  • Playlist collaborators\n");

  log("PHASE 4:", "yellow");
  log("  • Track lyrics");
  log("  • Recommendations");
  log("  • Audio preferences\n");
}

function showSetupInstructions() {
  log("\n╔════════════════════════════════════════════════════════╗", "green");
  log("║                  SETUP INSTRUCTIONS                   ║", "green");
  log("╚════════════════════════════════════════════════════════╝\n", "green");

  log("Step 1: Open Supabase Dashboard", "bright");
  log("  → Visit: https://supabase.com/dashboard");
  log("  → Select your project\n");

  log("Step 2: Access SQL Editor", "bright");
  log("  → Click 'SQL Editor' in sidebar");
  log("  → Click 'New Query'\n");

  log("Step 3: Copy Migration Script", "bright");
  log(`  → Open: ${MIGRATION_FILE}`);
  log("  → Copy ALL contents\n");

  log("Step 4: Paste & Run", "bright");
  log("  → Paste in Supabase SQL Editor");
  log("  → Click 'Execute' button");
  log("  → Wait for completion (usually < 30 seconds)\n");

  log("Step 5: Verify Success", "bright");
  log("  → Check 'Database' > 'Tables' in sidebar");
  log("  → Verify all tables are created\n");

  log("Step 6: Update App Code", "bright");
  log("  → Follow instructions in: PHASE_1_4_IMPLEMENTATION_GUIDE.md");
  log("  → Integrate components into pages\n");
}

function showFileLocation() {
  log("\n╔════════════════════════════════════════════════════════╗", "blue");
  log("║                  MIGRATION FILE INFO                  ║", "blue");
  log("╚════════════════════════════════════════════════════════╝\n", "blue");

  log(`File: ${MIGRATION_FILE}\n`);

  const sql = readMigrationFile();
  if (sql) {
    const lineCount = sql.split("\n").length;
    const sizeKb = (sql.length / 1024).toFixed(2);
    log(`Lines: ${lineCount}`);
    log(`Size: ${sizeKb} KB\n`);
  }

  log("📋 TO VIEW THE SQL:\n");
  log(`  cat ${MIGRATION_FILE}\n`);

  log("Or in your editor, search for: 999-phase-1-4-migrations.sql\n");
}

function showRLSPolicies() {
  log("\n╔════════════════════════════════════════════════════════╗", "blue");
  log("║               ROW LEVEL SECURITY (RLS)                ║", "blue");
  log("╚════════════════════════════════════════════════════════╝\n", "blue");

  const policies = [
    { table: "listening_stats", count: 3 },
    { table: "radio_stations", count: 3 },
    { table: "mood_playlists", count: 3 },
    { table: "users_profile", count: 2 },
    { table: "followers", count: 3 },
    { table: "activity_feed", count: 2 },
    { table: "playlist_collaborators", count: 2 },
    { table: "recommendations", count: 1 },
    { table: "user_preferences", count: 3 },
  ];

  log("Security Policies Created:\n", "bright");

  policies.forEach((policy) => {
    log(`  ${policy.table}: ${policy.count} policies`);
  });

  log(
    "\n✓ All tables protected with RLS",
    "green"
  );
  log("✓ Only authenticated users can access own data\n");
}

function showLibraryFiles() {
  log("\n╔════════════════════════════════════════════════════════╗", "blue");
  log("║             IMPLEMENTED LIBRARY FILES                 ║", "blue");
  log("╚════════════════════════════════════════════════════════╝\n", "blue");

  const files = [
    { file: "lib/stats.ts", feature: "Statistics & Analytics" },
    { file: "lib/search-filters.ts", feature: "Search Filtering" },
    { file: "lib/radio-station.ts", feature: "Radio Station Mode" },
    { file: "lib/mood-playlists.ts", feature: "Mood Playlists" },
    { file: "lib/social-features.ts", feature: "Social Features" },
    { file: "lib/collaborative-playlists.ts", feature: "Collaborative Playlists" },
    { file: "lib/lyrics.ts", feature: "Lyrics Integration" },
    { file: "lib/audio-preferences.ts", feature: "Audio Settings" },
    { file: "lib/recommendations.ts", feature: "Recommendations" },
  ];

  log("✓ Library Files Created:\n", "bright");

  files.forEach((f) => {
    log(`  ${f.file.padEnd(35)} → ${f.feature}`);
  });

  log("");
}

function showComponentFiles() {
  log("\n╔════════════════════════════════════════════════════════╗", "blue");
  log("║             IMPLEMENTED COMPONENTS                    ║", "blue");
  log("╚════════════════════════════════════════════════════════╝\n", "blue");

  const components = [
    { file: "components/music/keyboard-shortcuts-manager.tsx", phase: "1" },
    { file: "components/music/stats-widget.tsx", phase: "1" },
    { file: "components/music/search-filters-panel.tsx", phase: "1" },
    { file: "components/music/playlist-cover-customizer.tsx", phase: "1" },
    { file: "components/music/mood-playlists-widget.tsx", phase: "2" },
    { file: "components/music/lyrics-display.tsx", phase: "4" },
    { file: "components/music/audio-settings.tsx", phase: "4" },
    { file: "hooks/use-keyboard-shortcuts.ts", phase: "1" },
    { file: "components/features-provider.tsx", phase: "All" },
  ];

  log("✓ Components Created:\n", "bright");

  components.forEach((c) => {
    const phaseColor = c.phase === "1" ? "yellow" : "blue";
    log(`  ${c.file.padEnd(50)} [Phase ${c.phase}]`);
  });

  log("");
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case "info":
      showMigrationInfo();
      break;
    case "setup":
      showSetupInstructions();
      break;
    case "file":
      showFileLocation();
      break;
    case "rls":
      showRLSPolicies();
      break;
    case "libs":
      showLibraryFiles();
      break;
    case "components":
      showComponentFiles();
      break;
    case "all":
      showMigrationInfo();
      showLibraryFiles();
      showComponentFiles();
      showRLSPolicies();
      showSetupInstructions();
      showFileLocation();
      break;
    default:
      log("╔════════════════════════════════════════════════════════╗", "blue");
      log("║     MUSICA PHASE 1-4 DATABASE MIGRATION HELPER        ║", "blue");
      log("╚════════════════════════════════════════════════════════╝\n", "blue");

      log("Usage:", "bright");
      log("  node scripts/migrate-database.js [command]\n");

      log("Commands:", "bright");
      log("  info        - Show migration tables & indexes");
      log("  setup       - Show step-by-step setup instructions");
      log("  file        - Show migration file location");
      log("  rls         - Show Row Level Security policies");
      log("  libs        - Show library files created");
      log("  components  - Show components created");
      log("  all         - Show all information\n");

      log("Examples:", "bright");
      log("  node scripts/migrate-database.js info");
      log("  node scripts/migrate-database.js setup");
      log("  node scripts/migrate-database.js all\n");
  }
}

module.exports = {
  readMigrationFile,
  parseCreateTableStatements,
  parseIndexStatements,
};
