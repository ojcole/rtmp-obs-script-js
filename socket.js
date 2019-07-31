/*

DEPENDENCIES:

obs-websocket-js
xml2js

*/

const args = process.argv.slice(2);

var configFile = "./config.json";

if (args.length) configFile = args[0];

console.info("LOADING RESOURCES");

// Loading libraries to be used

const {
  low_bitrate_actions,
  normal_bitrate_actions,
  high_bitrate_actions,
} = require("./config.js");
const {
  CHANGE_VOLUME,
  LOW_BITRATE,
  HIGH_BITRATE,
  NORMAL_BITRATE,
} = require("./constants.js");
const config = require(configFile);
const OBSWebSocket = require("obs-websocket-js");
const http = require("http");
const xml2js = require("xml2js");

console.info("SETTING UP");

// Creating functions and setting constants and variables

const local = !config.url.includes("http");
const url = config.url;

var request_loop = null;
var time = Date.now();
var state = null;
const stateToActions = {
  [LOW_BITRATE]: low_bitrate_actions,
  [NORMAL_BITRATE]: normal_bitrate_actions,
  [HIGH_BITRATE]: high_bitrate_actions,
};

const obs = new OBSWebSocket();

const makeRequest = () =>
  new Promise(resolve => {
    if (local) {
      const fs = require("fs");
      fs.readFile(url, function(err, data) {
        xml2js.parseString(data, (err, res) => {
          resolve(res);
        });
      });
    } else {
      http
        .get(url, resp => {
          let data = "";

          resp.on("data", chunk => {
            data += chunk;
          });

          resp.on("end", () => {
            xml2js.parseString(data, (err, res) => {
              resolve(res);
            });
          });
        })
        .on("error", err => {
          console.log("Error: " + err.message);
          resolve();
        });
    }
  });

const rtmpCheck = () =>
  new Promise(resolve => {
    makeRequest()
      .then(res => {
        console.info("LOADED RTMP");

        const bitrate = bitrateFromXml(res);

        if (bitrate === false) {
          console.info("BITRATE NOT FOUND");
          resolve(false);
        } else {
          console.info(`BITRATE FOUND ${bitrate}`);
          resolve(bitrate);
        }
      })
      .catch(err => {
        console.log("FAILED TO LOAD RTMP");
        resolve(false);
      });
  });

const bitrateFromXml = xml => {
  const path = ["server", "application", "live", "stream", "bw_in"];

  path.forEach(element => {
    if (xml && xml.length != null) xml = xml[0];

    if (xml != null) xml = xml[element];
  });

  return xml == null ? false : xml;
};

const fetchCheck = (success = () => {}, failure = () => {}) => {
  rtmpCheck()
    .then(res => {
      if (res === false) {
        failure();
      } else {
        success(res);
      }
    })
    .catch(err => {
      console.log(err);
    });
};

const methodRoute = () => fetchCheck(onlineLoop, offlineLoop);

const offlineLoop = () => {
  console.info(
    `STARTING OFFLINE LOOP. REFRESH RATE: ${config.background_mode}ms`
  );
  setTimeout(methodRoute, config.background_mode);
};

const onlineLoop = () => {
  obs
    .connect({ address: "localhost:4444" })
    .then(res => {
      console.info("CONNECTED");

      console.info(
        `STARTING REQUEST LOOP. REFRESH RATE: ${config.request_rate}ms`
      );

      request_loop = setInterval(() => {
        if (Date.now() - time > config.request_rate) {
          time = Date.now() + config.request_rate * 4;

          fetchCheck(bitrateLogic, () => {
            request_loop = clearInterval(request_loop);
            obs.disconnect();

            main();
          });
        }
      }, config.streaming_mode);
    })
    .catch(err => {
      console.info("COULD NOT LOCATE OBS WEBSOCKET");
      console.info("EXITING");
    });
};

const bitrateLogic = bitrate => {
  const newState = mapBitrateToState(bitrate);

  if (newState !== state) {
    console.info(`STATE CHANGE DETECTED ${newState}`);
    process_actions(stateToActions[newState]).then(() => {
      time = Date.now();
    });

    state = newState;
  }
};

const mapBitrateToState = bitrate => {
  if (bitrate <= config.low_bitrate_level) {
    return LOW_BITRATE;
  } else if (bitrate >= config.high_bitrate_level) {
    return HIGH_BITRATE;
  }
  return NORMAL_BITRATE;
};

async function process_actions(actions) {
  for (let i = 0; i < actions.length; i++) {
    console.info(actions[i]);
    await obs.send(actions[i][0], actions[i][1]);
  }

  return true;
}

const main = () => {
  methodRoute();
};

console.info("CHECKING RTMP IS RECEIVING DATA...");

main();
