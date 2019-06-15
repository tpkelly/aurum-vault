const SQLite = require("better-sqlite3");
const sql = new SQLite('./vault.sqlite');
const ajax = require('./ajax.js');

var migrations = [
  "ALTER TABLE vault ADD COLUMN Reason TEXT;"
]

var sqlCommands = {
  vault: {},
  cache: {},
  version: {}
}

function setup() {
  sqlCommands.vault.exists = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'vault';")
  sqlCommands.cache.exists = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'lodestone_cache';")
  sqlCommands.version.exists = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'version';")

  if (!sqlCommands.version.exists.get()['count(*)']) {
    sql.prepare("CREATE TABLE version(version INTEGER)").run();
    sql.prepare("INSERT INTO version (version) VALUES (0)").run();
  }
  if (!sqlCommands.vault.exists.get()['count(*)']) {
    sql.prepare("CREATE TABLE vault(id TEXT PRIMARY KEY, lodestone_id INTEGER, severity INTEGER, created DATETIME, releaseDate DATETIME)").run();
  }
  if (!sqlCommands.cache.exists.get()['count(*)']) {
    sql.prepare("CREATE TABLE lodestone_cache (lodestone_id INTEGER PRIMARY KEY, name TEXT, server TEXT, freecompany TEXT, expiry DATETIME)").run();
  }
  
  // Apply migrations
  var current = sql.prepare("SELECT version FROM version").get().version;
  for (var i = current.version; i < migrations.length; i++) {
    sql.prepare(migrations[i]).run();
    sql.prepare(`UPDATE version SET version = ${i+1}`);
  }
  
  sqlCommands.vault.get = sql.prepare("SELECT lodestone_id, severity, releaseDate FROM vault ORDER BY created DESC;");
  sqlCommands.vault.getSeverity = sql.prepare("SELECT lodestone_id, severity, releaseDate FROM vault WHERE severity = ?;");
  sqlCommands.vault.add = sql.prepare("INSERT OR REPLACE INTO vault (lodestone_id, severity, reason, created, releaseDate) VALUES (@lodestone, @severity, @reason, date('now'), date('now', @releaseDays));");
  sqlCommands.vault.purge = sql.prepare("DELETE FROM vault WHERE releaseDate < date('now');");

  sqlCommands.cache.all = sql.prepare("SELECT name, server, freecompany FROM lodestone_cache");
  sqlCommands.cache.get = sql.prepare("SELECT name, server, freecompany FROM lodestone_cache WHERE lodestone_id = ?;");
  sqlCommands.cache.add = sql.prepare("INSERT INTO lodestone_cache (lodestone_id, name, server, freecompany, expiry) VALUES (@lodestone, @name, @server, @freecompany, date('now', '+1 day'));");
  sqlCommands.cache.clear = sql.prepare("DELETE FROM lodestone_cache;");
  sqlCommands.cache.purge = sql.prepare("DELETE FROM lodestone_cache WHERE expiry < date('now');");
}

function save(data) {
  if (data.severity == 'major') {
    data.releaseDays = '+36500 days'
  } else if (data.severity == 'moderate') {
    data.releaseDays = '+365 days'
  } else if (data.severity == 'minor') {
    data.releaseDays = '+180 days'
  } else {
    data.releaseDays = '+14 days';
  }
  
  sqlCommands.vault.add.run(data)
}

function clear() {
  console.log('Cache cleared')
  sqlCommands.cache.clear.run()
}

function purge() {
  sqlCommands.cache.purge.run()
  sqlCommands.vault.purge.run()
}

function get(callback) {
  var allProfiles = sqlCommands.vault.get.all();
  innerGet(allProfiles, callback);
}

function getSeverity(severity, callback) {
  var profiles = sqlCommands.vault.getSeverity.all(severity);
  innerGet(profiles, callback)
}

function innerGet(profiles, callback) {
    profiles.forEach(function(profile) {
    getNameFromLodestone(profile.lodestone_id, function(data) {
      var data = {
        lodestone: profile.lodestone_id,
        severity: profile.severity,
        name: data.name,
        server: data.server,
        freecompany: data.freecompany,
        release: profile.releaseDate
      }
      callback(data);
    });
  });
}

function getNameFromLodestone(key, callback) {
  var results = sqlCommands.cache.get.all(key);
  if (!results.length) {
    ajax.nameFromLodestone(key, function(data) {
      results = {
        lodestone: key,
        name: data.Character.Name,
        server: data.Character.Server,
      };
      
      if (data.FreeCompany) {
        results.freecompany = data.FreeCompany.Name
      }

      sqlCommands.cache.add.run(results);
      callback(results);
    });
  }
  else {
    console.log(`pulled ${key} from cache`);
    callback(results[0]);
  }
}

module.exports = {
  setup: setup,
  save: save,
  get: get,
  getSeverity: getSeverity,
  getId: getNameFromLodestone,
  purge: purge,
  clear: clear
}

Date.prototype.addDays = function(days) {
    this.setDate(this.getDate() + parseInt(days));
    return this;
};