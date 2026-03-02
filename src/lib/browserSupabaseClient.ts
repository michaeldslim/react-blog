import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserSupabaseClient: SupabaseClient | null = null;

export function getBrowserSupabaseClient(): SupabaseClient {
  if (!browserSupabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error(
        "Supabase browser env vars NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY are missing.",
      );
    }

    browserSupabaseClient = createClient(url, anonKey);
  }

  return browserSupabaseClient;
}

const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.85;

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas toBlob failed"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = objectUrl;
  });
}

export async function uploadBlogImage(file: File): Promise<string> {
  const supabase = getBrowserSupabaseClient();

  const compressed = await compressImage(file);
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const path = `blog-images/${uniqueSuffix}.jpg`;

  const { error } = await supabase.storage.from("blog-images").upload(path, compressed, {
    contentType: "image/jpeg",
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(`Supabase Storage upload error: ${error.message}`);
  }

  const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
  return data.publicUrl;
}
