'use strict';
const AWS = require('aws-sdk');
const moment = require('moment-timezone');
const s3 = new AWS.S3({region: 'eu-central-1'});
const axios = require('axios');

const BUCKET = process.env.BUCKET;
const BLYNK = process.env.BLYNK;


async function writePin(pin,val) {
  try {
    const response = await axios.get('http://blynk-cloud.com/'+BLYNK+'/update/'+pin+'?value='+val);
    console.log(response);
  } catch (error) {
    console.error(error);
  }
}
function mapUser2Pin(dev){
    switch (dev) {
      case "Hellboy": return "V1";
      case "Nora": return "V3";
      case "Guest1": return "V5";
      case "Guest2": return "V7";
    }
}


module.exports.athome = async (event) => {
  console.log(event);
  let obj = {
    device : event.device,
    active : event.active,
    update: moment().tz("Europe/Berlin").format()
  };
  let filename = obj.device+'.json';
  let data = await s3.getObject({
    Bucket: BUCKET,
    Key: filename
  }).promise();
  let user = JSON.parse(data.Body.toString());
  if(user.active !== obj.active || user.hasOwnProperty('last') === false){
    obj.last = user.update;
  }else{
    obj.last = user.last;
  }


  let bufferObject = new Buffer.from(JSON.stringify(obj));
  let s3params = {
    Bucket: BUCKET,
    Body : bufferObject,
    Key : filename,
    CacheControl:'public, max-age=60',
    ContentType: "application/json"
  };

  const key = await s3.upload(s3params).promise();
  const blynk = await writePin(mapUser2Pin(obj.device),obj.last);
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: JSON.stringify(key),
      input: event,
    }),
  };
};
