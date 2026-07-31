import { supabase } from "@/integrations/supabase/client";

const BUCKET = "media";
// Private bucket + long-lived signed URL so public pages can render the image
// without exposing the bucket itself.
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 years

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image must be smaller than 5 MB.");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${crypto.randomUUID()}.${ext || "jpg"}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);

  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signError || !data?.signedUrl) throw new Error(signError?.message ?? "Could not create image URL.");

  return data.signedUrl;
}
