import { z } from "zod";

export const EXPENSE_CATEGORIES = ["Sewa", "Listrik", "Gaji", "Operasional", "Internet", "Lainnya"] as const;

export const expenseSchema = z.object({
  category: z.string().min(1, "Kategori wajib").max(40).trim(),
  description: z.string().max(200).trim().optional().or(z.literal("")),
  amount: z.coerce.number().int().positive("Jumlah harus > 0"),
  date: z.string().min(1).optional().nullable(),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

export type ReportPeriod = "today" | "month" | "last-month" | "year";
