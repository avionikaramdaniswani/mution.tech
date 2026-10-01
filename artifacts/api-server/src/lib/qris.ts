export function generateDynamicQRIS(staticQris: string, amount: number): string {
  if (!staticQris || !staticQris.startsWith("000201")) {
    return staticQris; // Not a valid EMVCo QRIS
  }

  try {
    // 1. Remove the existing CRC (last 4 chars) and its tag (6304) -> last 8 chars
    const crcTagIndex = staticQris.lastIndexOf("6304");
    let base = staticQris;
    if (crcTagIndex > -1 && crcTagIndex > staticQris.length - 10) {
      base = staticQris.substring(0, crcTagIndex);
    }

    // 2. Change 010211 (Static) to 010212 (Dynamic)
    if (base.includes("010211")) {
      base = base.replace("010211", "010212");
    }
    
    // 3. Append tag 54 (Amount)
    const amountStr = amount.toString();
    const amountLen = amountStr.length.toString().padStart(2, '0');
    const tag54 = `54${amountLen}${amountStr}`;
    
    // 4. Inject tag 54 before tag 58 to preserve ascending tag order (required by some wallets)
    const tag58Index = base.indexOf("5802");
    if (tag58Index !== -1) {
      base = base.substring(0, tag58Index) + tag54 + base.substring(tag58Index);
    } else {
      base += tag54;
    }

    // 5. Calculate new CRC16-CCITT (polynomial 0x1021, initial 0xFFFF, non-reflected)
    const toCrc = base + "6304";
    const crc = emvcoCrc16(toCrc);
    const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');

    return toCrc + crcHex;
  } catch (err) {
    console.error("Failed to generate dynamic QRIS", err);
    return staticQris;
  }
}

function emvcoCrc16(str: string): number {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= (str.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021);
      } else {
        crc = (crc << 1);
      }
    }
  }
  return crc & 0xFFFF;
}
