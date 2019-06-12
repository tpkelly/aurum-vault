const SQLite = require("better-sqlite3");
const sql = new SQLite('./vault.sqlite');
const ajax = require('./ajax.js');

var sqlCommands = {
  vault: {},
  cache: {}
}

function setup() {
  sqlCommands.vault.exists = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'vault';")
  sqlCommands.cache.exists = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'lodestone_cache';")

  if (!sqlCommands.vault.exists.get()['count(*)']) {
    sql.prepare("CREATE TABLE vault(id TEXT PRIMARY KEY, lodestone_id INTEGER, severity INTEGER, created DATETIME)").run();
  }
  if (!sqlCommands.cache.exists.get()['count(*)']) {
    sql.prepare("CREATE TABLE lodestone_cache (lodestone_id INTEGER PRIMARY KEY, name TEXT, server TEXT, freecompany TEXT, expiry DATETIME)").run();
  }
  
  sqlCommands.vault.get = sql.prepare("SELECT lodestone_id, severity FROM vault ORDER BY created DESC;");
  sqlCommands.vault.add = sql.prepare("INSERT OR REPLACE INTO vault (lodestone_id, severity, created) VALUES (@lodestone, @severity, date('now'));");

  sqlCommands.cache.all = sql.prepare("SELECT name, server, freecompany FROM lodestone_cache");
  sqlCommands.cache.get = sql.prepare("SELECT name, server, freecompany FROM lodestone_cache WHERE lodestone_id = ?;");
  sqlCommands.cache.add = sql.prepare("INSERT INTO lodestone_cache (lodestone_id, name, server, freecompany, expiry) VALUES (?, ?, ?, ?, date('now', '+1 day'));");
  sqlCommands.cache.clear = sql.prepare("DELETE FROM lodestone_cache;");
}

function save(data) {
    sqlCommands.vault.add.run(data)
}

function clear() {
  console.log('Cache cleared')
  sqlCommands.cache.clear.run()
}

function get(callback) {
  var allProfiles = sqlCommands.vault.get.all();
  var allLodestoneIds = allProfiles.map(function(p) { return p.lodestone_id })

  allProfiles.forEach(function(profile) {
    getNameFromLodestone(profile.lodestone_id, function(data) {
      var data = {
        lodestone: profile.lodestone_id,
        severity: profile.severity,
        name: data.name,
        server: data.server,
        freecompany: data.freecompany
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
        name: data.Character.Name,
        server: data.Character.Server,
      };
      
      if (data.FreeCompany) {
        results.freecompany = data.FreeCompany.Name
      }

      sqlCommands.cache.add.run(key, results.name, results.server, results.freecompany);
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
  getId: getNameFromLodestone,
  clear: clear
}