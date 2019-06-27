const data = require('./data.js');
const msgConst = require('./messageConst.js');

function list(msg, options) {
  var listCommand = function(err, m) { 
    if (err) {
      msg.author.createDM().then(c => c.send(err));
    }
    else {
      msg.author.createDM().then(c => c.send(`**${m.name}** (${m.severity}): ${m.reason}`))
    }
  };
  if (options.length == 0 || options[0] == 'all') {
    data.get(listCommand);
  } else {
    data.getSeverity(options[0], listCommand);
  }
}

function release(msg, options) {
  if (!hasAdmin(msg)) {
    msg.channel.send('That\'s far enough citizen. Only Admins and Moderators may request the release of criminals.')
    return;
  }
  
  if (options.length !== 2) {
    msg.channel.send('I\'m not sure what you mean. I was expecting to hear "Aurum, release [forename] [surname]".')
    return;
  }
  
  data.remove(options[0], options[1], function(err) {
    if (err) {
      msg.channel.send(`"${options[0]} ${options[1]}"? This vagrant is not one of ours`);
    }
    else {
      msg.channel.send(`Very well. ${options[0]} ${options[1]} has been released from custody. Pray I do not see them again`);
    }
  });  
}

function help(msg) {
  var response = 'Greetings citizen, welcome to the Aurum Vault. \
  \nI am the guard stationed to oversee these criminals. \
  \nYou can talk to me with "Aurum, <command>". \
  \n\
  \n=== Commands === \
  \n**help**\
  \nDisplay this help message. \
  \n\n**list** [all|major|moderate|minor] \
  \nList all criminals serving time in the Vault, with an optional filter on the severity of their crimes. \
  \n\n**report** <bug report> \
  \nReport a bug with the bot to the creator. \
  ';
  
  if (hasAdmin(msg)) {
    response += '\n\n=== Admin Commands === \
    \n**release** <character name> \
    \nSet this character free from the Vault. \
    ';
  }
  msg.author.createDM().then(c => c.send(response));
}

function clear() {
  data.clear();
}

function report(client, msg, report) {
  var alertUser = client.users.get(msgConst.alertUserId);
  alertUser.createDM().then(c => c.send(`Bug report (${msg.author.tag}): ${report}`));
}

function hasAdmin(msg) {
  if (msg.channel.type === 'dm') {
    return false;
  }
  
  var role = msg.member.highestRole
  return role.name === 'Admin' || role.name === 'Moderator'
}

module.exports = {
  list: list,
  help: help,
  clear : clear,
  release: release,
  report: report
}