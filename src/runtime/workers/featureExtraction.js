importScripts("./lib/tf.min.3.5.0.js");
importScripts("./lib/essentia.js-model.umd.js");
importScripts("./lib/essentia-wasm.module.js");
// using importScripts since it works on both Chrome and Firefox
// using modified version of ES6 essentia WASM, so that it can be loaded with importScripts
const EssentiaWASM = Module;
const extractor = new EssentiaModel.EssentiaTFInputExtractor(EssentiaWASM, "musicnn", false);

let modelStart = 0;

let model;
let modelURL = "/models/msd-musicnn-1/model.json";
let modelLoaded = false;
let modelReady = false;

function initModel() {
  model = new EssentiaModel.TensorflowMusiCNN(tf, modelURL);

  loadModel().then((isLoaded) => {
    if (isLoaded) {
      modelLoaded = true;
      // perform dry run to warm them up
      warmUp();
    }
  });
}

async function loadModel() {
  await model.initialize();
  return true;
}

function getZeroMatrix(x, y) {
  let matrix = new Array(x);
  for (let f = 0; f < x; f++) {
    matrix[f] = new Array(y).fill(0);
  }
  return matrix;
}

function warmUp() {
  const fakeFeatures = {
    melSpectrum: getZeroMatrix(187, 96),
    frameSize: 187,
    melBandsSize: 96,
    patchSize: 187,
  };

  const fakeStart = Date.now();

  model.predict(fakeFeatures, false, true).then(() => {
    modelReady = true;
  });
}

async function initTensorflowWASM() {
  if (tf.getBackend() != "wasm") {
    importScripts("./lib/tf-backend-wasm-3.5.0.js");
    // importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm/dist/tf-backend-wasm.js');
    tf.setBackend("wasm");
    tf.ready()
      .then(() => {
        initModel();
      })
      .catch(() => {
        return false;
      });
  }
}

function computeEmbeddings(audioData) {
  const features = extractor.computeFrameWise(audioData, 256);
  modelStart = Date.now();
  return model.predict(features, true, true);
}

onmessage = function listenToMainThread(msg) {
  if (msg.data.init) {
    initTensorflowWASM();
  }
  if (msg.data.audio) {
    const audio = new Float32Array(msg.data.audio);
    computeEmbeddings(audio).then((embeddings) => {
      postMessage({
        embeddings: embeddings,
      });
    });
  }
};
