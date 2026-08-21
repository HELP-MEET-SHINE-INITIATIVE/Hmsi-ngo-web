import sharp from 'sharp';

const MAX_OUTPUT_DIMENSION = 1600;

export async function optimizeUploadedImage(image: File) {
  const input = Buffer.from(await image.arrayBuffer());
  const output = await sharp(input, { failOn: 'none' })
    .rotate()
    .resize({
      width: MAX_OUTPUT_DIMENSION,
      height: MAX_OUTPUT_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  return {
    buffer: output,
    contentType: 'image/webp',
    extension: 'webp',
    originalBytes: image.size,
    optimizedBytes: output.byteLength,
  };
}
