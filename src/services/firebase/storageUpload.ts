import { getDownloadURL, getStorage, ref, uploadBytesResumable } from "firebase/storage";
import { getFirebaseApp } from "@/services/firebase/config";

function storage() {
  const app = getFirebaseApp();
  if (!app) return null;
  return getStorage(app);
}

export async function uploadLocalFile(params: {
  localUri: string;
  storagePath: string;
  contentType: string;
  onProgress?: (fraction: number) => void;
}): Promise<string> {
  const s = storage();
  if (!s) throw new Error("Firebase is not configured");
  const response = await fetch(params.localUri);
  const blob = await response.blob();
  const r = ref(s, params.storagePath);
  const task = uploadBytesResumable(r, blob, { contentType: params.contentType });
  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        const total = snap.totalBytes || 1;
        params.onProgress?.(snap.bytesTransferred / total);
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      },
    );
  });
}
