/**
 * Encoder ESC/POS untuk printer thermal (58mm = 32 kolom, 80mm = 48 kolom).
 * Menghasilkan Uint8Array perintah yang dikirim ke printer via Bluetooth.
 * Catatan: teks dikodekan latin1/ASCII; karakter non-ASCII diganti aman.
 */

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

export interface EscposLogo {
  width: number;
  height: number;
  widthBytes: number;
  data: Uint8Array;
}

export interface EscposReceipt {
  storeName: string;
  logo?: EscposLogo;
  addressLines?: string[];
  phone?: string;
  number: string;
  dateText: string;
  cashierName?: string | null;
  customerName?: string | null;
  items: { name: string; qty: number; price: number; subtotal: number }[];
  subtotal: number;
  discount: number;
  total: number;
  methodLabel: string;
  paid: number;
  change: number;
  footer?: string;
}

const rupiah = (n: number) => "Rp" + new Intl.NumberFormat("id-ID").format(n);

/** Ganti karakter non-ASCII agar aman dicetak printer thermal. */
function ascii(s: string): string {
  return s
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/×/g, "x")
    // buang karakter di luar ASCII tercetak
    .replace(/[^\x20-\x7e]/g, "");
}

class Builder {
  private buf: number[] = [];
  readonly width: number;
  // Field eksplisit (bukan parameter-property) agar sintaks tetap "erasable"
  // — kompatibel dengan eksekusi TS native Node (mis. `node --test`).
  constructor(width: number) {
    this.width = width;
  }

  raw(...b: number[]) {
    this.buf.push(...b);
    return this;
  }
  text(s: string) {
    const a = ascii(s);
    for (let i = 0; i < a.length; i++) this.buf.push(a.charCodeAt(i) & 0xff);
    return this;
  }
  newline(n = 1) {
    for (let i = 0; i < n; i++) this.buf.push(LF);
    return this;
  }
  init() {
    return this.raw(ESC, 0x40);
  }
  align(a: "left" | "center" | "right") {
    return this.raw(ESC, 0x61, a === "center" ? 1 : a === "right" ? 2 : 0);
  }
  bold(on: boolean) {
    return this.raw(ESC, 0x45, on ? 1 : 0);
  }
  /** Ukuran ganda (lebar+tinggi) untuk penekanan, mis. TOTAL. */
  double(on: boolean) {
    return this.raw(GS, 0x21, on ? 0x11 : 0x00);
  }
  line(s = "-") {
    return this.text(s.repeat(this.width)).newline();
  }
  /** Baris dua kolom: kiri rata kiri, kanan rata kanan. */
  leftRight(left: string, right: string) {
    const l = ascii(left);
    const r = ascii(right);
    const space = Math.max(1, this.width - l.length - r.length);
    return this.text(l + " ".repeat(space) + r).newline();
  }
  /** Cetak raster bitmap (GS v 0). */
  image(logo: { width: number; height: number; widthBytes: number; data: Uint8Array }) {
    this.raw(
      GS,
      0x76,
      0x30,
      0,
      logo.widthBytes & 0xff,
      (logo.widthBytes >> 8) & 0xff,
      logo.height & 0xff,
      (logo.height >> 8) & 0xff,
    );
    this.buf.push(...logo.data);
    return this;
  }
  feedCut() {
    this.newline(3);
    // GS V 66 0 — potong (diabaikan printer tanpa cutter)
    return this.raw(GS, 0x56, 66, 0);
  }
  build(): Uint8Array {
    return new Uint8Array(this.buf);
  }
}

export function buildReceiptEscpos(r: EscposReceipt, width = 32): Uint8Array {
  const b = new Builder(width);
  b.init();

  b.align("center");
  if (r.logo) b.image(r.logo).newline();
  b.bold(true).text(r.storeName).newline().bold(false);
  if (r.addressLines) for (const ln of r.addressLines) if (ln.trim()) b.text(ln).newline();
  if (r.phone) b.text("Telp: " + r.phone).newline();
  b.text("Struk Penjualan").newline();
  b.line();

  b.align("left");
  b.leftRight("No", r.number);
  b.leftRight("Tgl", r.dateText);
  if (r.cashierName) b.leftRight("Kasir", r.cashierName);
  b.leftRight("Plgn", r.customerName || "Umum");
  b.line();

  for (const it of r.items) {
    b.text(it.name).newline();
    b.leftRight(`${it.qty} x ${rupiah(it.price)}`, rupiah(it.subtotal));
  }
  b.line();

  b.leftRight("Subtotal", rupiah(r.subtotal));
  if (r.discount > 0) b.leftRight("Diskon", "-" + rupiah(r.discount));
  b.bold(true).double(true).leftRight("TOTAL", rupiah(r.total)).double(false).bold(false);
  b.leftRight(`Bayar (${r.methodLabel})`, rupiah(r.paid));
  b.leftRight("Kembali", rupiah(r.change));
  b.line();

  b.align("center").text(r.footer || "Terima kasih").newline();
  b.feedCut();
  return b.build();
}
