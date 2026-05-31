import { z } from "zod";

export const serviceTicketSchema = z.object({
  customerId: z.string().min(1).optional().nullable(),
  customerName: z.string().min(1, "Nama pelanggan wajib").max(120).trim(),
  customerPhone: z.string().max(30).trim().optional().or(z.literal("")),
  deviceType: z.string().min(1, "Jenis perangkat wajib").max(60).trim(),
  deviceBrand: z.string().max(60).trim().optional().or(z.literal("")),
  deviceInfo: z.string().max(120).trim().optional().or(z.literal("")),
  complaint: z.string().min(1, "Keluhan wajib diisi").max(500).trim(),
  technicianId: z.string().min(1).optional().nullable(),
  laborCost: z.coerce.number().int().min(0).default(0),
  note: z.string().max(500).trim().optional().or(z.literal("")),
});
export type ServiceTicketInput = z.infer<typeof serviceTicketSchema>;

export const serviceLineSchema = z.object({
  name: z.string().min(1, "Nama wajib").max(120).trim(),
  price: z.coerce.number().int().min(0),
  qty: z.coerce.number().int().positive().default(1),
});
export type ServiceLineInput = z.infer<typeof serviceLineSchema>;

export const SERVICE_STATUSES = [
  "RECEIVED",
  "IN_PROGRESS",
  "WAITING_PARTS",
  "DONE",
  "DELIVERED",
  "CANCELLED",
] as const;
