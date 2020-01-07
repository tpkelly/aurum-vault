const data = require('./data.js');
const msgConst = require('./messageConst.js');

function list(msg, options) {
  var listCommand = function(err, m) { 
    if (err) {
      msg.author.createDM().then(c => c.send(err));
    }
    else if (hasAdmin(msg)) {
      msg.author.createDM().then(c => c.send(`${m.id}: **${m.name}** (${m.severity}) [${m.server}] until ${formatDateOut(m.release)}: ${m.reason} - Reported by ${m.reporter}`))
    }
    else {
      msg.author.createDM().then(c => c.send(`**${m.name}** (${m.severity}) [${m.server}]: ${m.reason}`))
    }
  };
  
  var severityLevels = ['major', 'moderate', 'minor', 'review'];
  if (options.length == 0 || options[0] == 'all') {
    data.get(listCommand);
  } else if (severityLevels.indexOf(options[0]) !== -1) {
    data.getSeverity(options[0], listCommand);
  } else {
    data.getServer(options[0], listCommand);
  }
}

function update(msg, options) {
  if (!hasAdmin(msg)) {
    msg.channel.send('That\'s far enough citizen. Only Admins and Moderators may change the books on these criminals.')
    return;
  }
  
  if (options.length < 3 || options.length > 4) {
    msg.channel.send('I\'m not sure what you mean. I was expecting to hear "Aurum, update [forename] [surname] [dd-mm-yyyy]".')
    return;
  }

  // Which crime, if multiple
  data.getName(options.slice(0, 2), function(err, results) {
    if (err) {
      msg.channel.send(`"${options[0]} ${options[1]}"? This vagrant is not one of ours`);
      return;
    }
    
    var crimeId;
    if (results.length == 1) {
      crimeId = 0
    } else if (options.length === 3) {
      msg.channel.send(`${options[0]} ${options[1]} has multiple charges against them.\n Please supply the Crime ID as "Aurum, update [forename] [surname] [dd-mm-yyyy] [crimeId]"`);
      return;
    } else {
      crimeId = options[3] - 1;
    }
    
    data.update(results[crimeId].id, formatDateIn(options[2]), function() {
      msg.channel.send(`Very well. The retrial of ${options[0]} ${options[1]} is over.`);
    });
  });
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
  
  data.remove(options, function(err) {
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
  \n\n**list** [all|major|moderate|minor|<server>] \
  \nList all criminals serving time in the Vault, with an optional filter on the severity of their crimes. \
  \n\n**report** <bug report> \
  \nReport a bug with the bot to the creator. \
  ';
  
  if (hasAdmin(msg)) {
    response += '\n\n=== Admin Commands === \
    \n**release** <character name> \
    \nSet this character free from the Vault. \
    \n\n**update** <character name> <dd-mm-yyyy> \
    \nModify the date of release for this character. \
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

function formatDateOut(dateStr) {
  var results = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/)
  return `${results[3]}-${results[2]}-${results[1]}`;
}

function formatDateIn(dateStr) {
  var results = dateStr.match(/(\d{2})-(\d{2})-(\d{4})/)
  return `${results[3]}-${results[2]}-${results[1]}`;
}


module.exports = {
  list: list,
  help: help,
  clear : clear,
  release: release,
  update: update,
  report: report
}