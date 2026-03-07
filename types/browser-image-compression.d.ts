declare module 'browser-image-compression' {
  export interface ImageCompressionOptions {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
    initialQuality?: number;
    alwaysKeepResolution?: boolean;
    fileType?: string;
    maxIteration?: number;
    exifOrientation?: number;
    resizeThumbnail?: boolean;
    ignoreAlpha?: boolean;
  }

  export default function imageCompression(
    file: File | Blob,
    options?: ImageCompressionOptions
  ): Promise<File>;
}
