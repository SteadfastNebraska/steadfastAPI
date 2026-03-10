// email.js

const api_key = process.env.MAILGUN_APIKEY;
const domain = process.env.MAILGUN_DOMAIN;



const sendEmail = (to, from, subject, body) => {
  if(process.env.NODE_ENV!='production')
  {
    //redirecting the email because not production
    to = process.env.DEV_EMAIL_TO;
  }

  let htmlBody = `<html><body><p></p>${body}</body></html>`


  const requestOptions = {
    method: 'POST',
    headers: {"Authorization": `Basic ${Buffer.from(`api:${api_key}`).toString('base64')}`}
  };
  

  fetch(`https://api.mailgun.net/v3/${domain}/messages?to=${to}&from=${from}&subject=${subject}&html=${ encodeURIComponent( htmlBody)}`, requestOptions)
  .then(r => r.text())
  .then(res => console.log(res))
  .catch(error => console.log('error',  JSON.stringify(error)))


}

export {sendEmail}