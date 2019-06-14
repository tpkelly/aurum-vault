const Discord = require('discord.js');
const auth = require('./auth.json');
const data = require('./data.js');
const command = require('./command.js');
const cron = require('./cron.js');

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
  
  return msg.react('🥇')
  .then(() => msg.react('🥈'))
  .then(() => msg.react('🥉'))
  .then(() => msg.react('❌'))
  .then(() => msg.awaitReactions((reaction, user) => { return ['🥇','🥈','🥉','❌'].includes(reaction.emoji.name) && user.id !== msg.author.id }, { max: 1, time: 30000, errors: ['time'] })
    .then(collected => {
      const reaction = collected.first();

      var row;
      if (reaction.emoji.name === '🥇') {
        row = { lodestone: matches[2], severity: 'major'}
      } else if (reaction.emoji.name === '🥈') {
        row = { lodestone: matches[2], severity: 'moderate'}
      } else if (reaction.emoji.name === '🥉') {
        row = { lodestone: matches[2], severity: 'minor'}
      } else {
        msg.channel.send(`Alright ${matches[1]}, you're free to go.`)
        return;
      }
      
      msg.channel.send(`Alright, ${matches[1]} has been found guilty of ${row.severity} crimes.`)
      msg.delete()
      data.save(row);
    })
    .catch(e => {
      // No responses within the time limit
      msg.delete();
      msg.channel.send(`Alright ${matches[1]}, you're free to go. ${e}`);
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