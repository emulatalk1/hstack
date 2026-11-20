// The POSIX cksum of a byte string (one char per byte). The state folder of a repository is named by the cksum of its
// git dir, as scripts/hstack.sh named it, so a folder written by 0.3.3 is still found.
const CRC = (() => {
  const t: number[] = []
  for (let i = 0; i < 256; i++) {
    let c = i << 24
    for (let k = 0; k < 8; k++) c = c & 0x80000000 ? (c << 1) ^ 0x04c11db7 : c << 1
    t.push(c >>> 0)
  }
  return t
})()

export function cksum(bytes: string): number {
  let c = 0
  const feed = (x: number) => { c = ((c << 8) ^ CRC[((c >>> 24) ^ x) & 0xff]) >>> 0 }
  for (let i = 0; i < bytes.length; i++) feed(bytes.charCodeAt(i))
  for (let n = bytes.length; n > 0; n = Math.floor(n / 256)) feed(n & 0xff)
  return ~c >>> 0
}
