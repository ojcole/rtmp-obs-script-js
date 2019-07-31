/*

DEPENDENCIES:

obs-websocket-js
xml2js

*/

console.info("LOADING RESOURCES");

// Loading libraries to be used

const {
  low_bitrate_actions,
  normal_bitrate_actions,
  high_bitrate_actions
} = require("./config.js");
const {
  CHANGE_VOLUME,
  LOW_BITRATE,
  HIGH_BITRATE,
  NORMAL_BITRATE
} = require("./constants.js");
const config = require("./config.json");
const OBSWebSocket = require("obs-websocket-js");
const http = require("http");
const xml2js = require("xml2js");

console.info("SETTING UP");

// Creating functions and setting constants and variables

const url = "http://18.220.170.30/stat";

var request_loop = null;
var time = Date.now();
var state = NORMAL_BITRATE;
const stateToActions = {
  [LOW_BITRATE]: low_bitrate_actions,
  [NORMAL_BITRATE]: normal_bitrate_actions,
  [HIGH_BITRATE]: high_bitrate_actions
};

const obs = new OBSWebSocket();

const makeRequest = () =>
  new Promise(resolve => {
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
  });

const rtmpCheck = () =>
  new Promise(resolve => {
    makeRequest().then(res => {
      try {
        let result = res.server.application.live.stream.bw_in;
        resolve(result);
      } catch (e) {
        resolve(false);
      }
    });
  });

const fetchCheck = (success = () => {}, failure = () => {}) => {
  rtmpCheck().then(res => {
    if (res === false) {
      console.log("failed to load rtmp");
      failure();
    }
    success(res);
  });
};

const methodRoute = () => fetchCheck(onlineLoop, offlineLoop);

const offlineLoop = () => {
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
      console.log(err);
    });
};

const bitrateLogic = bitrate => {
  const newState = mapBitrateToState(bitrate);

  if (newState !== state) {
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
    await actions[i]();
  }

  return true;
}

const main = () => {
  methodRoute();
};

console.info("CHECKING RTMP IS RECEIVING DATA...");

main();
