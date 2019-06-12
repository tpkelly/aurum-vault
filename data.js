const SQLite = require("better-sqlite3");
const sql = new SQLite('./vault.sqlite');
const ajax = require('./ajax.js');

var sqlCommands = {}

function setup() {
  // Check if the table "vault" exists.
  const table = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'vault';").get();
  if (!table['count(*)']) {
    const create = sql.prepare("CREATE TABLE vault( \
                  id TEXT PRIMARY KEY, \
                  lodestone_id INTEGER, \
                  severity INTEGER, \
                  created DATETIME \
                );")
    create.run();
  }
  
    sqlCommands.add = sql.prepare("INSERT OR REPLACE INTO vault (lodestone_id, severity, created) \
                                   VALUES (@lodestone, @severity, date('now'));");
    sqlCommands.getAll = sql.prepare("SELECT lodestone_id, severity FROM vault ORDER BY created DESC;");
}

function save(data) {
    sqlCommands.add.run(data)
}

function get(callback) {
  var allProfiles = sqlCommands.getAll.all();
  var allLodestoneIds = allProfiles.map(function(p) { return p.lodestone_id })

  var parsedIds = [];
  allLodestoneIds.forEach(function(key) {
    if (parsedIds.includes(key)) return;
    parsedIds.push(key);
    ajax.nameFromLodestone(key, function(data) {
      var data = {
        lodestone: key,
        severity: allProfiles.filter(function(p) { return p.lodestone_id == key }).map(function(p) { return p.severity }).join(', '),
        name: data.Character.Name,
        server: data.Character.Server,
        freecompany: data.FreeCompany.Name
      }
      callback(data);
    });
  });
}

module.exports = {
  setup: setup,
  save: save,
  get: get
}