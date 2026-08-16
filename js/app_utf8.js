import { store } from './store.js';
import { 
    formatFCFA, 
    calculateDocumentTotals, 
    calculateRemainingAmount, 
    getDocumentStatusInfo,
    roundXOF
} from './calculations.js';
import { 
    getDefaultPrefix, 
    formatDocumentNumber, 
    getNextSequenceNumber 
} from './numbering.js';

class App {
    constructor() {
        this.currentView = 'dashboard';
        this.activeDocId = null;
        this.editingDocType = 'invoice';
        this.editingItems = [];

        this.init();
    }

    async init() {
        this.bindNavigation();
        this.bindEvents();
        await this.renderUserAuthUI();
        await this.renderView('dashboard');
    }

    showToast(message, icon = 'ri-checkbox-circle-fill') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    confirmDelete(message, onConfirm) {
        const modal = document.getElementById('deleteConfirmModal');
        const msgEl = document.getElementById('deleteConfirmMessage');
        const confirmBtn = document.getElementById('confirmDeleteActionBtn');
        
        if (!modal || !msgEl || !confirmBtn) return;
        
        msgEl.textContent = message || "Voulez-vous vraiment supprimer cet Ã©lÃ©ment ?";
        
        // Remove previous event listeners by cloning
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        newConfirmBtn.addEventListener('click', async () => {
            onConfirm();
            modal.classList.remove('active');
        });
        
        modal.classList.add('active');
    }

    bindNavigation() {
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.addEventListener('click', async (e) => {
                const view = item.getAttribute('data-view');
                await this.navigateTo(view);
            });
        });
    }

    async navigateTo(view, params = {}) {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-view="${view}"]`);
        if (activeNav) activeNav.classList.add('active');

        this.currentView = view;

        if (view === 'document-editor') {
            await this.setupDocumentEditor(params.type || 'invoice', params.id || null);
        } else if (view === 'document-view') {
            this.activeDocId = params.id;
            await this.renderDocumentView(params.id);
        } else {
            await this.renderView(view);
        }
    }

    async renderUserAuthUI() {
        const user = store.getUser();
        const org = store.getOrganization();

        // 1. Topbar Actions (Haut Ã  droite)
        const topbarContainer = document.getElementById('topbarActions');
        if (topbarContainer) {
            if (user) {
                topbarContainer.innerHTML = `
                    <div class="user-header-card" id="userHeaderCard" title="Menu utilisateur">
                        <div class="user-avatar-circle">${user.avatarText || 'MD'}</div>
                        <div class="user-header-info">
                            <span class="user-header-name">${user.name}</span>
                            <span class="user-header-role">${user.role || 'Administrateur'}</span>
                        </div>
                        <i class="ri-arrow-down-s-line" style="color:var(--color-text-muted);"></i>
                    </div>
                    <div class="user-dropdown-menu" id="userDropdownMenu">
                        <div class="dropdown-header">
                            <strong>${user.name}</strong>
                            <small>${user.email}</small>
                        </div>
                        <div class="dropdown-divider"></div>
                        <button class="dropdown-item" id="dropdownSettingsBtn"><i class="ri-settings-4-line"></i> ParamÃ¨tres PME</button>
                        <button class="dropdown-item danger" id="dropdownLogoutBtn"><i class="ri-logout-box-r-line"></i> Se DÃ©connecter</button>
                    </div>
                `;
            } else {
                topbarContainer.innerHTML = `
                    <button class="btn btn-primary btn-sm" id="topbarLoginBtn">
                        <i class="ri-login-box-line"></i> Se Connecter
                    </button>
                `;
            }
        }

        // 2. Sidebar Card (Bas Ã  gauche)
        const sidebarAvatar = document.getElementById('sidebarUserAvatar');
        const sidebarUser = document.getElementById('sidebarUserName');
        const sidebarOrg = document.getElementById('sidebarOrgName');
        const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');

        if (user) {
            if (sidebarAvatar) sidebarAvatar.textContent = user.avatarText || 'MD';
            if (sidebarUser) sidebarUser.textContent = user.name;
            if (sidebarOrg) sidebarOrg.textContent = org.name;
            if (sidebarLogoutBtn) sidebarLogoutBtn.style.display = 'flex';
        } else {
            if (sidebarAvatar) sidebarAvatar.textContent = '?';
            if (sidebarUser) sidebarUser.textContent = 'Non connectÃ©';
            if (sidebarOrg) sidebarOrg.textContent = 'Cliquez pour vous connecter';
            if (sidebarLogoutBtn) sidebarLogoutBtn.style.display = 'none';
        }

        await this.bindUserAuthEvents();
    }

    async bindUserAuthEvents() {
        const headerCard = document.getElementById('userHeaderCard');
        const dropdownMenu = document.getElementById('userDropdownMenu');
        const logoutDropdownBtn = document.getElementById('dropdownLogoutBtn');
        const logoutSidebarBtn = document.getElementById('sidebarLogoutBtn');
        const loginTopbarBtn = document.getElementById('topbarLoginBtn');
        const dropdownSettingsBtn = document.getElementById('dropdownSettingsBtn');

        // Tab Switching Elements
        const tabLoginBtn = document.getElementById('tabLoginBtn');
        const tabRegisterBtn = document.getElementById('tabRegisterBtn');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const emailVerifyView = document.getElementById('emailVerifyView');
        const authTabsHeader = document.getElementById('authTabsHeader');

        const showAuthView = (viewName) => {
            if (emailVerifyView) emailVerifyView.style.display = 'none';
            if (authTabsHeader) authTabsHeader.style.display = 'flex';

            if (viewName === 'login') {
                if (tabLoginBtn) tabLoginBtn.classList.add('active');
                if (tabRegisterBtn) tabRegisterBtn.classList.remove('active');
                if (loginForm) loginForm.style.display = 'block';
                if (registerForm) registerForm.style.display = 'none';
            } else if (viewName === 'register') {
                if (tabRegisterBtn) tabRegisterBtn.classList.add('active');
                if (tabLoginBtn) tabLoginBtn.classList.remove('active');
                if (registerForm) registerForm.style.display = 'block';
                if (loginForm) loginForm.style.display = 'none';
            }
        };

        if (tabLoginBtn) tabLoginBtn.onclick = async () => showAuthView('login');
        if (tabRegisterBtn) tabRegisterBtn.onclick = async () => showAuthView('register');

        const switchReg = document.getElementById('switchToRegisterLink');
        const switchLog = document.getElementById('switchToLoginLink');
        if (switchReg) switchReg.onclick = async () => showAuthView('register');
        if (switchLog) switchLog.onclick = async () => showAuthView('login');

        if (headerCard && dropdownMenu) {
            headerCard.onclick = (e) => {
                e.stopPropagation();
                dropdownMenu.classList.toggle('show');
            };

            document.onclick = (e) => {
                if (!headerCard.contains(e.target) && !dropdownMenu.contains(e.target)) {
                    dropdownMenu.classList.remove('show');
                }
            };
        }

        const handleLogout = async () => {
            await store.logoutUser();
            this.showToast('Session fermÃ©e avec succÃ¨s.', 'ri-logout-box-r-line');
            await this.renderUserAuthUI();
            await this.renderView(this.currentView);
        };

        if (logoutDropdownBtn) logoutDropdownBtn.onclick = handleLogout;
        if (logoutSidebarBtn) logoutSidebarBtn.onclick = handleLogout;

        if (loginTopbarBtn) {
            loginTopbarBtn.onclick = async () => {
                showAuthView('login');
                document.getElementById('loginModal').classList.add('active');
            };
        }

        if (dropdownSettingsBtn) {
            dropdownSettingsBtn.onclick = async () => {
                await this.navigateTo('parametres');
            };
        }

        // Login Submit
        if (loginForm) {
            loginForm.onsubmit = async (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const user = await store.loginUser(email);
                document.getElementById('loginModal').classList.remove('active');
                this.showToast(`Bienvenue ${user.name} !`);
                await this.renderUserAuthUI();
                await this.renderView(this.currentView);
            };
        }

        // Register Submit -> Trigger Supabase Registration
        if (registerForm) {
            registerForm.onsubmit = async (e) => {
                e.preventDefault();
                const fullName = document.getElementById('regFullName').value;
                const orgName = document.getElementById('regOrgName').value;
                const email = document.getElementById('regEmail').value;
                const pass = document.getElementById('regPassword').value;
                const confirmPass = document.getElementById('regPasswordConfirm').value;

                if (pass !== confirmPass) {
                    alert('Les mots de passe ne correspondent pas.');
                    return;
                }

                try {
                    await store.registerUser(fullName, orgName, email, pass);
                    document.getElementById('verifyEmailTarget').textContent = email;

                    if (loginForm) loginForm.style.display = 'none';
                    if (registerForm) registerForm.style.display = 'none';
                    if (authTabsHeader) authTabsHeader.style.display = 'none';
                    if (emailVerifyView) emailVerifyView.style.display = 'block';
                } catch (error) {
                    alert('Erreur lors de l\\'inscription : ' + error.message);
                }
            };
        }

        // Confirm Email Validation Button (User acknowledges they need to check email)
        const confirmEmailBtn = document.getElementById('confirmEmailValidationBtn');
        if (confirmEmailBtn) {
            confirmEmailBtn.onclick = () => {
                document.getElementById('loginModal').classList.remove('active');
                this.showToast(`Veuillez vérifier votre boîte email pour activer votre compte.`, 'ri-mail-check-line');
            };
        }
    }


    async updateSidebarOrg() {
        await this.renderUserAuthUI();
    }


    bindEvents() {
        // Mobile Simulator Toggle
        const mobileSimBtn = document.getElementById('mobileSimBtn');
        if (mobileSimBtn) {
            mobileSimBtn.addEventListener('click', async () => {
                document.body.classList.toggle('mobile-simulator');
            });
        }

        // Mobile Menu Toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const sidebar = document.querySelector('.sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        
        if (mobileMenuBtn && sidebar && sidebarOverlay) {
            const toggleSidebar = () => {
                sidebar.classList.toggle('open');
                sidebarOverlay.classList.toggle('active');
            };
            
            mobileMenuBtn.addEventListener('click', toggleSidebar);
            sidebarOverlay.addEventListener('click', toggleSidebar);
            
            // Close sidebar when clicking a nav item on mobile
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', async () => {
                    if (window.innerWidth <= 768 || document.body.classList.contains('mobile-simulator')) {
                        sidebar.classList.remove('open');
                        sidebarOverlay.classList.remove('active');
                    }
                });
            });
        }

        // Global Search
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.addEventListener('input', async (e) => {
                const query = e.target.value.toLowerCase();
                if (this.currentView === 'factures' || this.currentView === 'devis' || this.currentView === 'bons-de-commande') {
                    this.filterDocumentsList(query);
                } else if (this.currentView === 'clients') {
                    await this.renderClientsView(query);
                }
            });
        }

        // Modal Close triggers
        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
            });
        });

        // Client Form Submit
        const clientForm = document.getElementById('clientForm');
        if (clientForm) {
            clientForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(clientForm);
                const clientData = {
                    id: formData.get('id') || null,
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    ninea: formData.get('ninea'),
                    rccm: formData.get('rccm'),
                    address: formData.get('address')
                };
                await store.saveClient(clientData);
                document.getElementById('clientModal').classList.remove('active');
                this.showToast('Client enregistrÃ© avec succÃ¨s !');
                if (this.currentView === 'clients') await this.renderClientsView();
            });
        }

        // Organization Settings Form Submit
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(settingsForm);
                const orgData = {
                    ...store.getOrganization(),
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    ninea: formData.get('ninea'),
                    rccm: formData.get('rccm'),
                    address: formData.get('address'),
                    defaultNotes: formData.get('defaultNotes'),
                    defaultVatRate: Number(formData.get('defaultVatRate')) || 18,
                    quotePrefix: formData.get('quotePrefix') || 'DEV',
                    invoicePrefix: formData.get('invoicePrefix') || 'FAC',
                    purchaseOrderPrefix: formData.get('purchaseOrderPrefix') || 'BC'
                };
                await store.saveOrganization(orgData);
                this.updateSidebarOrg();
                this.showToast('ParamÃ¨tres de l\'entreprise mis Ã  jour !');
            });
        }

        // Payment Form Submit
        const paymentForm = document.getElementById('paymentForm');
        if (paymentForm) {
            paymentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const docId = document.getElementById('paymentDocId').value;
                const amount = Number(document.getElementById('paymentAmount').value);
                if (docId && amount > 0) {
                    await store.addPayment(docId, amount);
                    document.getElementById('paymentModal').classList.remove('active');
                    this.showToast(`Paiement de ${formatFCFA(amount)} enregistrÃ© avec succÃ¨s !`);
                    if (this.currentView === 'document-view') {
                        await this.renderDocumentView(docId);
                    } else {
                        await this.renderView(this.currentView);
                    }
                }
            });
        }
    }

    async updateSidebarOrg() {
        const org = store.getOrganization();
        const orgNameEl = document.getElementById('sidebarOrgName');
        const orgSubEl = document.getElementById('sidebarOrgNinea');
        if (orgNameEl) orgNameEl.textContent = org.name;
        if (orgSubEl) orgSubEl.textContent = org.ninea ? `NINEA: ${org.ninea}` : org.email;
    }

    async renderView(view) {
        this.updateSidebarOrg();
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) return;

        switch (view) {
            case 'dashboard':
                this.renderDashboardView();
                break;
            case 'factures':
                await this.renderDocumentsListView('invoice', 'Factures', 'GÃ©rez vos factures et suivez les rÃ¨glements clients.');
                break;
            case 'devis':
                await this.renderDocumentsListView('quote', 'Devis Commercial', 'Proposez vos devis et convertissez-les en factures en 1 clic.');
                break;
            case 'bons-de-commande':
                await this.renderDocumentsListView('purchase_order', 'Bons de Commande', 'Ã‰mettez et suivez vos bons de commande clients.');
                break;
            case 'clients':
                await this.renderClientsView();
                break;
            case 'parametres':
                await this.renderSettingsView();
                break;
            default:
                this.renderDashboardView();
        }
    }

    /* ==========================================================================
       DASHBOARD VIEW
       ========================================================================== */
    async renderDashboardView() {
        const docs = await store.getDocuments();
        const clients = await store.getClients();

        let totalRevenue = 0;
        let totalPending = 0;
        let activeQuotesCount = 0;

        docs.forEach(doc => {
            if (doc.type === 'invoice') {
                totalRevenue += doc.amountPaid || 0;
                totalPending += calculateRemainingAmount(doc.total, doc.amountPaid || 0);
            } else if (doc.type === 'quote' && (doc.status === 'sent' || doc.status === 'draft')) {
                activeQuotesCount++;
            }
        });

        const recentDocs = [...docs].sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate)).slice(0, 5);

        const html = `
            <div class="page-header">
                <div class="page-title">
                    <h2>Tableau de Bord</h2>
                    <p>AperÃ§u en temps rÃ©el de votre activitÃ© commerciale et trÃ©sorerie.</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-primary" id="quickNewInvoiceBtn">
                        <i class="ri-add-line"></i> Nouvelle Facture
                    </button>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-info">
                        <span>Chiffre d'Affaires EncaissÃ©</span>
                        <h3>${formatFCFA(totalRevenue)}</h3>
                        <p>Total des rÃ¨glements reÃ§us</p>
                    </div>
                    <div class="stat-icon emerald">
                        <i class="ri-wallet-3-line"></i>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-info">
                        <span>Encours Ã  Recouvrer</span>
                        <h3>${formatFCFA(totalPending)}</h3>
                        <p>Reste Ã  payer sur factures Ã©mises</p>
                    </div>
                    <div class="stat-icon amber">
                        <i class="ri-time-line"></i>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-info">
                        <span>Devis en Cours</span>
                        <h3>${activeQuotesCount}</h3>
                        <p>Devis prÃªts Ã  Ãªtre convertis</p>
                    </div>
                    <div class="stat-icon blue">
                        <i class="ri-file-text-line"></i>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-info">
                        <span>Portefeuille Clients</span>
                        <h3>${clients.length}</h3>
                        <p>Entreprises partenaires enregistrÃ©es</p>
                    </div>
                    <div class="stat-icon rose">
                        <i class="ri-user-star-line"></i>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">
                        <h3>Derniers Documents Ã‰mis</h3>
                    </div>
                    <button class="btn btn-ghost btn-sm" id="viewAllDocsBtn">Voir tout <i class="ri-arrow-right-line"></i></button>
                </div>
                <div class="table-responsive">
                    <table class="custom-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>NÂ° Document</th>
                                <th>Client</th>
                                <th>Date d'Ã‰mission</th>
                                <th>Montant TTC</th>
                                <th>Statut</th>
                                <th style="text-align: right;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${recentDocs.map(doc => this.renderDocumentRowHTML(doc)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;

        document.getElementById('quickNewInvoiceBtn').addEventListener('click', async () => {
            await this.navigateTo('document-editor', { type: 'invoice' });
        });

        document.getElementById('viewAllDocsBtn').addEventListener('click', async () => {
            await this.navigateTo('factures');
        });

        this.bindTableActionEvents();
    }

    renderStatusSelectorHTML(doc) {
        const statusInfo = getDocumentStatusInfo(doc.status, doc.total, doc.amountPaid || 0, doc.dueDate);
        return `
            <select class="status-select ${statusInfo.badgeClass}" data-doc-id="${doc.id}" title="Cliquer pour modifier le statut en 1-clic">
                <option value="draft" ${doc.status === 'draft' ? 'selected' : ''}>â€¢ Brouillon</option>
                <option value="sent" ${doc.status === 'sent' ? 'selected' : ''}>â€¢ EnvoyÃ©(e)</option>
                ${doc.type === 'invoice' ? `
                    <option value="partially_paid" ${doc.status === 'partially_paid' ? 'selected' : ''}>â€¢ Partiellement payÃ©e</option>
                    <option value="paid" ${doc.status === 'paid' ? 'selected' : ''}>â€¢ PayÃ©e (RÃ©glÃ©e)</option>
                ` : ''}
            </select>
        `;
    }

    renderDocumentRowHTML(doc) {
        const typeLabels = { quote: 'Devis', invoice: 'Facture', purchase_order: 'Bon de commande' };

        return `
            <tr>
                <td><strong>${typeLabels[doc.type] || doc.type}</strong></td>
                <td><code style="font-weight:700; color:var(--color-primary);">${doc.number}</code></td>
                <td>${doc.client ? doc.client.name : 'Client inconnu'}</td>
                <td>${doc.issueDate}</td>
                <td><strong>${formatFCFA(doc.total)}</strong></td>
                <td>${this.renderStatusSelectorHTML(doc)}</td>
                <td style="text-align: right;">
                    <button class="btn btn-ghost btn-sm view-doc-btn" data-id="${doc.id}">
                        <i class="ri-eye-line"></i> Afficher
                    </button>
                </td>
            </tr>
        `;
    }

    bindTableActionEvents() {
        document.querySelectorAll('.view-doc-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = btn.getAttribute('data-id');
                await this.navigateTo('document-view', { id });
            });
        });

        document.querySelectorAll('.status-select[data-doc-id]').forEach(select => {
            select.addEventListener('change', async (e) => {
                e.stopPropagation();
                const docId = select.getAttribute('data-doc-id');
                const newStatus = select.value;
                const updated = await store.updateDocumentStatus(docId, newStatus);
                if (updated) {
                    const labels = { draft: 'Brouillon', sent: 'EnvoyÃ©(e)', partially_paid: 'Partiellement payÃ©e', paid: 'PayÃ©e' };
                    this.showToast(`Statut du document ${updated.number} mis Ã  jour : ${labels[newStatus] || newStatus}`);
                    await this.renderView(this.currentView);
                }
            });
        });
    }

    /* ==========================================================================
       DOCUMENTS LIST VIEW (Factures / Devis / BC)
       ========================================================================== */
    async renderDocumentsListView(type, title, subtitle) {
        const docs = await store.getDocuments(type);

        const html = `
            <div class="page-header">
                <div class="page-title">
                    <h2>${title}</h2>
                    <p>${subtitle}</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-primary" id="createNewDocBtn">
                        <i class="ri-add-line"></i> Nouveau ${type === 'quote' ? 'Devis' : (type === 'invoice' ? 'Facture' : 'Bon de Commande')}
                    </button>
                </div>
            </div>

            <div class="card">
                <div class="table-responsive">
                    <table class="custom-table" id="documentsListTable">
                        <thead>
                            <tr>
                                <th>NÂ° Document</th>
                                <th>Client</th>
                                <th>Date d'Ã‰mission</th>
                                <th>Ã‰chÃ©ance</th>
                                <th>Montant TTC</th>
                                ${type === 'invoice' ? '<th>Reste Ã  Payer</th>' : ''}
                                <th>Statut (Cliquer pour changer)</th>
                                <th style="text-align: right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${docs.length === 0 ? `<tr><td colspan="8" style="text-align:center; padding:3rem; color:var(--color-text-muted);">Aucun document crÃ©Ã© pour le moment.</td></tr>` : ''}
                            ${docs.map(doc => {
                                const remaining = calculateRemainingAmount(doc.total, doc.amountPaid || 0);
                                return `
                                    <tr>
                                        <td><code style="font-weight:700; color:var(--color-primary);">${doc.number}</code></td>
                                        <td>${doc.client ? doc.client.name : 'â€”'}</td>
                                        <td>${doc.issueDate}</td>
                                        <td>${doc.dueDate || 'â€”'}</td>
                                        <td><strong>${formatFCFA(doc.total)}</strong></td>
                                        ${type === 'invoice' ? `<td><span style="color:${remaining > 0 ? 'var(--color-danger)' : 'var(--color-success)'}; font-weight:700;">${formatFCFA(remaining)}</span></td>` : ''}
                                        <td>${this.renderStatusSelectorHTML(doc)}</td>
                                        <td style="text-align: right;">
                                            <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
                                                <button class="btn btn-ghost btn-sm view-doc-btn" data-id="${doc.id}" title="Voir / Imprimer">
                                                    <i class="ri-eye-line"></i>
                                                </button>
                                                <button class="btn btn-ghost btn-sm edit-doc-btn" data-id="${doc.id}" data-type="${doc.type}" title="Modifier">
                                                    <i class="ri-edit-line"></i>
                                                </button>
                                                <button class="btn btn-ghost btn-sm delete-doc-btn" data-id="${doc.id}" title="Supprimer" style="color:var(--color-danger);">
                                                    <i class="ri-delete-bin-line"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;

        document.getElementById('createNewDocBtn').addEventListener('click', async () => {
            await this.navigateTo('document-editor', { type });
        });

        this.bindTableActionEvents();

        document.querySelectorAll('.edit-doc-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const docType = btn.getAttribute('data-type');
                await this.navigateTo('document-editor', { id, type: docType });
            });
        });

        document.querySelectorAll('.delete-doc-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                this.confirmDelete('Voulez-vous vraiment supprimer cet élément ? Cette action est irréversible.', async () => {
                    await store.deleteDocument(id);
                    this.showToast('Document supprimÃ© avec succÃ¨s');
                    await this.renderDocumentsListView(type, title, subtitle);
                });
            });
        });
    }


    /* ==========================================================================
       UNIFIED DOCUMENT EDITOR (Devis / Facture / BC)
       ========================================================================== */
    async setupDocumentEditor(type, docId = null) {
        const org = store.getOrganization();
        const clients = await store.getClients();

        let doc = null;
        if (docId) {
            doc = await store.getDocumentById(docId);
        }

        const isEdit = !!doc;
        this.editingDocType = doc ? doc.type : type;

        const defaultPrefix = getDefaultPrefix(this.editingDocType);
        const prefix = this.editingDocType === 'quote' ? org.quotePrefix : (this.editingDocType === 'invoice' ? org.invoicePrefix : org.purchaseOrderPrefix);
        const docsOfType = await store.getDocuments(this.editingDocType);
        const nextSeq = getNextSequenceNumber(docsOfType, this.editingDocType, prefix);
        const autoNumber = isEdit ? doc.number : formatDocumentNumber(prefix, new Date().getFullYear(), nextSeq);

        this.editingItems = isEdit ? [...doc.items] : [
            { id: 'it_new_1', reference: '', designation: '', quantity: 1, unitPrice: 0 }
        ];

        const titles = { quote: 'Devis', invoice: 'Facture', purchase_order: 'Bon de Commande' };

        const html = `
            <div class="page-header">
                <div class="page-title">
                    <h2>${isEdit ? 'Modifier' : 'CrÃ©er un'} ${titles[this.editingDocType]}</h2>
                    <p>Formulaire rÃ©utilisable avec calculs TVA et totaux FCFA en temps rÃ©el.</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-secondary" id="cancelEditBtn">Annuler</button>
                    <button class="btn btn-primary" id="saveDocBtn">
                        <i class="ri-save-line"></i> ${isEdit ? 'Enregistrer les modifications' : 'CrÃ©er le document'}
                    </button>
                </div>
            </div>

            <form id="docEditorForm">
                <div class="card" style="padding: 1.5rem;">
                    <div class="form-grid">
                        <div class="col-4 form-group">
                            <label>Type de Document</label>
                            <select class="form-control" id="docTypeSelect" ${isEdit ? 'disabled' : ''}>
                                <option value="invoice" ${this.editingDocType === 'invoice' ? 'selected' : ''}>Facture</option>
                                <option value="quote" ${this.editingDocType === 'quote' ? 'selected' : ''}>Devis Commercial</option>
                                <option value="purchase_order" ${this.editingDocType === 'purchase_order' ? 'selected' : ''}>Bon de Commande</option>
                            </select>
                        </div>

                        <div class="col-4 form-group">
                            <label>NÂ° de Document</label>
                            <input type="text" class="form-control" id="docNumberInput" value="${autoNumber}" required>
                        </div>

                        <div class="col-4 form-group">
                            <label>Client Partner</label>
                            <div style="display:flex; gap:0.5rem;">
                                <select class="form-control" id="docClientSelect" required>
                                    <option value="">-- SÃ©lectionner un Client --</option>
                                    ${clients.map(c => `<option value="${c.id}" ${doc && doc.clientId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                                </select>
                                <button type="button" class="btn btn-secondary" id="quickAddClientBtn" title="Ajouter Client">
                                    <i class="ri-user-add-line"></i>
                                </button>
                            </div>
                        </div>

                        <div class="col-4 form-group">
                            <label>Date d'Ã‰mission</label>
                            <input type="date" class="form-control" id="docIssueDate" value="${doc ? doc.issueDate : new Date().toISOString().split('T')[0]}" required>
                        </div>

                        <div class="col-4 form-group">
                            <label>Date d'Ã‰chÃ©ance</label>
                            <input type="date" class="form-control" id="docDueDate" value="${doc ? doc.dueDate : new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]}">
                        </div>

                        <div class="col-4 form-group">
                            <label>Statut</label>
                            <select class="form-control" id="docStatusSelect">
                                <option value="draft" ${doc && doc.status === 'draft' ? 'selected' : ''}>Brouillon</option>
                                <option value="sent" ${!doc || doc.status === 'sent' ? 'selected' : ''}>EnvoyÃ© / Ã‰mis</option>
                                ${this.editingDocType === 'invoice' ? `
                                    <option value="partially_paid" ${doc && doc.status === 'partially_paid' ? 'selected' : ''}>Partiellement payÃ©e</option>
                                    <option value="paid" ${doc && doc.status === 'paid' ? 'selected' : ''}>PayÃ©e</option>
                                ` : ''}
                            </select>
                        </div>
                    </div>
                </div>

                <div class="card" style="padding: 1.5rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <h3 style="font-size:1.1rem; font-weight:700;">Lignes de Facturation</h3>
                        <button type="button" class="btn btn-secondary btn-sm" id="addItemLineBtn">
                            <i class="ri-add-line"></i> Ajouter une ligne
                        </button>
                    </div>

                    <div class="table-responsive">
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th style="width: 15%;">RÃ©f.</th>
                                    <th style="width: 45%;">DÃ©signation des Prestations / Articles</th>
                                    <th style="width: 10%;">QtÃ©</th>
                                    <th style="width: 15%;">Prix Unitaire (FCFA)</th>
                                    <th style="width: 15%;">Total Ligne (FCFA)</th>
                                    <th style="width: 5%;"></th>
                                </tr>
                            </thead>
                            <tbody id="itemsContainer">
                                <!-- Dynamic Rows -->
                            </tbody>
                        </table>
                    </div>

                    <div style="display:flex; justify-content:space-between; margin-top:2rem; flex-wrap:wrap; gap:2rem;">
                        <div style="flex:1; min-width:300px;" class="form-group">
                            <label>Notes & Conditions LÃ©gales</label>
                            <textarea class="form-control" id="docNotes" rows="4" placeholder="Ex: RÃ¨glement par virement bancaire sur le compte CBAO Senegalese...">${doc ? doc.notes : (org.defaultNotes !== undefined ? org.defaultNotes : "RÃ¨glement Ã  rÃ©ception par virement ou chÃ¨que Ã  l'ordre de " + org.name)}</textarea>
                        </div>

                        <div style="width:340px;">
                            <div class="totals-summary">
                                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem;">
                                    <label style="font-weight:700; font-size:0.875rem;">Appliquer la TVA (18%)</label>
                                    <input type="checkbox" id="docApplyVat" ${!doc || doc.applyVat ? 'checked' : ''} style="width:20px; height:20px; accent-color:var(--color-primary); cursor:pointer;">
                                </div>
                                <div class="totals-row">
                                    <span>Sous-Total HT</span>
                                    <strong id="summarySubtotal">0 FCFA</strong>
                                </div>
                                <div class="totals-row" id="vatRow">
                                    <span>TVA (${org.defaultVatRate || 18}%)</span>
                                    <strong id="summaryVat">0 FCFA</strong>
                                </div>
                                <div class="totals-row grand-total">
                                    <span>Net Ã  Payer TTC</span>
                                    <strong id="summaryTotal">0 FCFA</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        `;

        document.getElementById('mainContent').innerHTML = html;

        this.renderItemRows();
        this.recalculateEditorTotals();

        // Event listeners inside Editor
        document.getElementById('addItemLineBtn').addEventListener('click', async () => {
            this.editingItems.push({ id: 'it_new_' + Date.now(), reference: '', designation: '', quantity: 1, unitPrice: 0 });
            this.renderItemRows();
            this.recalculateEditorTotals();
        });

        document.getElementById('docApplyVat').addEventListener('change', async () => {
            this.recalculateEditorTotals();
        });

        document.getElementById('docTypeSelect').addEventListener('change', async (e) => {
            this.editingDocType = e.target.value;
            const newPrefix = this.editingDocType === 'quote' ? org.quotePrefix : (this.editingDocType === 'invoice' ? org.invoicePrefix : org.purchaseOrderPrefix);
            const docsOfType = await store.getDocuments(this.editingDocType);
            const nextSeq = getNextSequenceNumber(docsOfType, this.editingDocType, newPrefix);
            document.getElementById('docNumberInput').value = formatDocumentNumber(newPrefix, new Date().getFullYear(), nextSeq);
        });

        document.getElementById('quickAddClientBtn').addEventListener('click', async () => {
            document.getElementById('clientForm').reset();
            document.getElementById('clientModal').classList.add('active');
        });

        document.getElementById('cancelEditBtn').addEventListener('click', async () => {
            await this.navigateTo(this.editingDocType === 'quote' ? 'devis' : (this.editingDocType === 'invoice' ? 'factures' : 'bons-de-commande'));
        });

        document.getElementById('saveDocBtn').addEventListener('click', async (e) => {
            e.preventDefault();
            this.saveDocumentFromEditor(docId);
        });
    }

    renderItemRows() {
        const container = document.getElementById('itemsContainer');
        if (!container) return;

        container.innerHTML = this.editingItems.map((item, index) => `
            <tr>
                <td>
                    <input type="text" class="form-control item-ref" data-index="${index}" value="${item.reference || ''}" placeholder="Ex: DEV-01">
                </td>
                <td>
                    <input type="text" class="form-control item-des" data-index="${index}" value="${item.designation || ''}" placeholder="Description dÃ©taillÃ©e..." required>
                </td>
                <td>
                    <input type="number" min="1" class="form-control item-qty" data-index="${index}" value="${item.quantity}" style="text-align:center;" required>
                </td>
                <td>
                    <input type="number" min="0" step="1" class="form-control item-price" data-index="${index}" value="${item.unitPrice}" required>
                </td>
                <td>
                    <strong class="item-total-val" data-index="${index}">${formatFCFA(roundXOF(item.quantity * item.unitPrice))}</strong>
                </td>
                <td style="text-align:center;">
                    ${this.editingItems.length > 1 ? `
                        <button type="button" class="btn btn-ghost btn-sm remove-item-btn" data-index="${index}" style="color:var(--color-danger);">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

        // Bind inputs
        container.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', async (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'), 10);
                if (e.target.classList.contains('item-ref')) this.editingItems[idx].reference = e.target.value;
                if (e.target.classList.contains('item-des')) this.editingItems[idx].designation = e.target.value;
                if (e.target.classList.contains('item-qty')) this.editingItems[idx].quantity = Number(e.target.value);
                if (e.target.classList.contains('item-price')) this.editingItems[idx].unitPrice = Number(e.target.value);

                const lineTot = roundXOF(this.editingItems[idx].quantity * this.editingItems[idx].unitPrice);
                const totEl = container.querySelector(`.item-total-val[data-index="${idx}"]`);
                if (totEl) totEl.textContent = formatFCFA(lineTot);

                this.recalculateEditorTotals();
            });
        });

        container.querySelectorAll('.remove-item-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                this.editingItems.splice(idx, 1);
                this.renderItemRows();
                this.recalculateEditorTotals();
            });
        });
    }

    recalculateEditorTotals() {
        const applyVat = document.getElementById('docApplyVat') ? document.getElementById('docApplyVat').checked : true;
        const org = store.getOrganization();
        const totals = calculateDocumentTotals(this.editingItems, applyVat, org.defaultVatRate || 18);

        const subEl = document.getElementById('summarySubtotal');
        const vatEl = document.getElementById('summaryVat');
        const totEl = document.getElementById('summaryTotal');
        const vatRow = document.getElementById('vatRow');

        if (subEl) subEl.textContent = formatFCFA(totals.subtotal);
        if (vatEl) vatEl.textContent = formatFCFA(totals.vatAmount);
        if (totEl) totEl.textContent = formatFCFA(totals.total);
        if (vatRow) vatRow.style.display = applyVat ? 'flex' : 'none';
    }

    async saveDocumentFromEditor(existingId = null) {
        const clientSelect = document.getElementById('docClientSelect');
        if (!clientSelect.value) {
            alert('Veuillez sÃ©lectionner un client.');
            return;
        }

        const docData = {
            id: existingId || null,
            type: this.editingDocType,
            number: document.getElementById('docNumberInput').value,
            clientId: clientSelect.value,
            issueDate: document.getElementById('docIssueDate').value,
            dueDate: document.getElementById('docDueDate').value,
            status: document.getElementById('docStatusSelect').value,
            applyVat: document.getElementById('docApplyVat').checked,
            vatRate: store.getOrganization().defaultVatRate || 18,
            notes: document.getElementById('docNotes').value,
            items: this.editingItems,
            amountPaid: existingId ? (await store.getDocumentById(existingId)?.amountPaid || 0) : 0
        };

        const saved = await store.saveDocument(docData);
        this.showToast(`Document ${saved.number} enregistrÃ© avec succÃ¨s !`);
        await this.navigateTo('document-view', { id: saved.id });
    }

    /* ==========================================================================
       DOCUMENT VIEW & PRINTABLE LAYOUT
       ========================================================================== */
    async renderDocumentView(id) {
        const doc = await store.getDocumentById(id);
        if (!doc) {
            await this.navigateTo('dashboard');
            return;
        }

        const org = store.getOrganization();
        const statusInfo = getDocumentStatusInfo(doc.status, doc.total, doc.amountPaid || 0, doc.dueDate);
        const remaining = calculateRemainingAmount(doc.total, doc.amountPaid || 0);

        const titles = { quote: 'Devis Commercial', invoice: 'Facture', purchase_order: 'Bon de Commande' };

        const html = `
            <div class="page-header no-print">
                <div class="page-title">
                    <h2>${doc.number}</h2>
                    <p>AperÃ§u et gestion de document officiel.</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-secondary" id="backToListBtn">
                        <i class="ri-arrow-left-line"></i> Retour
                    </button>
                    <div style="display:flex; align-items:center; gap:0.5rem; background:white; padding:0.2rem 0.6rem; border-radius:var(--radius-full); border:1px solid var(--color-border);">
                        <span style="font-size:0.8rem; font-weight:700; color:var(--color-text-muted);">Statut :</span>
                        ${this.renderStatusSelectorHTML(doc)}
                    </div>
                    ${doc.type === 'invoice' && doc.status !== 'paid' ? `
                        <button class="btn btn-primary" id="markPaidQuickBtn">
                            <i class="ri-checkbox-circle-line"></i> Marquer comme PayÃ©e
                        </button>
                    ` : ''}
                    ${doc.type === 'quote' ? `
                        <button class="btn btn-primary" id="convertToPOBtn" style="margin-right: 0.5rem;">
                            <i class="ri-file-list-3-line"></i> Convertir en Bon de Commande
                        </button>
                        <button class="btn btn-secondary" id="convertToInvoiceBtn">
                            <i class="ri-exchange-dollar-line"></i> Convertir en Facture
                        </button>
                    ` : ''}
                    ${doc.type === 'purchase_order' ? `
                        <button class="btn btn-primary" id="convertToInvoiceBtn">
                            <i class="ri-exchange-dollar-line"></i> Convertir en Facture
                        </button>
                    ` : ''}
                    ${doc.type === 'invoice' && remaining > 0 ? `
                        <button class="btn btn-secondary" id="addPaymentBtn">
                            <i class="ri-wallet-line"></i> Enregistrer un RÃ¨glement
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary" id="printDocBtn">
                        <i class="ri-printer-line"></i> Imprimer / PDF
                    </button>
                </div>
            </div>

            <div class="print-container">
                <div class="print-header">
                    <div>
                        <div class="print-org-name">${org.name}</div>
                        <div class="print-legal-info">
                            ${org.address}<br>
                            TÃ©l : ${org.phone} | Email : ${org.email}<br>
                            ${org.ninea ? `<strong>NINEA :</strong> ${org.ninea}` : ''} 
                            ${org.rccm ? ` | <strong>RCCM :</strong> ${org.rccm}` : ''}
                        </div>
                    </div>
                    <div class="print-doc-title">
                        <h2>${titles[doc.type]}</h2>
                        <div class="print-doc-number">${doc.number}</div>
                        <div style="margin-top:0.5rem;">${this.renderStatusSelectorHTML(doc)}</div>
                    </div>
                </div>

                <div class="print-addresses">
                    <div class="address-box">
                        <h4>Ã‰mis par</h4>
                        <strong>${org.name}</strong><br>
                        ${org.address}<br>
                        ${org.email}
                    </div>
                    <div class="address-box">
                        <h4>DestinÃ© Ã  (Client)</h4>
                        <strong>${doc.client ? doc.client.name : 'â€”'}</strong><br>
                        ${doc.client ? doc.client.address : ''}<br>
                        ${doc.client ? `TÃ©l: ${doc.client.phone} | Email: ${doc.client.email}` : ''}<br>
                        ${doc.client && doc.client.ninea ? `<strong>NINEA Client :</strong> ${doc.client.ninea}` : ''}
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; margin-bottom:1.5rem; font-size:0.875rem;">
                    <div><strong>Date d'Ã‰mission :</strong> ${doc.issueDate}</div>
                    <div><strong>Date d'Ã‰chÃ©ance :</strong> ${doc.dueDate || 'Ã€ rÃ©ception'}</div>
                </div>

                <table class="custom-table" style="margin-bottom:2rem;">
                    <thead>
                        <tr>
                            <th>RÃ©f.</th>
                            <th>DÃ©signation</th>
                            <th style="text-align:center;">QtÃ©</th>
                            <th style="text-align:right;">Prix Unitaire</th>
                            <th style="text-align:right;">Montant Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${doc.items.map(item => `
                            <tr>
                                <td><code>${item.reference || 'â€”'}</code></td>
                                <td><strong>${item.designation}</strong></td>
                                <td style="text-align:center;">${item.quantity}</td>
                                <td style="text-align:right;">${formatFCFA(item.unitPrice)}</td>
                                <td style="text-align:right;"><strong>${formatFCFA(item.quantity * item.unitPrice)}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div style="max-width:50%; font-size:0.85rem; color:var(--color-text-muted);">
                        <strong>Notes / Mentions :</strong><br>
                        ${doc.notes || 'Merci pour votre confiance.'}
                    </div>

                    <div style="width:300px;" class="totals-summary">
                        <div class="totals-row">
                            <span>Sous-Total HT</span>
                            <strong>${formatFCFA(doc.subtotal)}</strong>
                        </div>
                        ${doc.applyVat ? `
                            <div class="totals-row">
                                <span>TVA (${doc.vatRate}%)</span>
                                <strong>${formatFCFA(doc.vatAmount)}</strong>
                            </div>
                        ` : ''}
                        <div class="totals-row grand-total">
                            <span>Total TTC</span>
                            <strong>${formatFCFA(doc.total)}</strong>
                        </div>
                        ${doc.type === 'invoice' ? `
                            <div class="totals-row" style="margin-top:0.5rem; padding-top:0.5rem; border-top:1px dashed var(--color-border);">
                                <span>Montant RÃ©glÃ©</span>
                                <strong style="color:var(--color-success);">${formatFCFA(doc.amountPaid || 0)}</strong>
                            </div>
                            <div class="totals-row">
                                <span>Reste Ã  Payer</span>
                                <strong style="color:var(--color-danger);">${formatFCFA(remaining)}</strong>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;

        document.getElementById('backToListBtn').addEventListener('click', async () => {
            await this.navigateTo(doc.type === 'quote' ? 'devis' : (doc.type === 'invoice' ? 'factures' : 'bons-de-commande'));
        });

        document.getElementById('printDocBtn').addEventListener('click', async () => {
            window.print();
        });

        const markPaidQuick = document.getElementById('markPaidQuickBtn');
        if (markPaidQuick) {
            markPaidQuick.addEventListener('click', async () => {
                await store.updateDocumentStatus(doc.id, 'paid');
                this.showToast(`Facture ${doc.number} marquÃ©e comme PayÃ©e Ã  100% !`);
                await this.renderDocumentView(doc.id);
            });
        }

        this.bindTableActionEvents();


        const addPayBtn = document.getElementById('addPaymentBtn');
        if (addPayBtn) {
            addPayBtn.addEventListener('click', async () => {
                document.getElementById('paymentDocId').value = doc.id;
                document.getElementById('paymentAmount').value = remaining;
                document.getElementById('paymentModal').classList.add('active');
            });
        }

        const convertToInvoiceBtn = document.getElementById('convertToInvoiceBtn');
        if (convertToInvoiceBtn) {
            convertToInvoiceBtn.addEventListener('click', async () => {
                const invPrefix = org.invoicePrefix;
                const invoices = await store.getDocuments('invoice');
                const nextSeq = getNextSequenceNumber(invoices, 'invoice', invPrefix);
                const invNumber = formatDocumentNumber(invPrefix, new Date().getFullYear(), nextSeq);

                const sourceName = doc.type === 'quote' ? 'devis' : 'bon de commande';

                const newInvoice = {
                    type: 'invoice',
                    number: invNumber,
                    clientId: doc.clientId,
                    issueDate: new Date().toISOString().split('T')[0],
                    dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
                    status: 'sent',
                    applyVat: doc.applyVat,
                    vatRate: doc.vatRate,
                    notes: `Facture gÃ©nÃ©rÃ©e Ã  partir du ${sourceName} NÂ° ${doc.number}.`,
                    convertedFromId: doc.id,
                    items: [...doc.items],
                    amountPaid: 0
                };

                const saved = await store.saveDocument(newInvoice);
                this.showToast(`Converti avec succÃ¨s en Facture ${saved.number} !`);
                await this.navigateTo('document-view', { id: saved.id });
            });
        }

        const convertToPOBtn = document.getElementById('convertToPOBtn');
        if (convertToPOBtn) {
            convertToPOBtn.addEventListener('click', async () => {
                const poPrefix = org.purchaseOrderPrefix;
                const pos = await store.getDocuments('purchase_order');
                const nextSeq = getNextSequenceNumber(pos, 'purchase_order', poPrefix);
                const poNumber = formatDocumentNumber(poPrefix, new Date().getFullYear(), nextSeq);

                const newPO = {
                    type: 'purchase_order',
                    number: poNumber,
                    clientId: doc.clientId,
                    issueDate: new Date().toISOString().split('T')[0],
                    status: 'sent',
                    applyVat: doc.applyVat,
                    vatRate: doc.vatRate,
                    notes: `Bon de commande gÃ©nÃ©rÃ© Ã  partir du devis NÂ° ${doc.number}.`,
                    convertedFromId: doc.id,
                    items: [...doc.items],
                    amountPaid: 0
                };

                const saved = await store.saveDocument(newPO);
                this.showToast(`Devis ${doc.number} converti avec succÃ¨s en Bon de Commande ${saved.number} !`);
                await this.navigateTo('document-view', { id: saved.id });
            });
        }
    }

    /* ==========================================================================
       CLIENTS VIEW
       ========================================================================== */
    async renderClientsView(searchQuery = '') {
        let clients = await store.getClients();
        const docs = await store.getDocuments();

        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            clients = clients.filter(c => 
                (c.name && c.name.toLowerCase().includes(lowerQ)) ||
                (c.email && c.email.toLowerCase().includes(lowerQ)) ||
                (c.phone && c.phone.toLowerCase().includes(lowerQ)) ||
                (c.ninea && c.ninea.toLowerCase().includes(lowerQ)) ||
                (c.rccm && c.rccm.toLowerCase().includes(lowerQ))
            );
        }

        const html = `
            <div class="page-header">
                <div class="page-title">
                    <h2>RÃ©pertoire Clients</h2>
                    <p>Gestion de vos clients partenaires, contacts et coordonnÃ©es fiscales.</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-primary" id="addNewClientBtn">
                        <i class="ri-user-add-line"></i> Nouveau Client
                    </button>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">
                        <h3>Liste des Clients</h3>
                    </div>
                </div>
                <div style="overflow-x:auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead>
                            <tr>
                                <th style="padding: 1rem; border-bottom: 1px solid var(--color-border); background: var(--color-surface-hover); color: var(--color-text-muted); font-size: 0.75rem; text-transform: uppercase;">Client</th>
                                <th style="padding: 1rem; border-bottom: 1px solid var(--color-border); background: var(--color-surface-hover); color: var(--color-text-muted); font-size: 0.75rem; text-transform: uppercase;">Contact</th>
                                <th style="padding: 1rem; border-bottom: 1px solid var(--color-border); background: var(--color-surface-hover); color: var(--color-text-muted); font-size: 0.75rem; text-transform: uppercase;">Total FacturÃ©</th>
                                <th style="padding: 1rem; border-bottom: 1px solid var(--color-border); background: var(--color-surface-hover); color: var(--color-text-muted); font-size: 0.75rem; text-transform: uppercase; text-align: right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${clients.length > 0 ? clients.map(cli => {
                                const clientDocs = docs.filter(d => d.clientId === cli.id);
                                const totalBilled = clientDocs.reduce((acc, d) => acc + (d.type === 'invoice' ? d.total : 0), 0);
                                return `
                                <tr>
                                    <td style="padding: 1rem; border-bottom: 1px solid var(--color-border);">
                                        <div style="font-weight: 600; color: var(--color-navy);">${cli.name}</div>
                                        <div style="font-size: 0.8rem; color: var(--color-text-muted);">${cli.ninea ? 'NINEA: ' + cli.ninea : ''} ${cli.rccm ? '| RCCM: ' + cli.rccm : ''}</div>
                                    </td>
                                    <td style="padding: 1rem; border-bottom: 1px solid var(--color-border);">
                                        <div style="font-size: 0.85rem;"><i class="ri-mail-line"></i> ${cli.email}</div>
                                        <div style="font-size: 0.85rem;"><i class="ri-phone-line"></i> ${cli.phone}</div>
                                    </td>
                                    <td style="padding: 1rem; border-bottom: 1px solid var(--color-border); font-weight: 600;">
                                        ${formatFCFA(totalBilled)}
                                    </td>
                                    <td style="padding: 1rem; border-bottom: 1px solid var(--color-border); text-align: right; white-space: nowrap;">
                                        <button class="btn btn-ghost btn-sm edit-client-btn" data-id="${cli.id}" title="Modifier">
                                            <i class="ri-edit-line"></i>
                                        </button>
                                        <button class="btn btn-ghost btn-sm delete-client-btn" data-id="${cli.id}" title="Supprimer" style="color: var(--color-danger);">
                                            <i class="ri-delete-bin-line"></i>
                                        </button>
                                    </td>
                                </tr>
                                `;
                            }).join('') : `<tr><td colspan="4" style="padding: 2rem; text-align: center; color: var(--color-text-muted);">Aucun client trouvÃ©.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;

        document.getElementById('addNewClientBtn').addEventListener('click', async () => {
            document.getElementById('clientForm').reset();
            document.querySelector('#clientForm input[name="id"]').value = '';
            document.getElementById('clientModal').classList.add('active');
        });

        document.querySelectorAll('.edit-client-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const cli = await store.getClientById(id);
                if (cli) {
                    const form = document.getElementById('clientForm');
                    form.querySelector('input[name="id"]').value = cli.id;
                    form.querySelector('input[name="name"]').value = cli.name;
                    form.querySelector('input[name="email"]').value = cli.email;
                    form.querySelector('input[name="phone"]').value = cli.phone;
                    form.querySelector('input[name="ninea"]').value = cli.ninea || '';
                    form.querySelector('input[name="rccm"]').value = cli.rccm || '';
                    form.querySelector('textarea[name="address"]').value = cli.address;
                    document.getElementById('clientModal').classList.add('active');
                }
            });
        });

        document.querySelectorAll('.delete-client-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                this.confirmDelete('Voulez-vous vraiment supprimer cet élément ? Cette action est irréversible.', async () => {
                    await store.deleteClient(id);
                    this.showToast('Client supprimÃ© avec succÃ¨s');
                    await this.renderClientsView(document.getElementById('globalSearch')?.value || '');
                });
            });
        });
    }

    /* ==========================================================================
       ORGANIZATION SETTINGS VIEW
       ========================================================================== */
    async renderSettingsView() {
        const org = store.getOrganization();

        const html = `
            <div class="page-header">
                <div class="page-title">
                    <h2>ParamÃ¨tres de l'Entreprise</h2>
                    <p>Configurez l'identitÃ© de votre PME, mentions lÃ©gales (NINEA/RCCM) et prÃ©fixes de facturation.</p>
                </div>
            </div>

            <div class="card" style="padding: 2rem; max-width: 900px;">
                <form id="settingsForm">
                    <div class="form-grid">
                        <div class="col-6 form-group">
                            <label>Raison Sociale de l'Entreprise</label>
                            <input type="text" name="name" class="form-control" value="${org.name}" required>
                        </div>

                        <div class="col-6 form-group">
                            <label>Adresse Email de Contact</label>
                            <input type="email" name="email" class="form-control" value="${org.email}" required>
                        </div>

                        <div class="col-6 form-group">
                            <label>TÃ©lÃ©phone Professionnel</label>
                            <input type="text" name="phone" class="form-control" value="${org.phone}" required>
                        </div>

                        <div class="col-6 form-group">
                            <label>TVA par DÃ©faut (%)</label>
                            <input type="number" name="defaultVatRate" class="form-control" value="${org.defaultVatRate || 18}" required>
                        </div>

                        <div class="col-6 form-group">
                            <label>NÂ° NINEA (SÃ©nÃ©gal) ou IFU (BÃ©nin / Togo)</label>
                            <input type="text" name="ninea" class="form-control" value="${org.ninea || ''}">
                        </div>

                        <div class="col-6 form-group">
                            <label>NÂ° Registre du Commerce (RCCM)</label>
                            <input type="text" name="rccm" class="form-control" value="${org.rccm || ''}">
                        </div>

                        <div class="col-12 form-group">
                            <label>Adresse du SiÃ¨ge Social</label>
                            <textarea name="address" class="form-control" rows="2" required>${org.address}</textarea>
                        </div>

                        <div class="col-12 form-group">
                            <label>Mentions LÃ©gales & Notes par DÃ©faut (Factures & Devis)</label>
                            <textarea name="defaultNotes" class="form-control" rows="3" placeholder="Ex: RÃ¨glement Ã  rÃ©ception par virement...">${org.defaultNotes !== undefined ? org.defaultNotes : "RÃ¨glement Ã  rÃ©ception par virement ou chÃ¨que Ã  l'ordre de " + org.name}</textarea>
                        </div>

                        <div class="col-12" style="margin-top:1rem; padding-top:1rem; border-top:1px solid var(--color-border);">
                            <h4 style="font-weight:700; margin-bottom:1rem;">PrÃ©fixes de NumÃ©rotation</h4>
                        </div>

                        <div class="col-4 form-group">
                            <label>PrÃ©fixe Devis</label>
                            <input type="text" name="quotePrefix" class="form-control" value="${org.quotePrefix || 'DEV'}">
                        </div>

                        <div class="col-4 form-group">
                            <label>PrÃ©fixe Factures</label>
                            <input type="text" name="invoicePrefix" class="form-control" value="${org.invoicePrefix || 'FAC'}">
                        </div>

                        <div class="col-4 form-group">
                            <label>PrÃ©fixe Bons de Commande</label>
                            <input type="text" name="purchaseOrderPrefix" class="form-control" value="${org.purchaseOrderPrefix || 'BC'}">
                        </div>
                    </div>

                    <div style="margin-top:2rem; display:flex; justify-content:flex-end;">
                        <button type="submit" class="btn btn-primary">
                            <i class="ri-save-line"></i> Enregistrer les ParamÃ¨tres
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;
        this.bindEvents();
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    window.app = new App();
});





