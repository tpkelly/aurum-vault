const Discord = require('discord.js');
const auth = require('./auth.json');
const data = require('./data.js');
const command = require('./command.js');

const client = new Discord.Client();

const SendToVault = /Send this character \(#(\d+)\) to the Aurum Vault\?/
const AurumPrefix = 'aurum,'

client.on('ready', () => {
  data.setup();
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
    msg.channel.send(`Send this character (#${characterId}) to the Aurum Vault?`)
  }
  else if (content.startsWith(AurumPrefix)) {
    var components = content.split(' ').slice(1);
    handleCommands(msg, components);
  }
});

function reactMyself(msg) {
  if (msg.content.match(SendToVault)) {
    handleSendToVault(msg)
  }
  
  msg.delete(60000);
}

function handleSendToVault(msg) {
  return msg.react('🥇')
  .then(() => msg.react('🥈'))
  .then(() => msg.react('🥉'))
  .then(() => msg.react('❌'))
  .then(() => msg.awaitReactions((reaction, user) => { return ['🥇','🥈','🥉','❌'].includes(reaction.emoji.name) && user.id !== msg.author.id }, { max: 1, time: 30000, errors: ['time'] })
    .then(collected => {
      const reaction = collected.first();

      var matches = msg.content.match(SendToVault);
      msg.delete()

      var row;
      if (reaction.emoji.name === '🥇') {
        row = { lodestone: matches[1], severity: 'major'}
      } else if (reaction.emoji.name === '🥈') {
        row = { lodestone: matches[1], severity: 'moderate'}
      } else if (reaction.emoji.name === '🥉') {
        row = { lodestone: matches[1], severity: 'minor'}
      } else {
        msg.channel.send('Aborted')
        return;
      }
      
      msg.channel.send(`Alright, #${row.lodestone} has been found guilty of ${row.severity} crimes.`)
      data.save(row);
    })
    .catch(e => console.error('Failed to consign to the vault: ' + e)))
  .catch(e => console.error('Failed to consign to the vault: ' + e));
}

function handleCommands(msg, commands) {
  if (commands[0] === 'list') {
    command.list(msg, commands.slice(1))
  } else if (commands[0] === 'help') {
    command.help(msg)
  }
}

client.login(auth.token);