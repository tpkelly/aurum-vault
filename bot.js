const Discord = require('discord.js');
const auth = require('./auth.json');
const data = require('./data.js');
const command = require('./command.js');
const cron = require('./cron.js');
const msgConst = require('./messageConst.js');

const client = new Discord.Client();

const SendToVault = /Send (.*) \(#(\d+)\) to the Aurum Vault\?/
const AurumPrefix = 'aurum,'

client.on('ready', () => {
  data.setup();
  cron.scheduleRun();
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.author.id == client.user.id) {
    reactMyself(msg)
    return;
  }
  
  var content = msg.content.toLowerCase();
  
  if (content.includes('/lodestone/character/')) {
    var match = content.match(/\/lodestone\/character\/(\d+)/)
    let characterId = match[1]
    data.getId(characterId, function(data) {
      msg.channel.send(`Send ${data.name} (#${characterId}) to the Aurum Vault?`)
    });
  }
  else if (content.startsWith(AurumPrefix)) {
    var components = content.split(' ').slice(1);
    handleCommands(msg, components);
  } else if (content === 'help') {
    command.help(msg)
  }
});

function reactMyself(msg) {
  if (msg.content.match(SendToVault)) {
    handleSendToVault(msg)
  } else {
    msg.delete(30000)
  }
}

function handleSendToVault(msg) {
  var matches = msg.content.match(SendToVault);
  var allReactions = [
    msgConst.gilReaction,
    msgConst.ingameHarassmentReaction,
    msgConst.extremeHarassmentReaction,
    msgConst.hostileTakeoverReaction,
    msgConst.otherReasonReaction,
    msgConst.cancelReaction
  ];
  
  return msg.react(msgConst.gilReaction)
  .then(() => msg.react(msgConst.ingameHarassmentReaction))
  .then(() => msg.react(msgConst.extremeHarassmentReaction))
  .then(() => msg.react(msgConst.hostileTakeoverReaction))
  .then(() => msg.react(msgConst.otherReasonReaction))
  .then(() => msg.react(msgConst.cancelReaction))
  .then(() => msg.awaitReactions((reaction, user) => { return allReactions.includes(reaction.emoji.name) && user.id !== msg.author.id }, { max: 1, time: 30000, errors: ['time'] })
    .then(collected => {
      const reaction = collected.first();

      var row;
      if (reaction.emoji.name === msgConst.gilReaction) {
        row = { severity: 'minor', reason: 'stealing from the FC bank' }
      } else if (reaction.emoji.name === msgConst.ingameHarassmentReaction) {
        row = { severity: 'minor', reason: 'in-game harassment' }
      } else if (reaction.emoji.name === msgConst.extremeHarassmentReaction) {
        row = { severity: 'major', reason: 'prolonged harassment in-game and out-game' }
      } else if (reaction.emoji.name === msgConst.hostileTakeoverReaction) {
        row = { severity: 'moderate', reason: 'hostile takeover of a guild' }
      } else if (reaction.emoji.name === msgConst.otherReasonReaction) {
        row = { severity: 'minor', reason: '' }
        var alertUser = client.users.get(msgConst.alertUserId);
        alertUser.createDM().then(c => c.send(`${matches[1]} needs to be reviewed and processed.`));
      } else {
        msg.channel.send(`Alright ${matches[1]}, you're free to go.`)
        return;
      }
      
      row.lodestone = matches[2];
      
      if (row.reason) {
        msg.channel.send(`Alright, ${matches[1]} has been found guilty of ${row.reason}.`);
      } else {
        msg.channel.send(`Alright, ${matches[1]} has been found guilty.`);
      }
      msg.delete()
      data.save(row);
    })
    .catch(e => {
      // No responses within the time limit
      msg.delete();
      msg.channel.send(`Alright ${matches[1]}, you're free to go.`);
    })
  .catch(e => console.error('Failed to consign to the vault: ' + e)));
}

function handleCommands(msg, commands) {
  if (commands[0] === 'list') {
    command.list(msg, commands.slice(1))
  } else if (commands[0] === 'help') {
    command.help(msg)
  }
  else if (commands[0] === 'cache') {
    command.clear();
  }
}

client.login(auth.discord);