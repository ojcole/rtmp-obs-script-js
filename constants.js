exports.CHANGE_SOURCE_VOLUME = (source, volume) => [
  "SetVolume",
  { source, volume }
];
exports.CHANGE_SCENE = name => [
  "SetCurrentScene",
  {
    "scene-name": name
  }
];
exports.CHANGE_SCENE_ITEM_VISIBILITY = (scene, item, visible) => [
  "SetSceneItemProperties",
  {
    "scene-name": scene,
    item,
    visible
  }
];
exports.TRANSITION = () => ["TransitionToProgram", {}];
exports.LOW_BITRATE = "LOW_BITRATE";
exports.NORMAL_BITRATE = "NORMAL_BITRATE";
exports.HIGH_BITRATE = "HIGH_BITRATE";
