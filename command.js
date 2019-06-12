const data = require('./data.js');

function list(msg, options) {
  if (options.length == 0 || options[0] == 'all') {
    data.get(function(m) { msg.channel.send(`${m.name} (#${m.lodestone}) ${m.severity}`)});
  }
}

function help(msg) {
  msg.channel.send('I need help')
}

function clear() {
  data.clear();
}

module.exports = {
  list: list,
  help: help,
  clear : clear
}