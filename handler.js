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


module.exports.air = async (event) => {
  console.log(event);
  const now = moment().tz("Europe/Berlin").format();
  let obj = {
    temp : parseFloat(event.temp),
    hum : parseFloat(event.hum),
    hic : parseFloat(event.hic),
    gas : parseFloat(event.gas),
    room : event.room,
    update: now
  };
  let filename = obj.room+'.json';
  let data = await s3.getObject({
    Bucket: BUCKET,
    Key: filename
  }).promise();
  let temp = JSON.parse(data.Body.toString());
  if(parseFloat(temp.maxTemp) < obj.temp){
    obj.maxTemp = obj.temp;
    obj.maxTempTS = now;
  }else{
    obj.maxTemp = temp.maxTemp;
    obj.maxTempTS = temp.maxTempTS;
  }
  if(parseFloat(temp.minTemp)<obj.temp){
    obj.minTemp = temp.minTemp;
    obj.minTempTS = temp.minTempTS;
  }else{
    obj.minTemp = obj.temp;
    obj.minTempTS = now;
  }
  if(parseFloat(temp.maxHum) < obj.hum){
    obj.maxHum = obj.hum;
    obj.maxHumTS = now;
  }else{
    obj.maxHum = temp.maxHum;
    obj.maxHumTS = temp.maxHumTS;
  }
  if(parseFloat(temp.maxHic) < obj.hic){
    obj.maxHic = obj.hic;
    obj.maxHicTS = now;
  }else{
    obj.maxHic = temp.maxHic;
    obj.maxHicTS = temp.maxHicTS;
  }
  if(parseFloat(temp.maxGas) < obj.gas){
    obj.maxGas = obj.gas;
    obj.maxGasTS = now;
  }else{
    obj.maxGas = temp.maxGas;
    obj.maxGasTS = temp.maxGasTS;
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
 // const blynk = await writePin(mapUser2Pin(obj.device),obj.last);
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: JSON.stringify(key),
      input: event,
    }),
  };
};
