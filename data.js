const SQLite = require("better-sqlite3");
const sql = new SQLite('./vault.sqlite');

var sqlCommands = {}

function setup() {
  // Check if the table "vault" exists.
  const table = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'vault';").get();
  if (!table['count(*)']) {
    const create = sql.prepare("CREATE TABLE vault( \
                  id TEXT PRIMARY KEY, \
                  name TEXT, \
                  lodestone_id INTEGER, \
                  severity INTEGER, \
                  created DATETIME \
                );")
    create.run();
  }
  
    sqlCommands.add = sql.prepare("INSERT OR REPLACE INTO vault (name, lodestone_id, severity, created) \
                                   VALUES (@name, @lodestone, @severity, date('now'));");
    sqlCommands.getAll = sql.prepare("SELECT name, lodestone_id, severity FROM vault ORDER BY created DESC;");
}

function save(data) {
    sqlCommands.add.run(data)
}

function get() {
    return sqlCommands.getAll.all()
}

module.exports = {
  setup: setup,
  save: save,
  get: get
}