'use strict';
const AWS = require('aws-sdk');
const moment = require('moment-timezone');
const s3 = new AWS.S3({region: 'eu-central-1'});


const BUCKET = process.env.BUCKET;


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
  if(user.active !== obj.active){
    obj.last = user.update;
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

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: JSON.stringify(key),
      input: event,
    }),
  };
};
