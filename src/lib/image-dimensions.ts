/**
 * Uzaktan indirilen bir görselin boyutlarını dosya başlığından okur.
 *
 * Tarayıcıdan yapılan yüklemelerde boyut `new Image()` ile ölçülüyor; bu
 * modül yalnızca sunucuda, sosyal medya gönderisinden kapak içe aktarılırken
 * gerekiyor. `media_library.width/height` NOT NULL olduğu için boyutu
 * okunamayan bir dosya kaydedilmez — uydurma bir oran yazmak, sayfada
 * yerleşim kaymasına yol açar.
 */

export type ImageInfo = { width: number; height: number; mimeType: string };

function readPng(view: DataView): ImageInfo | null {
  // IHDR her zaman ilk chunk'tır: 8 bayt imza + 8 bayt chunk başlığı.
  if (view.byteLength < 24) return null;
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
    mimeType: "image/png",
  };
}

function readJpeg(view: DataView): ImageInfo | null {
  let offset = 2;

  while (offset + 9 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = view.getUint8(offset + 1);

    // Uzunluk alanı olmayan işaretçiler (RSTn, SOI, TEM) atlanır.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }

    const length = view.getUint16(offset + 2);
    if (length < 2) return null;

    // SOF0–SOF15 boyutu taşır; DHT (c4), JPG (c8) ve DAC (cc) taşımaz.
    const isFrameHeader =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

    if (isFrameHeader) {
      if (offset + 9 > view.byteLength) return null;
      return {
        width: view.getUint16(offset + 7),
        height: view.getUint16(offset + 5),
        mimeType: "image/jpeg",
      };
    }

    offset += 2 + length;
  }

  return null;
}

function readWebp(bytes: Uint8Array, view: DataView): ImageInfo | null {
  if (bytes.length < 30) return null;
  const format = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);

  if (format === "VP8 ") {
    return {
      width: view.getUint16(26, true) & 0x3fff,
      height: view.getUint16(28, true) & 0x3fff,
      mimeType: "image/webp",
    };
  }

  if (format === "VP8L") {
    const packed = view.getUint32(21, true);
    return {
      width: (packed & 0x3fff) + 1,
      height: ((packed >> 14) & 0x3fff) + 1,
      mimeType: "image/webp",
    };
  }

  if (format === "VP8X") {
    return {
      width: (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)) + 1,
      height: (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) + 1,
      mimeType: "image/webp",
    };
  }

  return null;
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

/**
 * Desteklenmeyen bir biçimde veya bozuk başlıkta `null` döner; çağıran taraf
 * bunu "kapağı elle yükleyin" mesajına çevirir.
 */
export function readImageInfo(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return readPng(view);
  if (startsWith(bytes, [0xff, 0xd8])) return readJpeg(view);
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50])) {
    return readWebp(bytes, view);
  }

  return null;
}
