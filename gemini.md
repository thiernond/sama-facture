# SAMA FACTURE - Résumé de l'Application

Ce document a été généré pour servir de référence globale sur l'architecture, les fonctionnalités et les choix de conception de l'application **SAMA FACTURE**. Il servira de base de connaissances pour tout futur modèle IA (ou développeur) amené à maintenir ou étendre l'application.

## 1. Fonctionnalités Globales
SAMA FACTURE est une application web Fintech de facturation pensée pour les PME. Elle fonctionne entièrement côté client via le `localStorage` (géré par `store.js`) et ne requiert actuellement aucun backend (Single Page Application en Vanilla JS).

**Principales fonctionnalités :**
- **Tableau de Bord** : Indicateurs clés (Chiffre d'affaires, En attente, Encaissé) et résumé des dernières activités.
- **Gestion des Clients (CRM léger)** : 
  - Liste sous forme de tableau (Nom, Contact, Total facturé, NINEA, RCCM).
  - Actions : Ajouter, Modifier, Supprimer (avec modale de confirmation personnalisée).
  - Recherche globale en temps réel.
- **Gestion des Documents** :
  - Création de **Devis**, **Bons de commande** et **Factures**.
  - Formulaire dynamique : ajout/suppression de lignes d'articles, calcul en temps réel des totaux (HT, TVA configurable, TTC).
  - **Conversion rapide** : 
    - Un Devis peut être converti en Facture ou en Bon de commande.
    - Un Bon de commande peut être converti en Facture.
  - Gestion des paiements (partiels ou intégraux) avec calcul automatique du reste à payer.
  - Changement rapide de statut (Envoyé, Payé, Annulé...).
  - Impression / Vue PDF (via le navigateur).
- **Paramétrage** : 
  - Informations de la PME (Nom, Adresse, NINEA, RCCM, Email, Tél).
  - Personnalisation des préfixes de numérotation (ex: FAC-, DEV-, BC-).
  - Paramétrage d'une note légale par défaut s'appliquant automatiquement à toute nouvelle création de document.
- **Divers** : 
  - Simulation "Vue Mobile" (iframe ou redimensionnement du container).
  - Notifications contextuelles (Toasts) lors d'actions réussies.

## 2. Les Différentes Rubriques (Vues)
L'application utilise un système de navigation interne simulé (`app.js` gère l'affichage/masquage des `#mainContent`).
- `dashboard` : Tableau de bord principal.
- `factures` : Liste des factures.
- `devis` : Liste des devis commerciaux.
- `bons-de-commande` : Liste des bons de commande.
- `clients` : Répertoire client.
- `parametres` : Paramètres de l'entreprise.
- `document-editor` : Interface unique de création/modification pour tout type de document.
- `document-view` : Aperçu en lecture seule et impression d'un document.

## 3. Design System & Esthétique
L'application a été développée avec l'impératif strict d'offrir une interface **Premium, moderne et esthétique**, avec des micro-interactions.

- **Stack** : Vanilla HTML5, CSS3, et Javascript. (Aucun framework comme Tailwind ou React n'est utilisé).
- **Couleurs (CSS Variables)** :
  - **Primary (Émeraude)** : `var(--color-primary)` (ex: boutons d'action principale, focus).
  - **Navy (Sombre)** : `var(--color-navy)` (utilisé pour la sidebar et les titres).
  - **Surface & Background** : Nuances de blanc et gris très clair pour faire ressortir les cartes.
  - **Texte** : `var(--color-text-main)` et `var(--color-text-muted)` pour la hiérarchie visuelle.
- **Typographie** : "Plus Jakarta Sans" ou police sans-serif moderne, pour un rendu propre et lisible.
- **Icônes** : Utilisation exclusive de **Remix Icon**.
- **Composants Standards** :
  - **Cartes (`.card`)** : Les blocs de contenu (tableaux, formulaires) doivent toujours être encapsulés dans une `.card` avec un `.card-header` et `.card-title`.
  - **Boutons (`.btn`)** : Déclinés en `.btn-primary` (vert), `.btn-secondary`, et `.btn-ghost` (transparent avec icône, idéal pour les actions sur les lignes de tableau).
  - **Formulaires (`.form-group`, `.form-control`)** : Les inputs doivent avoir des bordures douces, des placeholders clairs et un effet "focus" marqué avec la couleur primaire.
  - **Modales** : Surcouches opaques (`.modal-overlay`) avec cartes centrées pour les confirmations critiques (ex: `#deleteConfirmModal`).
  - **Tableaux (`table.custom-table`)** : Lignes aérées, textes secondaires en `text-muted`, scroll horizontal pour le mobile.

## 4. Guide / Instructions pour un Futur Modèle IA
Pour toute future mise à jour, un agent IA ou un développeur doit **impérativement** suivre ces règles :

1. **Architecture JS** : 
   - Toujours isoler la logique des données dans `store.js` (méthodes CRUD).
   - Manipuler le DOM via la classe `App` dans `app.js` (rendre les vues via des littéraux de gabarits (template literals), attacher les événements après le rendu).
2. **Utilisation des Outils** :
   - Éviter d'utiliser `cat` et `grep` dans des commandes bash. Préférer les outils natifs de l'agent (`view_file`, `grep_search`, `multi_replace_file_content`).
3. **Respect du Design** :
   - Ne jamais générer de blocs HTML "nus" ou non stylisés. Toujours utiliser les classes existantes (`.card`, `.btn-ghost`, etc.).
   - Lors de la création d'une nouvelle rubrique, s'inspirer de `renderClientsView` ou `renderDocumentsListView` pour l'en-tête de page (`.page-header`, `.page-title`) et les tableaux.
4. **Modales & Actions Critiques** :
   - Les suppressions ne doivent plus utiliser la fonction native `confirm()`. Il faut appeler `this.confirmDelete(message, callback)` définie dans `app.js`.
5. **Prévention d'Erreurs de Syntaxe** :
   - Lors de l'injection de code dynamique dans des template literals JS (`` ` ``), attention aux caractères d'échappement (ex: guillemets simples ou doubles). Utiliser de préférence les doubles guillemets (`" "`) pour les chaînes littérales à l'intérieur de blocs dynamiques (`${ }`) afin d'éviter les ruptures de string.
6. **Évolutivité** : 
   - Si un backend est ajouté plus tard, il suffira de remplacer les fonctions internes de `store.js` (qui interagissent actuellement avec `localStorage`) par des requêtes `fetch()` asynchrones.
