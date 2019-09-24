const fs = require('fs');
const { google } = require('googleapis');
const express = require('express');

const app = express();
var oAuth2Client;

app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {

  // Load client secret and client ID from a local file.
  fs.readFile('credentials.json', (err, content) => {
    if (err) {
      res.json({
        error: err
      })
    };
    // Authorize a client with credentials, then return the authorization URL.
    const url = getAuthorizationUrl(JSON.parse(content));
    res.json({
      message: "copy and paste this URL in a browser window",
      url: url
    })
  });
})

app.get('/redirect', (req, res) => {
  if (req.query.code) {
    oAuth2Client.getToken(req.query.code, (err, token) => {
      if (err) {
        res.json({
          error: err
        })
        return console.error('Error retrieving access token', err);
      }
      oAuth2Client.setCredentials(token);
      fileListPromise(oAuth2Client).then(function (files) {
        res.json({
          files: files
        });
        oAuth2Client.revokeCredentials();
      }).catch(function (err) {
        res.json({
          error: err
        })
      })
    });
  } else {
    res.json({
      authcode: 'no code received'
    })
  }
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`App listening on port ${port}`))

const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];

/**
 * Create an OAuth2 client with the given credentials
 * @param {Object} credentials The authorization client credentials.
 */
function getAuthorizationUrl(credentials) {
  const { client_secret, client_id, redirect_uris } = credentials.web;
  oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  return authUrl;
}

var fileListPromise = function (oAuth2Client) {
  return new Promise(function (resolve, reject) {

    var fileArr = [];
    const drive = google.drive({ version: 'v3', oAuth2Client });
    drive.files.list({
      pageSize: 10,
      fields: 'nextPageToken, files(id, name)',
    }, (err, res) => {
      if (err) {
        reject(Error("The API returned an error: " + err));
      };
      const files = res.data.files;
      if (files.length) {
        console.log('Files:' + typeof files);
        files.map((file) => {
          console.log(`(${file.id}) ${file.name}`);
          fileArr.push(file.name);
        });
        resolve(fileArr)
      } else {
        resolve("No files found.");
      }
    });
  });
}
