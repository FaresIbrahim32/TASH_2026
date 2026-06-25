import { cookies } from "next/headers";
import { verifyToken } from "../../../lib/auth";

const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB
const MAX_FILES = 5;

export async function POST(request) {
  // --- Auth ---
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("tash_session");
  if (!sessionCookie?.value) {
    return Response.json({ message: "Not authenticated." }, { status: 401 });
  }
  const payload = verifyToken(sessionCookie.value);
  if (!payload?.userId) {
    return Response.json({ message: "Invalid or expired session." }, { status: 401 });
  }

  const inferenceUrl = process.env.MRI_INFERENCE_URL;
  if (!inferenceUrl) {
    return Response.json({ message: "MRI inference service is not configured." }, { status: 503 });
  }

  // --- Parse multipart form data ---
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ message: "Invalid multipart request." }, { status: 400 });
  }

  const files = formData.getAll("images");

  if (!files.length) {
    return Response.json({ message: "No images provided." }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return Response.json({ message: `Maximum ${MAX_FILES} images allowed.` }, { status: 400 });
  }

  // --- Validate each file ---
  for (const file of files) {
    if (!ACCEPTED_TYPES.has(file.type)) {
      return Response.json(
        { message: `"${file.name}" has unsupported type "${file.type}". Use PNG, JPG, or WEBP.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return Response.json(
        { message: `"${file.name}" exceeds the 4 MB file size limit.` },
        { status: 400 }
      );
    }
  }

  // --- Call Lambda once per image, all in parallel ---
  const secret = process.env.MRI_INFERENCE_SECRET || "";

  const results = await Promise.all(
    files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const b64 = buffer.toString("base64");
      // Normalise image/jpg → image/jpeg (browser may report either)
      const mimeType = file.type === "image/jpg" ? "image/jpeg" : file.type;

      try {
        const res = await fetch(inferenceUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify({ filename: file.name, data: b64, mimeType }),
        });

        const data = await res.json();
        if (!res.ok) {
          return { filename: file.name, error: data.message || "Classification failed." };
        }
        return data;
      } catch {
        return { filename: file.name, error: "Failed to reach the inference service." };
      }
    })
  );

  return Response.json({ results }, { status: 200 });
}
