const data = require('./data.js');

function list(msg, options) {
  var listCommand = function(m) { msg.channel.send(`${m.name} (#${m.lodestone}) ${m.severity}`)};
  if (options.length == 0 || options[0] == 'all') {
    data.get(listCommand);
  } else {
    data.getSeverity(options[0], listCommand);
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