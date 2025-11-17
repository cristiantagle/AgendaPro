import crypto from "crypto";

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || "empresa";

export const generateKioskSlug = (name: string) =>
  `${slugify(name)}-${crypto.randomBytes(3).toString("hex")}`;

export const generateKioskPin = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const generateDeviceToken = () => crypto.randomBytes(24).toString("hex");

export const kioskCookieName = (slug: string) => `kiosk_${slug}`;
