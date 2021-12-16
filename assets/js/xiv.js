var requirejs = require('requirejs');

const XIVAPI = require('@xivapi/js');

const xiv = new XIVAPI();

const getID = async () => {
    //find item
    let res = await xiv.search('Stuffed Khloe');
    console.log(res.Results[0].ID);
    //return item ID
    return res.Results[0].ID;
  }

  const getMembers = async () => {
    //find the FC with its name and server
    let res = await xiv.freecompany.search('Whispering Light', {server: 'Brynhildr'});
  
    //get the FC ID
    let id = res.Results[0].ID;
  
    //get and return fc members
    let fc = await xiv.freecompany.get('9228157111458920462', {data: FCM});
    console.log(fc);
    return fc.FreeCompanyMembers;
  }