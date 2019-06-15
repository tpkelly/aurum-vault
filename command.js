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
  msg.channel.send('Greetings citizen, welcome to the Aurum Vault. \
  \nI am the guard stationed to oversee these criminals. \
  \nYou can talk to me with "Aurum, <command>". \
  \n\
  \n== Commands == \
  \n**help**\
  \nDisplay this help message. \
  \n\n**list** *[all|major|moderate|minor]* \
  \nList all criminals serving time in the Vault, with an optional filter on the severity of their crimes. \
  ')
}

function clear() {
  data.clear();
}

module.exports = {
  list: list,
  help: help,
  clear : clear
}