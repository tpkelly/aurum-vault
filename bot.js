const Discord = require('discord.js');
const auth = require('./auth.json');
const data = require('./data.js');

const client = new Discord.Client();

const SendToVault = 'Send this character to the Aurum Vault?'
const GetFromVault = 'aurum, list all'

client.on('ready', () => {
  data.setup();
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.author.id == client.user.id) {
    reactMyself(msg)
    return;
  }
  
  if (msg.content.includes('/lodestone/character/')) {
    msg.channel.send(SendToVault)
  }
  else if (msg.content.toLowerCase() === GetFromVault) {
    data.get().forEach(m => msg.channel.send(m.name));
  }
});

function reactMyself(msg) {
  if (msg.content === SendToVault) {
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

      if (reaction.emoji.name === '🥇') {
        msg.channel.send('Gold')
        data.save({ name: 'Kazenone Alagar', lodestone: 123, severity: 'major'})
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