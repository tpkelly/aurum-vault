const data = require('./data.js');

function list(msg, options) {
  data.get().forEach(m => msg.channel.send(`${m.name} ${m.lodestone} ${m.severity}`));
}

function help(msg) {
  msg.channel.send('I need help')
}

module.exports = {
  list: list,
  help: help
}