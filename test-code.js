import { decodeMatchShareCode } from 'csgo-sharecode';

const code = 'CSGO-y9hpw-54t7J-N4o67-HEDcO-qHBxH';

try {
    const decoded = decodeMatchShareCode(code);
    console.log('Decoded successfully:', JSON.stringify(decoded, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    , 2));
} catch (e) {
    console.log('Failed to decode:', e.message);
}
