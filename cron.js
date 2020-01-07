const data = require('./data.js');
const command = require('./command.js');
var botClient;

function setup(client) {
  botClient = client;
  run();
  sendAlerts();
}

function run() {
  console.log('Running scheduled run')
  scheduleRun();
  data.purge();
}

function sendAlerts() {
  console.log('Sending scheduled alerts')
  scheduleAlerts();
  command.sendAlerts(botClient);
}

function scheduleRun() {
  var now = new Date()
  setTimeout(run, 1000 * 60 * (60 - now.getMinutes()))
}

function scheduleAlerts() {
  var millisTo8am = (new Date().setHours(32, 0, 0, 0) - Date.now()) % (60 * 60 * 24 * 1000);
  // Run alerts at 8am daily
  setTimeout(sendAlerts, millisTo8am);
}

module.exports = {
  setup: setup,
}
