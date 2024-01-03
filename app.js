const express = require("express");
const bodyParser = require('body-parser');
const axios = require("axios");
const cors = require('cors');
const app = express();
const port = 3000;
app.use(bodyParser.json());
app.use(cors());
let cookiesList = ["JSESSIONID","li_at"]
const messageSendUrl = "https://www.linkedin.com/voyager/api/voyagerMessagingDashMessengerMessages?action=createMessage"

const sendMessage = async (cookieString,csrfToken,messageText,receiverProfileId,senderProfileId,senderTrackingId,originToken) => {
  return new Promise(async (resolve, reject) => {
    try {
    const messageBody ={
            "message":{
                "body":{
                    "attributes":[],
                    "text":messageText
                    },
                    "originToken":`${originToken}`,
                    "renderContentUnions":[]
                    },
                    "mailboxUrn":`${senderProfileId}`,
                    "trackingId":`${senderTrackingId}`,
                    "dedupeByClientGeneratedToken":false,
                    "hostRecipientUrns":[receiverProfileId]
        }
      const jsonMessageBody = JSON.stringify(messageBody);
      const response = await axios.post(messageSendUrl,jsonMessageBody,{
          headers: {
            "Content-Length": Buffer.byteLength(jsonMessageBody, 'utf-8'),
            "Host": "www.linkedin.com",
            "Accept": "*/*",
            "Connection": "keep-alive",
            "Content-Type": "application/json",
            "Cookie":cookieString,
            "csrf-token":csrfToken,
            "x-restli-protocol-version": "2.0.0"
          },
          maxRedirects: 5,
        }
      );
      resolve(response.data);
    } catch (error) {
      console.error("Send Message Error:", error);
      resolve('');
    }
  });
};

app.post('/api/send-message', async(req, res) => {
  try {
    const { cookies } = req.body;
    const filterCookies = cookies.filter((value) => cookiesList.includes(value.name));
    const cookieString = filterCookies.map((val) => `${val.name}=${val.value}`).join(';');
    const csrfToken = cookieString.split(';').find(cookie => cookie.includes('=')).split('=')[1].trim().slice(1,25);
    // Message 
    const messageText = " ";
    // Sender Profile Id 
    const senderProfileId = await getAuthorProfileId(cookieString,csrfToken);
    if(!senderProfileId) return res.send({message:"Author id not exits"});
    // Sender Tracking Id 
    const senderTrackingId = "xxxxxxxxxxxxxxxx";
    // OriginToken
    const originToken = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
    // Connection List Profile
    const connectionListProfile = await getConnectionInfomation(cookieString,csrfToken)

    if(originToken.length){
      let i = 1;
      for(const receiverProfileId of connectionListProfile){
        try {
          await sendMessage(cookieString,csrfToken,messageText,receiverProfileId.fsd_profile,senderProfileId,senderTrackingId,originToken[0])
          console.log(`Message successfully sent to ${receiverProfileId.userName} (Index: ${i++})`);
        } catch (error) {
          console.error(`Error sending message to ${receiverProfileId.userName} (Index: ${i++}): ${error.message}`);
        }
      }
    }
    console.log(" ****** message send ***** ");
    return res.send({ message: "success"});
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).send({ message: "Error", error: error.message });
  }
});

const getAuthorProfileId = async (cookieString,csrfToken)=>{
  return new Promise(async(resolve,reject)=>{
    try {
      const url = 'https://www.linkedin.com/voyager/api/voyagerOnboardingDashMemberHandles?primary=true&q=criteria&type=EMAIL'
      const response = await axios.get(url,{
        headers: {
          "Host": "www.linkedin.com",
          "Accept": "*/*",
          "Connection": "keep-alive",
          "Content-Type": "application/json",
          "Cookie":cookieString,
          "csrf-token":csrfToken,
          "x-restli-protocol-version": "2.0.0"
        },
        maxRedirects: 5,
      })
      console.log("Sender Profilte ID : " + response.data.elements[0].profileUrn)
      resolve(response.data.elements[0].profileUrn)
    } catch (error) {
      console.log("Error to getting user Profile" + error);
      resolve('')
    }
  })
}

const getConnectionInfomation = async (cookieString, csrfToken) => {
  return new Promise(async (resolve, reject) => {
    try {
      const url = "https://www.linkedin.com/voyager/api/relationships/dash/connections?decorationId=com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16&count=100&q=search&sortType=RECENTLY_ADDED";
      const response = await axios.get(url, {
        headers: {
          "Host": "www.linkedin.com",
          "Accept": "*/*",
          "Connection": "keep-alive",
          "Content-Type": "application/json",
          "Cookie": cookieString,
          "csrf-token": csrfToken,
          "x-restli-protocol-version": "2.0.0"
        },
        maxRedirects: 5,
      });
        const result = response.data.elements.map((value) => {
        const firstName = value.connectedMemberResolutionResult?.firstName || "";
        const lastName = value.connectedMemberResolutionResult?.lastName || "";
        return {
          "userName": firstName + " " + lastName,
          "fsd_profile": value.connectedMember
        };
      });
      console.log("Connection list lenngth : " + result.length);
      resolve(result);
    } catch (error) {
      console.log("error : ", error);
      resolve([]);
    }
  });
};

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});



