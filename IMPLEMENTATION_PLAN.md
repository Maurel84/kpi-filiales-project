# Plan d'Implémentation Détaillé
## Application Multi-Filiales

---

## Phase 1 : Infrastructure & Fondations (COMPLÉTÉ)

### Base de Données Supabase
- [x] Architecture complète avec 15 tables
- [x] Row Level Security (RLS) sur toutes les tables
- [x] Triggers pour calculs automatiques
- [x] Index de performance
- [x] 9 filiales pré-configurées
- [x] Données de test (articles, etc.)

### Frontend React
- [x] Configuration TypeScript
- [x] Authentification Supabase
- [x] Layout responsive avec sidebar
- [x] Gestion des rôles utilisateurs
- [x] Dashboard principal
- [x] Module KPIs avec workflow
- [x] Module Stocks avec alertes obsolescence
- [x] Module Ventes avec calcul de marges

---

## Phase 2 : Modules Opérationnels (À DÉVELOPPER)

### 2.1 Ventes Perdues (Priorité HAUTE)
**Objectif** : Capturer et analyser les opportunités non concrétisées

#### Fonctionnalités
- Formulaire de déclaration de vente perdue
- Champs : Client potentiel, montant estimé, motif, concurrent
- Motifs : Prix, Délai, Concurrent, Produit inadéquat, Budget client, Autre
- Analyse par motif de perte
- Suivi du taux de conversion

#### Interface
```typescript
// Composant : VentesPerduesView.tsx
- Tableau avec filtres (motif, période, commercial)
- Graphique : Répartition des motifs de perte
- KPI : Taux de perte (ventes perdues / opportunités totales)
- Formulaire modal pour saisie rapide
```

#### Intégration Power BI
- Analyse des concurrents les plus présents
- Évolution des motifs dans le temps
- Segmentation par pays/filiale

**Durée estimée** : 2-3 jours

---

### 2.2 Commandes Fournisseurs (Priorité HAUTE)
**Objectif** : Gérer le cycle complet de commande

#### Fonctionnalités
- Création de commande avec lignes multiples
- Suivi des livraisons partielles
- Réception et validation des entrées en stock
- Calcul automatique du prix de revient
- Alertes de retard de livraison

#### Workflow
```
1. Création commande → En_cours
2. Réception partielle → Partiellement_livree
3. Réception complète → Livree
   → Création automatique entrées_stock
   → Validation obligatoire (prix achat HT + coefficient)
   → Mise à jour stock_items
```

#### Validations
- Prix d'achat HT OBLIGATOIRE
- Coefficient prix de revient OBLIGATOIRE
- Pas d'entrée en stock sans ces données

**Durée estimée** : 4-5 jours

---

### 2.3 Parc Machines (Priorité MOYENNE)
**Objectif** : Suivi géolocalisé du parc machines clients

#### Fonctionnalités
- Carte interactive avec markers par pays
- Fiche machine complète (numéro série, client, date vente)
- Historique des inspections
- Statistiques par marque et pays
- Export Excel pour rapports

#### Vue Carte
```typescript
// Intégration Leaflet ou Google Maps
- Cluster par pays/ville
- Popup avec infos machine
- Filtres : marque, année, statut
- Légende : Actif, Inactif, Hors service
```

#### Statistiques
- Nombre de machines par pays
- Répartition par marque
- Âge moyen du parc
- Taux de couverture inspection

**Durée estimée** : 5-6 jours

---

### 2.4 Inspections Techniques (Priorité MOYENNE)
**Objectif** : Digitaliser les inspections et générer des devis

#### Fonctionnalités
- Formulaire d'inspection terrain (mobile-first)
- Sélection de la machine depuis le parc
- Liste d'anomalies (checkboxes + saisie libre)
- Recommandations de pièces
- Génération automatique de devis
- Upload de photos (stockage Supabase)

#### Workflow Devis
```
1. Inspection créée → À_établir
2. Devis généré → Envoye
3. Client accepte → Accepte (création commande auto)
4. Client refuse → Refuse
```

#### Mobile-First
- Capture photo directe
- Signature du client
- Mode offline avec sync

**Durée estimée** : 6-7 jours

---

### 2.5 Forecasts / Prévisions (Priorité HAUTE)
**Objectif** : Prévoir les ventes mensuelles par filiale

#### Fonctionnalités
- Calcul automatique basé sur :
  - Budget annuel (réparti mensuellement)
  - Commandes clients en cours
  - Historique des ventes (moyenne mobile)
- Ajustement manuel par General Manager
- Historique des modifications
- Comparaison Forecast vs Réalisé

#### Interface
```typescript
// Vue Manager Filiale
- Tableau : Mois | Budget | Commandes | Prévision auto | Ajustement GM | Final
- Graphique : Courbe prévisions vs réalisations
- Indicateur : Écart en % et en valeur

// Vue Admin Siège
- Consolidation toutes filiales
- Modification possible sur toutes lignes
- Verrouillage après clôture mensuelle
```

#### Alertes
- Écart > 20% entre forecast et réalisé
- Forecast non saisi à J-5 de fin de mois

**Durée estimée** : 4-5 jours

---

### 2.6 Budgets (Priorité HAUTE)
**Objectif** : Saisie et suivi des budgets annuels

#### Fonctionnalités
- Saisie par type : Ventes machines, Pièces, Services, Charges, Investissements
- Répartition mensuelle
- Comparaison Budget vs Réalisé
- Tableau de bord par filiale
- Consolidation siège

#### Types de Budgets
```
1. Ventes_machines : CA attendu machines neuves
2. Ventes_pieces : CA pièces détachées
3. Ventes_services : CA maintenance et réparations
4. Charges : Dépenses prévisionnelles
5. Investissements : CapEx planifiés
```

#### Rapports
- Budget annuel par filiale
- Réalisé vs Budget (mensuel et cumulé)
- Prévision d'atteinte des objectifs

**Durée estimée** : 3-4 jours

---

### 2.7 Sessions Interfiliales (Priorité MOYENNE)
**Objectif** : Transférer du stock entre filiales

#### Fonctionnalités
- Demande de transfert par filiale A
- Validation manager filiale A (origine)
- Validation manager filiale B (destination)
- Mise à jour automatique des stocks
- Suivi du statut : En_attente, Validee, Refusee, Recue

#### Workflow
```
1. Commercial filiale B cherche article non en stock
2. Voit que filiale A en a en stock
3. Crée session interfiliale
4. Manager A valide sortie de stock
5. Manager B valide réception
6. Stock_items mis à jour automatiquement
   - Filiale A : statut = Transfert
   - Filiale B : nouvelle ligne créée
```

#### Sécurité
- Pas de doublon de numéro de série
- Vérification disponibilité avant transfert
- Historique complet dans audit_log

**Durée estimée** : 4-5 jours

---

## Phase 3 : Automatisation Power Automate

### 3.1 Alertes à la Saisie
**Trigger** : Nouvelle ligne dans kpis_reporting ou ventes
**Action** :
- Envoi email au validateur (manager filiale)
- Notification Teams
- Inclure lien direct vers l'élément

### 3.2 Rappels Périodiques
**Trigger** : Scheduled (3 flows)
1. Début de mois : "Pensez à saisir vos KPIs"
2. Mi-mois : "50% du mois écoulé, vérifiez vos saisies"
3. J-3 fin de mois : "Derniers jours pour soumettre"

**Destinataires** : Managers filiales + commerciaux

### 3.3 Workflow de Validation
**Trigger** : Status passe à "Submitted"
**Action** :
- Email au manager avec boutons Approuver / Refuser
- Si approuvé → Status = Approved
- Si refusé → Status = Draft + commentaire obligatoire

### 3.4 Clôture Mensuelle Automatique
**Trigger** : 1er jour du mois à 00h01
**Actions** :
1. Vérifier que tous KPIs du mois précédent sont Approved
2. Si oui : Status = Closed pour tous
3. Si non : Email d'alerte au siège
4. Générer PDF de synthèse (voir 3.5)
5. Archiver dans SharePoint

### 3.5 Export PDF Automatique
**Méthode** :
```
Option 1 : HTML → PDF (gratuit)
- Créer template HTML avec données
- Power Automate : "Convert file" (OneDrive)
- Envoyer par email

Option 2 : Power BI Paginated Report (plus joli)
- Créer rapport paginé dans Power BI
- Export automatique via API
- Nécessite Power BI Premium
```

**Contenu PDF** :
- Résumé du mois par filiale
- KPIs principaux
- Ventes (nombre et montant)
- Stock (disponible, obsolète)
- Comparaison vs mois précédent

### 3.6 Réouverture par Siège
**Trigger** : Status passe à "Reopened_by_Mgmt"
**Action** :
- Email automatique à la filiale
- Explication de la réouverture
- Log dans audit_log avec raison

---

## Phase 4 : Intégration Power BI Pro

### 4.1 Connexion à Supabase
```
1. Ouvrir Power BI Desktop
2. Get Data → PostgreSQL
3. Server : iisxowebuecfwmsmfeqe.supabase.co
4. Database : postgres
5. Authentification : Clé de connexion Supabase
```

### 4.2 Modélisation de Données

#### Tables à Importer
- filiales
- kpis_reporting
- ventes
- ventes_perdues
- stock_items (+ articles)
- parc_machines
- inspections_techniques
- budgets
- forecasts

#### Relations
```
filiales (1) → (*) kpis_reporting
filiales (1) → (*) ventes
filiales (1) → (*) stock_items
articles (1) → (*) stock_items
articles (1) → (*) ventes
filiales (1) → (*) parc_machines
```

#### Table Calendrier
```dax
Date =
ADDCOLUMNS(
  CALENDAR(DATE(2020,1,1), DATE(2030,12,31)),
  "Année", YEAR([Date]),
  "Mois", MONTH([Date]),
  "MoisNom", FORMAT([Date], "MMMM"),
  "Trimestre", "T" & QUARTER([Date]),
  "Semaine", WEEKNUM([Date])
)
```

### 4.3 Mesures DAX Principales

#### Ventes
```dax
// Total des ventes
Total_Ventes = SUM(ventes[prix_vente_ht])

// Nombre de ventes
Nb_Ventes = COUNTROWS(ventes)

// Marge totale
Marge_Totale = SUM(ventes[marge])

// Taux de marge moyen
Taux_Marge_Moyen = DIVIDE([Marge_Totale], SUM(ventes[prix_revient]), 0) * 100

// Ventes mois précédent
Ventes_M-1 = CALCULATE([Total_Ventes], PREVIOUSMONTH('Date'[Date]))

// Évolution MoM
Evolution_MoM = DIVIDE([Total_Ventes] - [Ventes_M-1], [Ventes_M-1], 0)

// YTD
YTD_Ventes = TOTALYTD([Total_Ventes], 'Date'[Date])

// Ventes par commercial (Top 10)
Top10_Commerciaux =
CALCULATE(
  [Total_Ventes],
  TOPN(10, VALUES(ventes[commercial_id]), [Total_Ventes], DESC)
)
```

#### Stock
```dax
// Valeur du stock
Valeur_Stock = SUMX(stock_items, stock_items[quantite] * stock_items[prix_revient])

// Stock disponible
Stock_Disponible = CALCULATE(COUNTROWS(stock_items), stock_items[statut] = "Disponible")

// Stock obsolète (>12 mois)
Stock_Obsolete =
CALCULATE(
  COUNTROWS(stock_items),
  FILTER(
    stock_items,
    DATEDIFF(stock_items[date_entree], TODAY(), MONTH) > 12
  )
)

// Rotation du stock (en jours)
Rotation_Stock =
VAR VentesAnnuelles = CALCULATE([Total_Ventes], DATESINPERIOD('Date'[Date], TODAY(), -1, YEAR))
VAR StockMoyen = [Valeur_Stock]
RETURN
DIVIDE(StockMoyen, VentesAnnuelles / 365, 0)
```

#### KPIs
```dax
// KPIs en attente de validation
KPIs_En_Attente =
CALCULATE(
  COUNTROWS(kpis_reporting),
  kpis_reporting[status] IN {"Draft", "Submitted"}
)

// Taux de complétion KPIs
Taux_Completion_KPIs =
VAR Total = COUNTROWS(kpis_reporting)
VAR Completes = CALCULATE(COUNTROWS(kpis_reporting), kpis_reporting[status] IN {"Approved", "Closed"})
RETURN
DIVIDE(Completes, Total, 0)
```

#### Budget vs Réalisé
```dax
// Budget total
Budget_Total = SUM(budgets[montant])

// Écart Budget
Ecart_Budget = [Total_Ventes] - [Budget_Total]

// % Atteinte Budget
Pct_Atteinte_Budget = DIVIDE([Total_Ventes], [Budget_Total], 0)
```

### 4.4 Rapports à Créer

#### Rapport 1 : Vue Siège (Multi-Filiales)
**Pages** :
1. **Dashboard Exécutif**
   - KPIs principaux (ventes, marge, stock)
   - Graphique évolution mensuelle
   - Top 5 filiales
   - Alertes (stock obsolète, KPIs en attente)

2. **Ventes par Filiale**
   - Tableau comparatif toutes filiales
   - Graphique : Ventes par mois et par filiale
   - Carte : Ventes par pays
   - Drillthrough vers détail filiale

3. **Stock Consolidé**
   - Valeur totale du stock
   - Stock obsolète par filiale
   - Articles les plus stockés
   - Rotation du stock

4. **Analyse Marges**
   - Marge par filiale
   - Marge par catégorie produit
   - Évolution des marges dans le temps
   - Filiales avec marges faibles (<10%)

5. **Budget vs Réalisé**
   - Tableau par filiale
   - % d'atteinte des objectifs
   - Prévisions de fin d'année
   - Écarts significatifs

#### Rapport 2 : Vue Filiale
**Filtres permanents** : Filiale = [Filiale de l'utilisateur]
**Pages** :
1. **Mon Dashboard**
   - Mes ventes du mois
   - Mon stock disponible
   - Mes KPIs en attente
   - Mes objectifs

2. **Détail Ventes**
   - Liste des ventes
   - Ventes par commercial
   - Ventes par produit
   - Analyse client

3. **Gestion Stock**
   - Stock disponible
   - Stock obsolète (actions requises)
   - Valeur du stock
   - Articles à commander

4. **Parc Machines**
   - Machines vendues (carte)
   - Inspections réalisées
   - Devis en cours
   - Taux de conversion devis

#### Rapport 3 : Commercial (Mobile)
**Optimisé pour tablette/mobile**
**Pages** :
1. **Mes Ventes**
   - Ventes du mois
   - Mon objectif
   - Mes 5 dernières ventes

2. **Mes Clients**
   - Liste clients actifs
   - Machines installées
   - Prochaines échéances

3. **Stock Disponible**
   - Articles en stock
   - Prix de vente conseillé
   - Disponibilité immédiate

### 4.5 Row-Level Security (RLS) Power BI
Pour restreindre l'accès aux données par filiale :

```dax
// Table users (à créer dans Power BI ou importer de Supabase)
// user_email | filiale_id | role

// RLS sur table filiales
[filiale_id] = LOOKUPVALUE(
  users[filiale_id],
  users[user_email],
  USERPRINCIPALNAME()
)
|| LOOKUPVALUE(users[role], users[user_email], USERPRINCIPALNAME()) = "admin_siege"
```

**Configuration** :
1. Créer rôle "Manager_Filiale" avec ce filtre
2. Créer rôle "Admin_Siege" sans filtre
3. Assigner les utilisateurs aux rôles lors de la publication

### 4.6 Publication & Partage
1. Publier dans workspace Power BI Pro
2. Configurer actualisation automatique (quotidienne)
3. Créer des applications pour chaque audience
4. Partager avec les utilisateurs (licence Pro requise pour viewers)

**Alternative économique** :
- Publier sur Power BI Premium per capacity
- Les viewers n'ont pas besoin de licence Pro

---

## Phase 5 : Optimisations & Features Avancées

### 5.1 Performance
- [ ] Pagination côté serveur (React Query)
- [ ] Cache des données fréquentes
- [ ] Lazy loading des composants
- [ ] Optimisation des requêtes Supabase (indexes)

### 5.2 UX/UI
- [ ] Mode sombre
- [ ] Raccourcis clavier
- [ ] Undo/Redo pour éditions
- [ ] Drag & drop pour réorganiser

### 5.3 Notifications
- [ ] Centre de notifications in-app
- [ ] Push notifications (PWA)
- [ ] Email digest quotidien
- [ ] Badges de compteur

### 5.4 Export & Rapports
- [ ] Export Excel multi-onglets
- [ ] Génération PDF côté client
- [ ] Envoi automatique par email
- [ ] Templates personnalisables

### 5.5 Mobile App (PWA)
- [ ] Installation sur mobile
- [ ] Mode offline
- [ ] Sync automatique
- [ ] Capture photo native

### 5.6 API REST
- [ ] Endpoints publics pour intégrations
- [ ] Documentation Swagger
- [ ] Authentification par token
- [ ] Rate limiting

---

## Timeline Globale

### Sprint 1 (2 semaines) - Modules Opérationnels Core
- Ventes Perdues
- Commandes Fournisseurs
- Sessions Interfiliales

### Sprint 2 (2 semaines) - Modules Terrain
- Parc Machines avec carte
- Inspections Techniques
- Mobile PWA

### Sprint 3 (2 semaines) - Planification & Prévisions
- Forecasts
- Budgets
- Comparaisons Budget vs Réalisé

### Sprint 4 (1 semaine) - Power Automate
- Tous les flows
- Tests des notifications
- Export PDF mensuel

### Sprint 5 (1 semaine) - Power BI
- Modèle de données
- 3 rapports principaux
- RLS et publication

### Sprint 6 (1 semaine) - Tests & Déploiement
- Tests utilisateurs
- Corrections bugs
- Formation filiales
- Documentation finale
- Go-live

**Durée totale estimée : 9-10 semaines**

---

## Coûts Prévisionnels

### Infrastructure
- Supabase Pro : ~25$/mois (après le tier gratuit)
- Vercel Pro (si déploiement) : ~20$/mois
- Stockage fichiers (photos inspections) : ~10$/mois

### Microsoft 365
- Licences E3 : Déjà disponibles
- Power Apps via SharePoint : Inclus
- Power Automate : Version gratuite suffit pour début
- Power BI Pro : ~10$/user/mois (ou Premium per capacity ~5000$/mois)

### Ressources Humaines
- Développeur Full-Stack : 9-10 semaines
- Designer UX/UI : 1-2 semaines (si besoin)
- Formateur : 1 semaine (formation filiales)

**Coût total estimé infrastructure : ~55-75$/mois**
**Coût développement (externe) : ~15 000 - 25 000€** (selon localisation et expérience)

---

## Risques & Mitigation

### Risque 1 : Adoption Utilisateurs
**Mitigation** :
- Formation complète par filiale
- Champions locaux identifiés
- Support réactif les premières semaines
- Documentation pas-à-pas en français

### Risque 2 : Performance avec Gros Volumes
**Mitigation** :
- Indexation optimale dès le départ
- Pagination côté serveur
- Archivage données >2 ans
- Monitoring performances

### Risque 3 : Connexion Internet Instable (Afrique)
**Mitigation** :
- Mode offline PWA
- Sync en arrière-plan
- Compression des données
- Retry automatique

### Risque 4 : Évolution des Besoins
**Mitigation** :
- Architecture modulaire
- Base de données évolutive (Supabase)
- Code bien documenté
- Tests automatisés

---

## Support Post-Lancement

### Maintenance
- Corrections bugs : Sous 48h
- Évolutions mineures : Sprint mensuel
- Évolutions majeures : Roadmap trimestrielle

### Formation Continue
- Nouveaux utilisateurs : Formation à la demande
- Nouvelles features : Vidéos courtes + documentation

### Monitoring
- Uptime : Supabase gère (>99.9%)
- Logs d'erreurs : Sentry ou équivalent
- Analytics : Google Analytics ou Plausible

---

## Conclusion

Cette application constitue une **base solide et évolutive** pour la gestion multi-filiales. L'architecture choisie (Supabase + React + Power BI) offre :

- **Scalabilité** : Ajout de filiales facile
- **Sécurité** : RLS natif Supabase
- **Flexibilité** : Ajout de modules aisé
- **Performance** : Base PostgreSQL optimisée
- **Coût maîtrisé** : Pas de serveurs à gérer

Le plan détaillé ci-dessus permet une **mise en production progressive** avec des sprints courts et des livraisons fréquentes, réduisant les risques et permettant des ajustements rapides selon les retours terrain.

**Prêt pour Phase 2 !**
