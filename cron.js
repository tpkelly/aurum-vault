const data = require('./data.js');

function purge() {
  data.purge();
}

function run() {
  console.log('Running scheduled run')
  scheduleRun();
  purge();
}

function scheduleRun() {
  var now = new Date()
  setTimeout(run, 1000 * 60 * (60 - now.getMinutes()))
}

module.exports = {
  run: run,
  scheduleRun: scheduleRun
}
