var jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;
const $ = require('jquery')(window)

const auth = require('./auth.json');

function nameFromLodestone(lodestoneId, successFunc) {
  $.get(`https://xivapi.com/character/${lodestoneId}?private_key=${auth.xivapi}&data=FC&columns=FreeCompany.Name,Character.Name,Character.ID,Character.Server`, successFunc);
}

module.exports = {
  nameFromLodestone: nameFromLodestone
}
