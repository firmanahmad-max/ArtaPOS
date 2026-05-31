/**
 * Cetak ke printer thermal Bluetooth (BLE) via Web Bluetooth.
 * Hanya jalan di Chrome/Edge (Android/desktop) pada origin aman (https/localhost).
 * Banyak printer thermal memakai service 0x18F0 / karakteristik 0x2AF1, tapi
 * kita pindai semua service untuk mencari karakteristik yang bisa di-write.
 */

// UUID layanan umum printer thermal (untuk requestDevice optionalServices).
const COMMON_SERVICES: BluetoothServiceUUID[] = [
  0x18f0,
  0x18f1,
  "000018f0-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC / banyak printer murah
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
];

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

async function findWritable(
  server: BluetoothRemoteGATTServer,
): Promise<BluetoothRemoteGATTCharacteristic | null> {
  const services = await server.getPrimaryServices();
  for (const svc of services) {
    let chars: BluetoothRemoteGATTCharacteristic[];
    try {
      chars = await svc.getCharacteristics();
    } catch {
      continue;
    }
    for (const c of chars) {
      if (c.properties.write || c.properties.writeWithoutResponse) return c;
    }
  }
  return null;
}

/** Tampilkan dialog pilih perangkat, sambung, kirim data ESC/POS. */
export async function printViaBluetooth(data: Uint8Array): Promise<void> {
  if (!isWebBluetoothSupported()) {
    throw new Error(
      "Browser ini tidak mendukung Bluetooth. Gunakan Chrome/Edge di Android atau desktop.",
    );
  }

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: COMMON_SERVICES,
  });

  const server = await device.gatt!.connect();
  try {
    const ch = await findWritable(server);
    if (!ch) throw new Error("Karakteristik printer tidak ditemukan.");

    const useNoResponse = ch.properties.writeWithoutResponse;
    const CHUNK = 180; // batas aman MTU BLE
    for (let i = 0; i < data.length; i += CHUNK) {
      const slice = data.slice(i, i + CHUNK);
      if (useNoResponse && ch.writeValueWithoutResponse) {
        await ch.writeValueWithoutResponse(slice);
      } else {
        await ch.writeValue(slice);
      }
    }
  } finally {
    if (server.connected) server.disconnect();
  }
}
