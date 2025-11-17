import { hash } from "bcryptjs";

import { createCompany } from "@/lib/repos/companies";
import { createEmployee } from "@/lib/repos/employees";
import {
  createUser,
  getUserByEmail,
  updateUser,
} from "@/lib/repos/users";

const DEFAULT_PASSWORD = "CambioSeguro123!";

const companiesToCreate = [
  {
    name: "Constructora Andes",
    rut: "76.123.456-7",
    adminEmail: "admin.andes@demo.com",
  },
  {
    name: "Servicios Pacifico",
    rut: "76.987.654-3",
    adminEmail: "admin.pacifico@demo.com",
  },
];

async function seed() {
  console.info("🌱 Ejecutando seed contra Supabase...");

  const passwordHash = await hash(DEFAULT_PASSWORD, 10);

  const existingSuper = await getUserByEmail("superadmin@demo.com");
  if (!existingSuper) {
    await createUser({
      email: "superadmin@demo.com",
      passwordHash,
      role: "superadmin",
    });
  }

  for (const companyDef of companiesToCreate) {
    const company =
      (await createCompany({
        name: companyDef.name,
        rut: companyDef.rut,
        emailContacto: `${companyDef.name
          .toLowerCase()
          .replace(/\s/g, "")}@demo.com`,
        telefonoContacto: "+56 2 2999 9999",
      })) ?? null;

    if (!company) continue;

    let adminUser =
      (await getUserByEmail(companyDef.adminEmail)) ??
      (await createUser({
        email: companyDef.adminEmail,
        passwordHash,
        role: "company_admin",
        companyId: company.id,
      }));

    if (adminUser?.role !== "company_admin") {
      adminUser = await updateUser(adminUser!.id, {
        role: "company_admin",
        companyId: company.id,
      });
    }

    for (let i = 1; i <= 3; i += 1) {
      const workerEmail = `worker${i}.${company.name
        .split(" ")[0]
        .toLowerCase()}@demo.com`;

      const workerUser =
        (await getUserByEmail(workerEmail)) ??
        (await createUser({
          email: workerEmail,
          passwordHash,
          role: "worker",
          companyId: company.id,
        }));

      if (!workerUser) continue;

      await createEmployee({
        companyId: company.id,
        userId: workerUser.id,
        nombreCompleto: `Trabajador ${i} ${company.name}`,
        sueldoMensual: i % 2 === 0 ? 520000 : 480000,
      });
    }
  }

  console.info("✅ Seed finalizado. Password por defecto:", DEFAULT_PASSWORD);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
