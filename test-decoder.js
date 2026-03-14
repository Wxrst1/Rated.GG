import { decodeMatchShareCode } from 'csgo-sharecode';
const code = 'CSGO-HxzUu-UwkPC-9pZ7X-OU3i6-pdueM';
try {
    const decoded = decodeMatchShareCode(code);
    console.log(Object.keys(decoded));
    console.log(decoded);
} catch (e) {
    console.error(e);
}
