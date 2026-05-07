import { v2 as cloudinary } from "cloudinary";

// Configure the Cloudinary SDK from environment variables.
// CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be
// set in .env (or the deployment environment) before any upload is attempted.
// The module does not throw at import time if they are absent — the error will
// surface when uploadImage() is called.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image buffer to Cloudinary and return the secure delivery URL.
 *
 * @param buffer   - Raw image data as a Node.js Buffer.
 * @param filename - Original filename used as the public_id (without extension).
 * @returns        The `secure_url` of the uploaded asset.
 * @throws         An Error with a descriptive message if the upload fails.
 */
export async function uploadImage(
  buffer: Buffer,
  filename: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Strip the file extension from the filename to use as the public_id.
    const publicId = filename.replace(/\.[^/.]+$/, "");

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(
            new Error(
              `Cloudinary upload failed: ${error.message ?? String(error)}`
            )
          );
          return;
        }

        if (!result?.secure_url) {
          reject(
            new Error(
              "Cloudinary upload succeeded but returned no secure_url"
            )
          );
          return;
        }

        resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
}
