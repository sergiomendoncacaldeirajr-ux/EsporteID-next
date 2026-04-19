import fs from "fs";
const b = fs.readFileSync(process.argv[2]);
console.log("sig", b.slice(0, 4).toString("hex"));
if (b[0] === 0x89 && b[1] === 0x50) {
  console.log("PNG", b.readUInt32BE(16), b.readUInt32BE(20));
} else {
  let i = 0;
  while (i < b.length - 8) {
    if (b[i] === 0xff && (b[i + 1] === 0xc0 || b[i + 1] === 0xc2)) {
      console.log("JPEG wh", b.readUInt16BE(i + 7), b.readUInt16BE(i + 5));
      break;
    }
    i++;
  }
}
