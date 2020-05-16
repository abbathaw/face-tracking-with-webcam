let forwardTimes = [];
let withBoxes = false;
let faceMatcher = null;
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
  changeInputSize(416);
  const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
  const videoEl = $("#inputVideo").get(0);
  
  // initialize face matcher with 3 reference descriptor per person
  faceMatcher = await createFaceMatcherFromMultiplePhotos(2);
  
  videoEl.srcObject = stream;
});

async function onPlay() {
  const videoEl = $("#inputVideo").get(0);

  if (videoEl.paused || videoEl.ended || !isFaceDetectionModelLoaded()) {
    return setTimeout(() => onPlay());
  }

  // tiny_face_detector options
  let inputSize = 416;
  let scoreThreshold = 0.7;
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize,
    scoreThreshold
  });

  const canvas = $("#overlay").get(0);
  const ts = Date.now();
  const result = await faceapi
    .detectSingleFace(videoEl, options)
    .withFaceLandmarks()
    .withFaceDescriptor();
  updateTimeStats(Date.now() - ts);
  if (result) {
    drawLandmarks(videoEl, canvas, [result], withBoxes);
    updateFaceMatcherResults(result);
  } else {
    console.log("NO FACE");
  }
  $("#loader").hide();
  setTimeout(() => onPlay());
}

// FACE DETECTION

//Array of available persons with reference images
const classes = ["abdullah"];

function getFaceImageUri(className, idx) {
  return `${className}/${className}${idx}.jpeg`
}

async function createFaceMatcherFromMultiplePhotos(numImagesForTraining = 1) {
  const maxAvailableImagesPerClass = 2;
  numImagesForTraining = Math.min(numImagesForTraining, maxAvailableImagesPerClass);
  
    // tiny_face_detector options
  let inputSize = 224;
  let scoreThreshold = 0.5;
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize,
    scoreThreshold
  });
  
  const labeledFaceDescriptors = await Promise.all(classes.map(
      async className => {
        const descriptors = [];
        for (let i = 1; i < (numImagesForTraining + 1); i++) {
          const img = await faceapi.fetchImage(getFaceImageUri(className, i));
          const fullFaceDescription = await faceapi
          .detectSingleFace(img, options)
          .withFaceLandmarks()
          .withFaceDescriptor();
          descriptors.push(fullFaceDescription.descriptor)
        }
        
        return new faceapi.LabeledFaceDescriptors(
            className,
            descriptors
        )
      }
  ));
  const distanceThreshold = 0.45;
  return new faceapi.FaceMatcher(labeledFaceDescriptors, distanceThreshold);
}

function updateFaceMatcherResults(srcFromWebcam) {
  drawFaceRecognitionResults(srcFromWebcam)
}

function drawFaceRecognitionResults(srcFromWebcam) {
  const canvas = $('#overlay').get(0);
  const fullFaceDescriptions = [srcFromWebcam];
  const boxesWithText = fullFaceDescriptions.map(({ detection, descriptor }) => {
    const text = faceMatcher.findBestMatch(descriptor).toString();
    return new faceapi.BoxWithText(
        detection.box,
        text
    );
  });

  faceapi.drawDetection(canvas, boxesWithText);
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
