const Discord = require('discord.js');
const auth = require('./auth.json');
const data = require('./data.js');
const command = require('./command.js');
const cron = require('./cron.js');
const msgConst = require('./messageConst.js');

const client = new Discord.Client();

const validServers = [
  '460498131792953355', // Lich Server Congress
  '589466032662642689', // Live Test Server
  '587696100908073010', // Bot Test Server
];

const SendToVault = /Send (.*) \(#(\d+)\) to the Aurum Vault\?/
const AurumPrefix = 'aurum,'

client.on('ready', () => {
  client.user.setActivity("Try 'aurum, help'");
  data.setup();
  cron.run();
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.author.id == client.user.id) {
    reactMyself(msg)
    return;
  }

  var content = msg.content.toLowerCase();
  
  if (content.includes('/lodestone/character/')) {
    if (!isAuthorised(msg)) { 
      return;
    }
    
    var match = content.match(/\/lodestone\/character\/(\d+)/)
    let characterId = match[1]
    data.getId(characterId, function(data) {
      msg.channel.send(`Send ${data.name} (#${characterId}) to the Aurum Vault?
  ${msgConst.gilReaction}: They stole from the company chest
  ${msgConst.rmtReaction}: They engaged in Real Money Trading (RMT)
  ${msgConst.ingameHarassmentReaction}: They repeatedly harassed people in-game
  ${msgConst.hostileTakeoverReaction}: They attempted to take over the guild or destroy the guildhall.
  ${msgConst.extremeHarassmentReaction}: They led a long period of harassment both in-game and out-of-game.
  ${msgConst.otherReasonReaction}: They offended in another way. This will be reviewed by an Admin or Moderator.
  ${msgConst.cancelReaction}: A mistake has been made, this is no criminal!`)
    });
  }
  else if (content.startsWith(AurumPrefix)) {
    if (!isAuthorised(msg)) { 
      return;
    }
    
    handleCommands(msg, content);
  } else if (content === 'help') {
    if (!isAuthorised(msg)) { 
      return;
    }
    
    command.help(msg)
  }
});

function reactMyself(msg) {
  if (msg.content.match(SendToVault)) {
    handleSendToVault(msg)
  } else if (msg.channel.type === 'text') {
    msg.delete(30000)
  }
}

function handleSendToVault(msg) {
  var matches = msg.content.match(SendToVault);
  var allReactions = [
    msgConst.gilReaction,
    msgConst.rmtReaction,
    msgConst.ingameHarassmentReaction,
    msgConst.extremeHarassmentReaction,
    msgConst.hostileTakeoverReaction,
    msgConst.otherReasonReaction,
    msgConst.cancelReaction
  ];
  
  msg.awaitReactions((reaction, user) => { return allReactions.includes(reaction.emoji.name) && user.id !== msg.author.id }, { max: 1, time: 30000, errors: ['time'] })
    .then(collected => {
      const reaction = collected.first();

      var row;
      msg.delete()

      if (reaction.emoji.name === msgConst.gilReaction) {
        row = { severity: 'minor', reason: 'stealing from the FC bank' }
      } else if (reaction.emoji.name === msgConst.rmtReaction) {
        row = { severity: 'moderate', reason: 'RMT activity' }
      } else if (reaction.emoji.name === msgConst.ingameHarassmentReaction) {
        row = { severity: 'minor', reason: 'in-game harassment' }
      } else if (reaction.emoji.name === msgConst.extremeHarassmentReaction) {
        row = { severity: 'major', reason: 'prolonged harassment in-game and out-game' }
      } else if (reaction.emoji.name === msgConst.hostileTakeoverReaction) {
        row = { severity: 'moderate', reason: 'hostile takeover of a guild' }
      } else if (reaction.emoji.name === msgConst.otherReasonReaction) {
        row = { severity: 'review', reason: '' }
        var alertUser = client.users.get(msgConst.alertUserId);
        alertUser.createDM().then(c => c.send(`${matches[1]} needs to be reviewed and processed.`));
      } else {
        msg.channel.send(`Alright ${matches[1]}, you're free to go.`)
        return;
      }
      
      row.lodestone = matches[2];
      row.reporter = reaction.users.find(r => !r.bot).tag;
      
      if (row.reason) {
        msg.channel.send(`Alright, ${matches[1]} has been found guilty of ${row.reason}.`);
      } else {
        msg.channel.send(`Alright, ${matches[1]} has been flagged for review by an Admin.`);
      }
      data.save(row);
    })
    .catch(e => {
      // No responses within the time limit
      msg.delete();
      msg.channel.send(`Alright ${matches[1]}, you're free to go.`);
    });
  
  msg.react(msgConst.gilReaction)
    .then(() => msg.react(msgConst.rmtReaction))
    .then(() => msg.react(msgConst.ingameHarassmentReaction))
    .then(() => msg.react(msgConst.extremeHarassmentReaction))
    .then(() => msg.react(msgConst.hostileTakeoverReaction))
    .then(() => msg.react(msgConst.otherReasonReaction))
    .then(() => msg.react(msgConst.cancelReaction))
    .catch(e => console.error('Failed to consign to the vault: ' + e));
}

function handleCommands(msg, content) {
  var commands = content.split(' ').slice(1);
  if (commands[0] === 'list') {
    command.list(msg, commands.slice(1))
  } else if (commands[0] === 'help') {
    command.help(msg)
  } else if (commands[0] === 'release') {
    command.release(msg, commands.slice(1));
  } else if (commands[0] === 'update') {
    command.update(msg, commands.slice(1));
  } else if (commands[0] === 'cache') {
    command.clear();
  } else if (commands[0] === 'report') {
    command.report(client, msg, content.replace('aurum, report', ''));
  }
}

function isAuthorised(msg) {
  if (msg.channel.type !== 'dm' && !validServers.includes(msg.channel.guild.id)) {
    // Only run for authorised channels
    msg.channel.send('This server is not authorised for Aurum Vault to run in. This instance has been reported.');
    var alertUser = client.users.get(msgConst.alertUserId);
    alertUser.createDM().then(c => c.send(`Unauthorised usage of Aurum Vault found in server: ${msg.channel.guild.name}`));
    return false;
  }
  
  return true;
}

client.login(auth.discord);