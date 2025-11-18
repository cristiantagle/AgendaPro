import { NextResponse } from "next/server";

import { assertRole, getSession, requireSession } from "@/lib/auth";
import { updateCompany } from "@/lib/repos/companies";
import { supabaseAdmin } from "@/lib/supabase";

const ALLOWED_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

const BUCKET_NAME = "company-logos";

const ensureBucketExists = async () => {
  if (!supabaseAdmin) return;
  const { data: existingBuckets } = await supabaseAdmin.storage.listBuckets();
  const exists = existingBuckets?.some((bucket) => bucket.name === BUCKET_NAME);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 2 * 1024 * 1024,
    });
  }
};

export async function POST(request: Request) {
  const session = requireSession(await getSession());
  assertRole(session, ["company_admin"]);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "No se pudo procesar el formulario" },
      { status: 400 },
    );
  }

  const file = formData.get("logo");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Logo inválido" }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: "El logo no puede superar los 2MB." },
      { status: 400 },
    );
  }

  const extension =
    ALLOWED_TYPES.get(file.type) ??
    file.name.split(".").pop()?.toLowerCase();

  if (!extension) {
    return NextResponse.json(
      { error: "Formato no soportado. Usa PNG, JPG o WEBP." },
      { status: 400 },
    );
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase no está configurado para subir archivos." },
      { status: 500 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const filename = `company-${session.companyId}-${Date.now()}.${extension}`;
  const storagePath = `${session.companyId}/${filename}`;

  try {
    await ensureBucketExists();
    const uploadResult = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadResult.error) {
      throw uploadResult.error;
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          (error as Error).message ??
          "No se pudo subir el logo a Supabase Storage.",
      },
      { status: 500 },
    );
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  const logoUrl = publicUrlData?.publicUrl ?? null;

  const company = await updateCompany(session.companyId!, {
    logoUrl,
  });

  return NextResponse.json({ logoUrl: company?.logoUrl ?? logoUrl });
}
