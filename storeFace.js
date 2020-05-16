const faceapi = require('face-api.js');
// SsdMobilenetv1Options
const minConfidence = 0.5;
const getFaceDetectorOptions = () => new faceapi.SsdMobilenetv1Options(
    {minConfidence});
const faceDetectionOptions = getFaceDetectorOptions();

const processImage = async (files, personName, faceapi, canvas) => {
  console.log('processing image');
  if ( !files ) {
    throw new Error('No image file');
  }
  
  const descriptors = [];
  for (let image of files) {
    const referenceImage = await canvas.loadImage(image.buffer);
    const fullFaceDescription = await faceapi.detectSingleFace(referenceImage,
        faceDetectionOptions).withFaceLandmarks().withFaceDescriptor();
    descriptors.push(fullFaceDescription.descriptor);
    
  }
  
  const labelledDescriptors = new faceapi.LabeledFaceDescriptors(
      personName,
      descriptors,
  );
  const faceMatcher = new faceapi.FaceMatcher(labelledDescriptors);
  
  return faceMatcher;
};

module.exports = {processImage};
