const SQLite = require("better-sqlite3");
const sql = new SQLite('./vault.sqlite');
const ajax = require('./ajax.js');

var migrations = [
  "ALTER TABLE vault ADD COLUMN reason TEXT;",
  "ALTER TABLE vault ADD COLUMN reporter TEXT;",
  "ALTER TABLE lodestone_cache ADD COLUMN freecompanytag TEXT;"
]

var sqlCommands = {
  vault: {},
  cache: {},
  version: {},
  alerts: {}
}

function setup() {
  sqlCommands.vault.exists = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'vault';")
  sqlCommands.cache.exists = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'lodestone_cache';")
  sqlCommands.version.exists = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'version';")
  sqlCommands.alerts.exists = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'alerts';")

  if (!sqlCommands.version.exists.get()['count(*)']) {
    sql.prepare("CREATE TABLE version(version INTEGER)").run();
    sql.prepare("INSERT INTO version (version) VALUES (0)").run();
  }
  if (!sqlCommands.vault.exists.get()['count(*)']) {
    sql.prepare("CREATE TABLE vault(id INTEGER PRIMARY KEY, lodestone_id INTEGER, severity INTEGER, created DATETIME, releaseDate DATETIME)").run();
  }
  if (!sqlCommands.cache.exists.get()['count(*)']) {
    sql.prepare("CREATE TABLE lodestone_cache (lodestone_id INTEGER PRIMARY KEY, name TEXT, server TEXT, freecompany TEXT, expiry DATETIME)").run();
  }
  if (!sqlCommands.alerts.exists.get()['count(*)']) {
    sql.prepare("CREATE TABLE alerts (lodestone_id INTEGER PRIMARY KEY, freecompanytag TEXT)").run();
  }
  
  // Apply migrations
  var current = sql.prepare("SELECT version FROM version").get();
  for (var i = current.version; i < migrations.length; i++) {
    console.log(`Migrating v${i}->v${i+1}`)
    sql.prepare(migrations[i]).run();
    sql.prepare(`UPDATE version SET version = ${i+1}`).run();
  }
  
  sqlCommands.vault.get = sql.prepare("SELECT lodestone_id, id, severity, reason, releaseDate, reporter FROM vault ORDER BY created DESC;");
  sqlCommands.vault.getSeverity = sql.prepare("SELECT lodestone_id, severity, reason, releaseDate, reporter FROM vault WHERE severity = ?;");
  sqlCommands.vault.getName = sql.prepare("select reason, severity, releaseDate, id FROM VAULT WHERE lodestone_id = ?");
  sqlCommands.vault.add = sql.prepare("INSERT INTO vault (lodestone_id, severity, reason, created, releaseDate, reporter) VALUES (@lodestone, @severity, @reason, date('now'), date('now', @releaseDays), @reporter);");
  sqlCommands.vault.update = sql.prepare("UPDATE vault SET releaseDate = @date WHERE id = @id")
  sqlCommands.vault.purge = sql.prepare("DELETE FROM vault WHERE releaseDate < date('now');");
  sqlCommands.vault.remove = sql.prepare("DELETE FROM vault WHERE lodestone_id = ?");

  sqlCommands.cache.all = sql.prepare("SELECT name, server, freecompany, freecompanytag FROM lodestone_cache");
  sqlCommands.cache.get = sql.prepare("SELECT name, server, freecompany, freecompanytag FROM lodestone_cache WHERE lodestone_id = ?;");
  sqlCommands.cache.getName = sql.prepare("SELECT lodestone_id FROM lodestone_cache WHERE name LIKE ? || '% ' || ? ||'%';");
  sqlCommands.cache.add = sql.prepare("INSERT INTO lodestone_cache (lodestone_id, name, server, freecompany, freecompanytag, expiry) VALUES (@lodestone, @name, @server, @freecompany, @freecompanytag, date('now', '+1 day'));");
  sqlCommands.cache.clear = sql.prepare("DELETE FROM lodestone_cache;");
  sqlCommands.cache.purge = sql.prepare("DELETE FROM lodestone_cache WHERE expiry < date('now');");
  
  sqlCommands.alerts.lastAlertForId = sql.prepare("SELECT freecompanytag FROM alerts WHERE lodestone_id = ?;");
  sqlCommands.alerts.setAlertForId = sql.prepare("REPLACE INTO alerts(lodestone_id, freecompanytag) VALUES(@lodestone, @freecompanytag);");
  sqlCommands.alerts.purge = sql.prepare("DELETE FROM alerts");
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

// Reset things back to zero
function clear() {
  console.log('Cache cleared')
  sqlCommands.cache.clear.run()
  sqlCommands.alerts.purge.run()
}

// Clean out old data
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

function getServer(server, callback) {
  var profiles = sqlCommands.vault.get.all();
  innerGet(profiles, callback, server)
}

function getName(nameComponents, callback) {
  getIdFromVault(nameComponents, function(err, id) {
    if (err) {
      callback(err);
      return;
    }
    
    var results = sqlCommands.vault.getName.all(id)
    if (!results.length) {
      callback('No results found');
    }
    else {
      callback(null, results);
    }
  });
}

function innerGet(profiles, callback, server) {
  var profilesFound = 0;
  profiles.forEach(function(profile) {
    getNameFromLodestone(profile.lodestone_id, function(data) {
      var result = {
        id: profile.id,
        lodestone: profile.lodestone_id,
        severity: profile.severity,
        name: data.name,
        server: data.server,
        freecompany: data.freecompany,
        freecompanytag: data.freecompanytag,
        release: profile.releaseDate,
        reason: profile.reason,
        reporter: profile.reporter
      }

      if (!server || data.server.toLowerCase() == server) {
        profilesFound++;
        callback(null, result);
      }
    });
  });
  
  if (profilesFound === 0) {
    callback('No entries in the Vault.')
    return;
  }

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
        results.freecompanytag = data.FreeCompany.Tag
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

function getIdFromVault(nameComponents, callback) {
  // TODO: Properly repopulate cache
  var results = sqlCommands.cache.getName.all(nameComponents[0], nameComponents[1]);
  if (!results.length) {
    callback('No results found');
    return;
  }
  
  callback(null, results[0].lodestone_id);
}

function remove(nameComponents, callback) {
  getIdFromVault(nameComponents, function(err, id) {
    if (err) {
      callback(err);
      return;
    }
    
    var removed = sqlCommands.vault.remove.run(id)
    if (!removed.changes) {
      callback('No results found');
    }
    else {
      callback();
    }
  });
}

function update(id, date, callback) {
  var updated = sqlCommands.vault.update.run({ date: date, id: id });
  if (!updated.changes) {
    callback('Nothing updated')
  } else {
    callback();
  }
}

function lastAlert(id, callback) {
  var results = sqlCommands.alerts.lastAlertForId.all(id);
  if (results.length == 0) {
    callback();
    return;
  }
  
  callback(results[0].freecompanytag);
}

function setAlert(id, tag) {
  sqlCommands.alerts.setAlertForId.run({ lodestone: id, freecompanytag: tag });
}

module.exports = {
  setup: setup,
  save: save,
  get: get,
  getSeverity: getSeverity,
  getServer: getServer,
  getName: getName,
  getId: getNameFromLodestone,
  purge: purge,
  clear: clear,
  remove: remove,
  update: update,
  lastAlert: lastAlert,
  setAlert: setAlert
}

Date.prototype.addDays = function(days) {
    this.setDate(this.getDate() + parseInt(days));
    return this;
};