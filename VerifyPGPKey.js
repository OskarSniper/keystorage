let fs = require('fs');
let https = require('https');
let verify = require('keybase-verify');
let Sync = require('sync');

let verifyConfig = require('./config.json');

let signer = "oskarsniper";
let certs = [verifyConfig.cert, verifyConfig.publicKey];
let sources = ['https://raw.githubusercontent.com/OskarSniper/keystorage/master/' + verifyConfig.project, 'https://keybase.io/' + signer + '/key.asc'];
let etags = [];
let permitted = false;

console.log("[VerifyPGPKey.js] Init loading VerifyPGPKey.js");

let VerifyPGPKey = {
    Init: function() {
        Sync(function() {

            let i = 1;

            certs.forEach((c) => {
                if(getFileSizeFrom(c) < 1 || (verifyConfig[i] == etags[i - 1])) {
                    console.log("[VerifyPGPKey.js] " + c + " modified, updateing...");
                    updateFile.sync(null, c, sources[i - 1], i);
                } else {
                    console.log("[VerifyPGPKey.js] " + c + " not modified!");
                }
        
                i = i + 1;
            });

            console.log("[VerifyPGPKey.js] Verifing data...");

            let msg = fs.readFileSync(verifyConfig.cert);
            let key = fs.readFileSync(verifyConfig.publicKey);

            verify(key, msg).then(() => {
                permitted = true;
            }).catch((err) => {
                //console.log(err);
                permitted = false;
            });

            console.log("Data signed by " + signer + " ?" + permitted);
        });
    },
    IsPermitted: function() {
        return permitted;
    }
}

module.exports = VerifyPGPKey;

function getFileSizeFrom(file) {
    try {
        return fs.statSync(file).size;
      } catch(err) {
          return 0;
      }
};

var updateFile = function(file, source, i) {
    console.log('[VerifyPGPKey.js] Downloading ' + source);

    https.get(source, (res) => {
        etags.push(res.headers.etag.replace(/\"/g, ''));

        if(verifyConfig.i != res.headers.etag.replace(/\"/g, '')) {
            verifyConfig[i] = res.headers.etag.replace(/\"/g, '');
            fs.writeFileSync('config.json', JSON.stringify(verifyConfig));
        }

        let len = parseInt(res.headers['content-length'], 10);
        let downloaded = 0;
        let data = "";

        res.on('data', (chunk) => {
            data = chunk;
            downloaded += chunk.length;
            console.log("[VerifyPGPKey.js] Downloading " + (100.0 * downloaded / len).toFixed(2) + "% (" + downloaded + " bytes)\r");
        });

        res.on('end', () => {
            fs.writeFileSync(file, data);
        });
    });

    return true;
};
