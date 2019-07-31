const {
  CHANGE_SCENE,
  CHANGE_SOURCE_VOLUME,
  CHANGE_SCENE_ITEM_VISIBILITY,
  TRANSITION,
} = require("./constants.js");

exports.low_bitrate_actions = [
  CHANGE_SOURCE_VOLUME("Desktop Audio", 0.5),
  CHANGE_SCENE("League"),
];
exports.normal_bitrate_actions = [
  CHANGE_SOURCE_VOLUME("Mic/Aux", 0.75),
  CHANGE_SCENE_ITEM_VISIBILITY("League", "Cam", true),
];
exports.high_bitrate_actions = [
  CHANGE_SCENE_ITEM_VISIBILITY("League", "Cam", false),
  TRANSITION(),
];
