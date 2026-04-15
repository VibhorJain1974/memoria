// Type stub for face-api.js loaded from CDN
interface FaceApiStub {
  nets: {
    ssdMobilenetv1:   { loadFromUri: (url: string) => Promise<void> }
    faceLandmark68Net:{ loadFromUri: (url: string) => Promise<void> }
    faceRecognitionNet:{ loadFromUri: (url: string) => Promise<void> }
  }
  SsdMobilenetv1Options: new (opts: { minConfidence: number }) => unknown
  detectAllFaces: (img: HTMLImageElement, opts: unknown) => {
    withFaceLandmarks: () => {
      withFaceDescriptors: () => Promise<{ descriptor: Float32Array }[]>
    }
  }
}

declare global {
  interface Window {
    faceapi: FaceApiStub
  }
}

export {}
