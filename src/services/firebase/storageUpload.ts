const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export async function uploadLocalFile(params: {
  localUri: string;
  storagePath: string;
  contentType: string;
  onProgress?: (fraction: number) => void;
}): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) throw new Error("Cloudinary is not configured");

  const response = await fetch(params.localUri);
  const blob = await response.blob();

  const formData = new FormData();
  formData.append("file", blob);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("public_id", params.storagePath); // keeps the same path structure

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!uploadResponse.ok) throw new Error("Cloudinary upload failed");

  const data = await uploadResponse.json();
  return data.secure_url; // this is the download URL
}