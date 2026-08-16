/**
 * SAMA FACTURE - Engine de Calcul Métier FCFA / XOF
 * Règle d'or XOF : Pas de sous-unités (centimes). Arrondi strict à l'entier le plus proche.
 */

/**
 * Arrondit un montant au franc XOF le plus proche.
 * @param {number} value 
 * @returns {number}
 */
export function roundXOF(value) {
    if (isNaN(value) || value === null || value === undefined) return 0;
    return Math.round(value);
}

/**
 * Formate un nombre en Franc CFA (XOF / XAF) avec séparateurs de milliers.
 * Ex: 1250000 -> "1 250 000 FCFA"
 * @param {number} amount 
 * @param {string} symbol 
 * @returns {string}
 */
export function formatFCFA(amount, symbol = 'FCFA') {
    const rounded = roundXOF(amount);
    const formatted = new Intl.NumberFormat('fr-FR', {
        maximumFractionDigits: 0
    }).format(rounded);
    return `${formatted} ${symbol}`;
}

/**
 * Calcule la ligne d'un document (Quantité * Prix Unitaire)
 * @param {number} quantity 
 * @param {number} unitPrice 
 * @returns {number}
 */
export function calculateLineTotal(quantity, unitPrice) {
    const qty = Number(quantity) || 0;
    const price = Number(unitPrice) || 0;
    return roundXOF(qty * price);
}

/**
 * Calcule l'ensemble des totaux d'un document.
 * @param {Array<{quantity: number, unitPrice: number}>} items 
 * @param {boolean} applyVat 
 * @param {number} vatRate Taux de TVA en pourcentage (ex: 18 pour 18%)
 * @returns {{ subtotal: number, vatAmount: number, total: number }}
 */
export function calculateDocumentTotals(items = [], applyVat = true, vatRate = 18) {
    let subtotal = 0;

    items.forEach(item => {
        subtotal += calculateLineTotal(item.quantity, item.unitPrice);
    });

    subtotal = roundXOF(subtotal);

    let vatAmount = 0;
    if (applyVat && vatRate > 0) {
        vatAmount = roundXOF(subtotal * (vatRate / 100));
    }

    const total = roundXOF(subtotal + vatAmount);

    return {
        subtotal,
        vatAmount,
        total
    };
}

/**
 * Calcule le montant restant à payer sur une facture.
 * @param {number} total 
 * @param {number} amountPaid 
 * @returns {number}
 */
export function calculateRemainingAmount(total, amountPaid) {
    const tot = roundXOF(total);
    const paid = roundXOF(amountPaid);
    const remaining = tot - paid;
    return remaining < 0 ? 0 : remaining;
}

/**
 * Détermine dynamiquement le statut d'une facture en fonction des dates et paiements.
 * @param {'draft'|'sent'|'paid'|'partially_paid'} currentStatus 
 * @param {number} total 
 * @param {number} amountPaid 
 * @param {string|Date} dueDate 
 * @returns {{ code: string, label: string, badgeClass: string }}
 */
export function getDocumentStatusInfo(currentStatus, total, amountPaid, dueDate) {
    const remaining = calculateRemainingAmount(total, amountPaid);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = dueDate ? new Date(dueDate) : null;
    if (due) due.setHours(0, 0, 0, 0);

    if (currentStatus === 'draft') {
        return { code: 'draft', label: 'Brouillon', badgeClass: 'badge-draft' };
    }

    if (remaining <= 0 && total > 0) {
        return { code: 'paid', label: 'Payée', badgeClass: 'badge-paid' };
    }

    if (amountPaid > 0 && remaining > 0) {
        if (due && due < today) {
            return { code: 'overdue', label: 'En retard (Partiel)', badgeClass: 'badge-overdue' };
        }
        return { code: 'partially_paid', label: 'Partiellement payée', badgeClass: 'badge-partial' };
    }

    if (due && due < today) {
        return { code: 'overdue', label: 'En retard', badgeClass: 'badge-overdue' };
    }

    return { code: 'sent', label: 'Envoyée', badgeClass: 'badge-sent' };
}
