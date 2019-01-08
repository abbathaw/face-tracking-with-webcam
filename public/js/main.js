let forwardTimes = [];
let withBoxes = false;
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
    .withFaceLandmarks()
    .withFaceDescriptor();
  updateTimeStats(Date.now() - ts);
  if (result) {
    drawLandmarks(videoEl, $("#overlay").get(0), [result], withBoxes);
    const faceDetect = await detectFace();
    const matchResults = matchUser(faceDetect, result);

    //add label of match
    const fullFaceDescriptions = [result];
    const boxesWithText = matchResults.map((bestMatch, i) => {
      const box = fullFaceDescriptions[i].detection.box;
      const text = bestMatch.toString();
      const boxWithText = new faceapi.BoxWithText(box, text);
      return boxWithText;
    });

    faceapi.drawDetection($("#overlay").get(0), boxesWithText);
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

// FACE DETECTION

async function detectFace() {
  const labels = ["abdullah"];

  // tiny_face_detector options
  let inputSize = 224;
  let scoreThreshold = 0.5;
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize,
    scoreThreshold
  });

  const labeledFaceDescriptors = await Promise.all(
    labels.map(async label => {
      // fetch image data from urls and convert blob to HTMLImage element
      const imgUrl = `${label}.jpg`;
      const img = await faceapi.fetchImage(imgUrl);
      console.log("IM HERE1");
      // detect the face with the highest score in the image and compute it's landmarks and face descriptor
      const fullFaceDescription = await faceapi
        .detectSingleFace(img, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!fullFaceDescription) {
        throw new Error(`no faces detected for ${label}`);
      }

      const faceDescriptors = [fullFaceDescription.descriptor];
      console.log("IM HERE");
      return new faceapi.LabeledFaceDescriptors(label, faceDescriptors);
    })
  );
  return labeledFaceDescriptors;
}

function matchUser(labeledFaceDescriptors, result) {
  console.log("what is labeeld face", labeledFaceDescriptors);
  const maxDescriptorDistance = 0.6;
  const faceMatcher = new faceapi.FaceMatcher(
    labeledFaceDescriptors,
    maxDescriptorDistance
  );
  const fullFaceDescriptions = [result];
  const results = fullFaceDescriptions.map(fd =>
    faceMatcher.findBestMatch(fd.descriptor)
  );
  console.log("Its working");
  return results;
}
