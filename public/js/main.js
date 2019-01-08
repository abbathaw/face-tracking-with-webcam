let forwardTimes = [];
let withBoxes = true;
const MODEL_URL = "/models";
async function loadModels() {
  await faceapi.loadTinyFaceDetectorModel(MODEL_URL);
  await faceapi.loadFaceLandmarkTinyModel(MODEL_URL);
  await faceapi.loadFaceRecognitionModel(MODEL_URL);
  await faceapi.loadFaceExpressionModel(MODEL_URL);
  await faceapi.loadFaceLandmarkModel(MODEL_URL);
}

loadModels().then(async () => {
  console.log("Loaded Models");
  changeInputSize(224);
  const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
  const videoEl = $("#inputVideo").get(0);
  videoEl.srcObject = stream;
});

async function onPlay() {
  const videoEl = $("#inputVideo").get(0);

  if (videoEl.paused || videoEl.ended || !isFaceDetectionModelLoaded()) {
    return setTimeout(() => onPlay());
  }

  // tiny_face_detector options
  let inputSize = 224;
  let scoreThreshold = 0.5;
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize,
    scoreThreshold
  });

  const ts = Date.now();
  const result = await faceapi
    .detectSingleFace(videoEl, options)
    .withFaceLandmarks();
  updateTimeStats(Date.now() - ts);
  if (result) {
    drawLandmarks(videoEl, $("#overlay").get(0), [result], withBoxes);
  } else {
    console.log("NO FACE");
  }
  $("#loader").hide();
  setTimeout(() => onPlay());
}

function updateTimeStats(timeInMs) {
  forwardTimes = [timeInMs].concat(forwardTimes).slice(0, 30);
  const avgTimeInMs =
    forwardTimes.reduce((total, t) => total + t) / forwardTimes.length;
  $("#time").val(`${Math.round(avgTimeInMs)} ms`);
  $("#fps").val(`${faceapi.round(1000 / avgTimeInMs)}`);
}

function isFaceDetectionModelLoaded() {
  return !!getCurrentFaceDetectionNet().params;
}

function getCurrentFaceDetectionNet() {
  return faceapi.nets.tinyFaceDetector;
}

function changeInputSize(size) {
  inputSize = parseInt(size);

  const inputSizeSelect = $("#inputSize");
  inputSizeSelect.val(inputSize);
  inputSizeSelect.material_select();
}
