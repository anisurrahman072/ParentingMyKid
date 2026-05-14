"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeDomainForPolicy = normalizeDomainForPolicy;
/**
 * Normalizes a typed or pasted hostname for website allow/block lists on the backend and native DNS filter.
 * Strips URLs, mentions, wildcard prefixes, redundant www, ports, paths, queries, fragments.
 */
function normalizeDomainForPolicy(raw) {
    let s = raw.trim().toLowerCase();
    if (!s)
        return '';
    while (s.startsWith('@'))
        s = s.slice(1).trim();
    while (s.startsWith('*.'))
        s = s.slice(2).trim();
    const schemes = ['https://', 'http://'];
    for (const sc of schemes) {
        if (s.startsWith(sc)) {
            s = s.slice(sc.length);
            break;
        }
    }
    /* user@domain from paste */
    const atIx = s.indexOf('@');
    if (atIx > 0 && atIx < s.length - 1) {
        const tail = s.slice(atIx + 1);
        if (tail.includes('.'))
            s = tail;
    }
    for (const sep of ['/', '?', '#']) {
        const i = s.indexOf(sep);
        if (i >= 0)
            s = s.slice(0, i);
    }
    /* IPv6 [addr]:port — not used in domain lists */
    if (s.startsWith('[')) {
        const endBracket = s.indexOf(']');
        if (endBracket > 0) {
            const after = s.slice(endBracket + 1);
            if (after.startsWith(':'))
                return '';
            return s.slice(1, endBracket).replace(/\.+$/, '').trim();
        }
    }
    const colonIx = s.lastIndexOf(':');
    if (colonIx > 0) {
        const hostPart = s.slice(0, colonIx);
        const portPart = s.slice(colonIx + 1);
        if (/^\d+$/.test(portPart) && !hostPart.includes(']'))
            s = hostPart;
    }
    while (s.startsWith('www.'))
        s = s.slice(4);
    return s.replace(/\.+$/, '').trim();
}
