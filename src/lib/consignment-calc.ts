/** Ringkasan titip jual — murni (tanpa I/O) agar mudah diuji & dipakai ulang. */

export type ConsignmentStatus = "AVAILABLE" | "SOLD" | "RETURNED";

export interface ConsignmentLine {
  askingPrice: number;
  status: ConsignmentStatus;
  soldPrice?: number | null;
}

export interface ConsignmentSummary {
  count: number;
  available: number;
  sold: number;
  returned: number;
  /** Total harga diinginkan untuk barang yang MASIH dititipkan. */
  availableValue: number;
  /** Total hasil jual (soldPrice, atau askingPrice bila tak diisi). */
  soldValue: number;
  /** Total harga diinginkan seluruh barang (nilai titipan awal). */
  askingTotal: number;
  /** Selesai = tak ada lagi barang yang dititipkan. */
  done: boolean;
}

export function summarizeConsignment(lines: ConsignmentLine[]): ConsignmentSummary {
  const s: ConsignmentSummary = {
    count: lines.length,
    available: 0,
    sold: 0,
    returned: 0,
    availableValue: 0,
    soldValue: 0,
    askingTotal: 0,
    done: false,
  };
  for (const l of lines) {
    s.askingTotal += l.askingPrice;
    if (l.status === "AVAILABLE") {
      s.available += 1;
      s.availableValue += l.askingPrice;
    } else if (l.status === "SOLD") {
      s.sold += 1;
      s.soldValue += l.soldPrice ?? l.askingPrice;
    } else {
      s.returned += 1;
    }
  }
  s.done = s.count > 0 && s.available === 0;
  return s;
}
