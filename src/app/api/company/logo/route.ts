import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

import { assertRole, getSession, requireSession } from "@/lib/auth";
import { updateCompany } from "@/lib/repos/companies";

const ALLOWED_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

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

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });

  const filename = `company-${session.companyId}-${Date.now()}.${extension}`;
  const filePath = path.join(uploadDir, filename);

  await fs.writeFile(filePath, buffer);

  const relativePath = `/uploads/${filename}`;

  const company = await updateCompany(session.companyId!, {
    logoUrl: relativePath,
  });

  return NextResponse.json({ logoUrl: company?.logoUrl ?? relativePath });
}
