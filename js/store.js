import { calculateDocumentTotals } from './calculations.js';
import { supabase } from './supabaseClient.js';

const DEFAULT_ORG = {
    name: 'Nouvelle Entreprise PME',
    email: 'contact@pme.sn',
    phone: '+221 77 000 00 00',
    address: 'Dakar, Sénégal',
    ninea: '000000000 000',
    rccm: 'SN-DKR-2026-B-000',
    default_vat_rate: 18,
    currency: 'XOF',
    quote_prefix: 'DEV',
    invoice_prefix: 'FAC',
    purchase_order_prefix: 'BC'
};

class Store {
    constructor() {
        this.currentUser = null;
        this.currentProfile = null;
        this.currentOrg = null;
    }

    async init() {
        // Initialiser l'état de l'utilisateur à partir de la session active
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            this.currentUser = session.user;
            await this.loadUserProfile();
        }

        // Écouter les changements d'état d'authentification
        supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session) {
                this.currentUser = session.user;
                await this.loadUserProfile();
            } else {
                this.currentUser = null;
                this.currentProfile = null;
                this.currentOrg = null;
            }
        });
    }

    async loadUserProfile() {
        if (!this.currentUser) return;
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', this.currentUser.id)
            .single();
            
        this.currentProfile = profile;

        if (profile?.organization_id) {
            const { data: org } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', profile.organization_id)
                .single();
            this.currentOrg = org;
        }
    }

    getUser() {
        if (!this.currentUser) return null;
        return {
            id: this.currentUser.id,
            name: this.currentProfile?.full_name || this.currentUser.email,
            email: this.currentUser.email,
            role: this.currentProfile?.role || 'user',
            avatarText: (this.currentProfile?.full_name || this.currentUser.email || 'XX').substring(0, 2).toUpperCase()
        };
    }

    getOrganization() {
        if (!this.currentOrg) return DEFAULT_ORG;
        return {
            id: this.currentOrg.id,
            name: this.currentOrg.name,
            email: this.currentOrg.email,
            phone: this.currentOrg.phone,
            address: this.currentOrg.address,
            ninea: this.currentOrg.ninea,
            rccm: this.currentOrg.rccm,
            logoUrl: this.currentOrg.logo_url,
            defaultVatRate: this.currentOrg.default_vat_rate,
            currency: this.currentOrg.currency,
            quotePrefix: this.currentOrg.quote_prefix,
            invoicePrefix: this.currentOrg.invoice_prefix,
            purchaseOrderPrefix: this.currentOrg.purchase_order_prefix
        };
    }

    async saveOrganization(orgData) {
        if (!this.currentOrg) return;
        
        const updateData = {
            name: orgData.name,
            email: orgData.email,
            phone: orgData.phone,
            address: orgData.address,
            ninea: orgData.ninea,
            rccm: orgData.rccm,
            default_vat_rate: orgData.defaultVatRate,
            currency: orgData.currency,
            quote_prefix: orgData.quotePrefix,
            invoice_prefix: orgData.invoicePrefix,
            purchase_order_prefix: orgData.purchaseOrderPrefix,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('organizations')
            .update(updateData)
            .eq('id', this.currentOrg.id)
            .select()
            .single();

        if (!error && data) {
            this.currentOrg = data;
        }
    }

    async getClients() {
        if (!this.currentOrg) return [];
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) return [];
        return data;
    }

    async getClientById(id) {
        const { data } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();
        return data;
    }

    async saveClient(client) {
        if (!this.currentOrg) throw new Error("Vous devez être connecté pour effectuer cette action.");
        
        const clientData = {
            organization_id: this.currentOrg.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            address: client.address,
            rccm: client.rccm,
            ninea: client.ninea
        };

        if (client.id) {
            const { data, error } = await supabase
                .from('clients')
                .update({ ...clientData, updated_at: new Date().toISOString() })
                .eq('id', client.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from('clients')
                .insert([clientData])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    }

    async deleteClient(id) {
        await supabase.from('clients').delete().eq('id', id);
    }

    async getDocuments(typeFilter = null) {
        if (!this.currentOrg) return [];
        
        let query = supabase
            .from('documents')
            .select(`
                *,
                clients (*),
                document_items (*)
            `)
            .order('created_at', { ascending: false });
            
        if (typeFilter) {
            query = query.eq('type', typeFilter);
        }

        const { data, error } = await query;
        if (error || !data) return [];
        
        return data.map(doc => {
            const items = doc.document_items || [];
            const totals = calculateDocumentTotals(items, doc.apply_vat, doc.vat_rate);
            return {
                id: doc.id,
                type: doc.type,
                number: doc.number,
                clientId: doc.client_id,
                issueDate: doc.issue_date,
                dueDate: doc.due_date,
                status: doc.status,
                applyVat: doc.apply_vat,
                vatRate: doc.vat_rate,
                notes: doc.notes,
                convertedFromId: doc.converted_from_id,
                subtotal: totals.subtotal,
                vatAmount: totals.vatAmount,
                total: totals.total,
                amountPaid: Number(doc.amount_paid),
                client: doc.clients,
                items: items
            };
        });
    }

    async getDocumentById(id) {
        const { data, error } = await supabase
            .from('documents')
            .select(`
                *,
                clients (*),
                document_items (*)
            `)
            .eq('id', id)
            .single();
            
        if (error || !data) return null;
        
        const items = data.document_items || [];
        const totals = calculateDocumentTotals(items, data.apply_vat, data.vat_rate);
        
        return {
            id: data.id,
            type: data.type,
            number: data.number,
            clientId: data.client_id,
            issueDate: data.issue_date,
            dueDate: data.due_date,
            status: data.status,
            applyVat: data.apply_vat,
            vatRate: data.vat_rate,
            notes: data.notes,
            convertedFromId: data.converted_from_id,
            subtotal: totals.subtotal,
            vatAmount: totals.vatAmount,
            total: totals.total,
            amountPaid: Number(data.amount_paid),
            client: data.clients,
            items: items
        };
    }

    async generateDocumentNumber(type) {
        if (!this.currentOrg) return 'DOC-0000';
        
        const { data, error } = await supabase.rpc('generate_document_number', {
            p_org_id: this.currentOrg.id,
            p_type: type
        });
        
        if (error || !data) {
            // Fallback en cas d'erreur de la fonction RPC
            const prefix = type === 'quote' ? 'DEV' : (type === 'invoice' ? 'FAC' : 'BC');
            return `${prefix}-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        }
        
        return data;
    }

    async saveDocument(doc) {
        if (!this.currentOrg) throw new Error("Vous devez être connecté pour effectuer cette action.");
        
        const items = doc.items || [];
        const totals = calculateDocumentTotals(items, doc.applyVat, doc.vatRate);
        
        const docData = {
            organization_id: this.currentOrg.id,
            client_id: doc.clientId,
            type: doc.type,
            number: doc.number || await this.generateDocumentNumber(doc.type),
            status: doc.status || 'draft',
            issue_date: doc.issueDate,
            due_date: doc.dueDate,
            apply_vat: doc.applyVat,
            vat_rate: doc.vatRate,
            subtotal: totals.subtotal,
            vat_amount: totals.vatAmount,
            total: totals.total,
            amount_paid: doc.amountPaid || 0,
            notes: doc.notes,
            converted_from_id: doc.convertedFromId
        };

        let savedDocId = doc.id;

        if (savedDocId) {
            const { error } = await supabase
                .from('documents')
                .update({ ...docData, updated_at: new Date().toISOString() })
                .eq('id', savedDocId);
            if (error) throw error;
                
            // Supprimer les anciens items
            await supabase.from('document_items').delete().eq('document_id', savedDocId);
        } else {
            const { data, error } = await supabase
                .from('documents')
                .insert([docData])
                .select()
                .single();
            if (error) throw error;
            if (data) savedDocId = data.id;
        }

        if (savedDocId && items.length > 0) {
            const itemsData = items.map((item, index) => ({
                document_id: savedDocId,
                reference: item.reference,
                designation: item.designation,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                position: index
            }));
            await supabase.from('document_items').insert(itemsData);
        }

        return await this.getDocumentById(savedDocId);
    }

    async deleteDocument(id) {
        await supabase.from('documents').delete().eq('id', id);
    }

    async addPayment(docId, amount) {
        const doc = await this.getDocumentById(docId);
        if (!doc) return null;

        const currentPaid = Number(doc.amountPaid) || 0;
        const newPaid = currentPaid + Number(amount);
        let newStatus = doc.status;

        if (newPaid >= doc.total) {
            newStatus = 'paid';
        } else if (newPaid > 0) {
            newStatus = 'partially_paid';
        }

        await supabase
            .from('documents')
            .update({ 
                amount_paid: newPaid,
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', docId);
            
        await supabase.from('payments').insert([{
            organization_id: this.currentOrg.id,
            document_id: docId,
            amount: amount,
            payment_date: new Date().toISOString().split('T')[0]
        }]);

        return await this.getDocumentById(docId);
    }

    async updateDocumentStatus(docId, newStatus) {
        const doc = await this.getDocumentById(docId);
        if (!doc) return null;

        let amountPaid = doc.amountPaid;
        
        if (newStatus === 'paid') {
            amountPaid = doc.total;
        } else if (newStatus === 'draft' || newStatus === 'sent') {
            if (amountPaid >= doc.total) {
                amountPaid = 0;
            }
        }

        await supabase
            .from('documents')
            .update({ 
                status: newStatus,
                amount_paid: amountPaid,
                updated_at: new Date().toISOString()
            })
            .eq('id', docId);

        return await this.getDocumentById(docId);
    }

    async loginUser(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data.user;
    }

    async registerUser(fullName, orgName, email, password) {
        // 1. Inscription Auth Supabase (avec métadonnées pour le Trigger)
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    fullName: fullName,
                    orgName: orgName
                }
            }
        });
        
        if (authError) throw authError;
        
        // 2. Les tables 'organizations' et 'profiles' seront créées 
        // automatiquement par le Trigger SQL (handle_new_user) côté serveur.
        // Cela évite les erreurs RLS si la confirmation d'email est requise.
        
        return authData.user;
    }

    async logoutUser() {
        await supabase.auth.signOut();
        this.currentUser = null;
        this.currentProfile = null;
        this.currentOrg = null;
    }
}

export const store = new Store();
// Initialisation asynchrone à démarrer depuis app.js
await store.init();
