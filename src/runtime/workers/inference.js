importScripts("./lib/tf.min.3.5.0.js");

let classifiers = {
  mood_happy: {
    isLoaded: false,
    tagOrder: [true, false],
    model: null,
  },
  mood_sad: {
    isLoaded: false,
    tagOrder: [false, true],
    model: null,
  },
  mood_relaxed: {
    isLoaded: false,
    tagOrder: [false, true],
    model: null,
  },
  mood_aggressive: {
    isLoaded: false,
    tagOrder: [true, false],
    model: null,
  },
  danceability: {
    isLoaded: false,
    tagOrder: [true, false],
    model: null,
  },
  emomusic: {
    isLoaded: false,
    tagOrder: ["valence", "arousal"],
    model: null,
  },
};

async function initModel(name) {
  classifiers[name].model = await tf.loadGraphModel(getModelURL(name));
  classifiers[name].isLoaded = true;
}

function getModelURL(modelName) {
  return `../models/${modelName}-msd-musicnn-1/tfjs/model.json`;
}

function arrayToTensorAsBatches(embeddingsArray, patchSize) {
  let inputTensor = tf.tensor2d(embeddingsArray, [embeddingsArray.length, patchSize]);
  return inputTensor;
}

async function initTensorflowWASM() {
  let defaultBackend;
  tf.ready().then(() => {
    defaultBackend = tf.getBackend();
    for (let n of Object.keys(classifiers)) {
      initModel(n);
    }
  });

  if (defaultBackend != "wasm") {
    return;
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

function twoValuesAverage(arrayOfArrays) {
  const length = arrayOfArrays.length;
  if (length === 0) return [0, 0];

  const [firstValuesSum, secondValuesSum] = arrayOfArrays.reduce(
    ([firstAcc, secondAcc], [firstVal, secondVal]) => [firstAcc + firstVal, secondAcc + secondVal],
    [0, 0]
  );

  return [firstValuesSum / length, secondValuesSum / length];
}

function outputPredictions(p) {
  postMessage({
    predictions: p,
  });
}

function modelsPredict(embeddings) {
  const inferenceStart = Date.now();
  let inputTensor = arrayToTensorAsBatches(embeddings, 200);
  const emomusicInputTensor = tf.tensor3d(
    embeddings.map((e) => [e]),
    [embeddings.length, 1, 200]
  );

  let predictions = {};

  for (let name of Object.keys(classifiers)) {
    if (classifiers[name].isLoaded) {
      let output;
      if (name == "emomusic") {
        output = classifiers[name].model.execute(emomusicInputTensor);
      } else {
        output = classifiers[name].model.execute(inputTensor);
      }
      let outputArray = output.arraySync();

      const summarizedPredictions = twoValuesAverage(outputArray);
      // format predictions, grab only positive one
      if (name == "emomusic") {
        predictions[name] = {
          [classifiers[name]["tagOrder"][0]]: summarizedPredictions[0],
          [classifiers[name]["tagOrder"][1]]: summarizedPredictions[1],
        };
      } else {
        const result = summarizedPredictions.filter((_, i) => classifiers[name].tagOrder[i])[0];
        predictions[name] = result;
      }
    }
  }
  outputPredictions(predictions);
  inputTensor.dispose();
}

initTensorflowWASM();

onmessage = function listenToMainThread(msg) {
  if (msg.data.embeddings) {
    modelsPredict(msg.data.embeddings);
  }
};
