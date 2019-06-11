const SQLite = require("better-sqlite3");
const sql = new SQLite('./vault.sqlite');

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

function get() {
    return sqlCommands.getAll.all().map(function(m) { return { lodestone: m.lodestone_id, severity: m.severity, name: nameFromLodestone(m.lodestone_id) }; });
}

function nameFromLodestone(lodestoneId) {
  /* TODO
  $.ajax({
    url: ,
    success: r => $(r).filter('title').text(),
    error: r => "Unknown Player"
  });
  */

  return "Unknown Player"
}

module.exports = {
  setup: setup,
  save: save,
  get: get
}