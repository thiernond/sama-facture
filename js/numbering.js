/**
 * SAMA FACTURE - Générateur de Numérotation de Documents
 * Format standard : [PREFIXE]-[ANNEE]-[NUMERO_SEQUENCE_4_DIGITS]
 * Ex: FAC-2026-0001, DEV-2026-0012, BC-2026-0005
 */

export function getDefaultPrefix(type) {
    switch (type) {
        case 'quote': return 'DEV';
        case 'invoice': return 'FAC';
        case 'purchase_order': return 'BC';
        default: return 'DOC';
    }
}

export function formatDocumentNumber(prefix, year, sequenceNumber) {
    const seqStr = String(sequenceNumber).padStart(4, '0');
    return `${prefix}-${year}-${seqStr}`;
}

export function getNextSequenceNumber(documents, type, prefix, year = new Date().getFullYear()) {
    const matchingDocs = documents.filter(doc => {
        return doc.type === type && doc.number && doc.number.startsWith(`${prefix}-${year}-`);
    });

    if (matchingDocs.length === 0) return 1;

    let maxSeq = 0;
    matchingDocs.forEach(doc => {
        const parts = doc.number.split('-');
        if (parts.length >= 3) {
            const seq = parseInt(parts[2], 10);
            if (!isNaN(seq) && seq > maxSeq) {
                maxSeq = seq;
            }
        }
    });

    return maxSeq + 1;
}
