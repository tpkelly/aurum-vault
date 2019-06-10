const Discord = require('discord.js');
const client = new Discord.Client();
const auth = require('./auth.json');

const SendToVault = 'Send this character to the Aurum Vault?'

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.author.id == 587698308261085207) {
    reactMyself(msg)
    return;
  }
  
  if (msg.content.includes('/lodestone/character/')) {
    msg.channel.send(SendToVault)
  }
});

function reactMyself(msg) {
  if (msg.content === SendToVault) {
    handleSendToVault(msg)
    .then(() => msg.delete(60000))
  }
}

function handleSendToVault(msg) {
  return msg.react('🥇')
  .then(() => msg.react('🥈'))
  .then(() => msg.react('🥉'))
  .then(() => msg.react('❌'))
  .then(() => msg.awaitReactions((reaction, user) => { return ['🥇','🥈','🥉','❌'].includes(reaction.emoji.name) && user.id !== msg.author.id }, { max: 1, time: 30000, errors: ['time'] })
    .then(collected => {
      const reaction = collected.first();

      if (reaction.emoji.name === '🥇') {
        msg.channel.send('Gold')
      } else if (reaction.emoji.name === '🥈') {
        msg.channel.send('Silver')
      } else if (reaction.emoji.name === '🥉') {
        msg.channel.send('Bronze')
      } else {
        msg.channel.send('Aborted')
      }
      msg.delete()
    }))
  .catch(e => console.error('Failed to consign to the vault: ' + e));
}

client.login(auth.token);