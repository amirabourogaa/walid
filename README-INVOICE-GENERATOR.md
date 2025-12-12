# Générateur de Factures Unifié - Arabe & Français

## 📋 Vue d'ensemble

Ce générateur de factures unifié permet de créer des factures professionnelles en **arabe** et en **français** avec une mise en page adaptative selon la langue. Il résout les problèmes de direction de texte (RTL/LTR) et unifie les trois générateurs séparés en un seul système cohérent.

## ✨ Fonctionnalités

- ✅ **Support multilingue** : Arabe (RTL) et Français (LTR)
- ✅ **Détection automatique** de la langue du contenu
- ✅ **Police Amiri embarquée** : Pas de dépendance externe
- ✅ **Mise en page adaptative** : RTL pour l'arabe, LTR pour le français
- ✅ **Interface standardisée** : Une seule structure de données
- ✅ **Factures bilingues** : Option pour générer des factures dans les deux langues
- ✅ **Personnalisable** : Logo, informations de l'entreprise, couleurs

## 🚀 Installation

### 1. Copier les fichiers

Copiez les fichiers suivants dans votre projet :

```
votre-projet/
├── src/
│   ├── lib/
│   │   ├── amiriFontBase64.ts          # Police Amiri en base64
│   │   └── invoicePdfGeneratorUnified.ts  # Générateur unifié
```

### 2. Installer les dépendances

```bash
npm install jspdf jspdf-autotable
# ou
yarn add jspdf jspdf-autotable
```

### 3. (Optionnel) Installer alif-toolkit pour un meilleur support arabe

```bash
npm install alif-toolkit
# ou
yarn add alif-toolkit
```

## 📖 Utilisation

### Exemple de base

```typescript
import { generateInvoicePDF, InvoiceData } from './lib/invoicePdfGeneratorUnified';

// Données de la facture
const invoiceData: InvoiceData = {
  invoice_number: 'INV-2025-001',
  issue_date: '2025-10-09',
  due_date: '2025-11-09',
  client_name: 'محمد علي',  // Nom en arabe
  client_whatsapp: '+216 98 765 432',
  client_email: 'mohamed.ali@example.com',
  client_tax_id: '1234567A',
  services: [
    {
      description: 'خدمة استشارية',  // Description en arabe
      quantity: 1,
      unit_price: 350.000,
      amount: 350.000
    }
  ],
  subtotal: 350.000,
  tva_rate: 19,
  tva_amount: 66.500,
  timbre_fiscal: 1.000,
  total_amount: 417.500,
  status: 'مدفوعة',  // Statut en arabe
  currency: 'DT'
};

// Générer la facture (détection automatique de la langue)
const fileName = await generateInvoicePDF(invoiceData);
console.log(`Facture générée : ${fileName}`);
```

### Exemple avec options

```typescript
import { generateInvoicePDF, InvoiceData, InvoiceOptions } from './lib/invoicePdfGeneratorUnified';

const invoiceData: InvoiceData = {
  // ... données de la facture
};

const options: InvoiceOptions = {
  language: 'ar',  // Forcer la langue arabe ('ar' ou 'fr' ou 'auto')
  bilingual: false,  // Facture bilingue (pas encore implémenté)
  companyInfo: {
    name_ar: 'شركة تونس للإستشارات والمساعدة',
    name_fr: 'TUNIS CO. CONSULTING AND ASSISTING',
    address_ar: 'عدد 85 شارع فلسطين، البلفدير 1002',
    address_fr: '85 rue de Palestine, Tunis 1002',
    tax_id: '1389792/E',
    phone: '+216 28 846 888',
    email: 'contact@tunis-consulting.com',
    website: 'www.tunis-consulting.com'
  }
};

const fileName = await generateInvoicePDF(invoiceData, options);
```

### Exemple en français

```typescript
const invoiceDataFR: InvoiceData = {
  invoice_number: 'INV-2025-002',
  issue_date: '2025-10-09',
  client_name: 'Jean Dupont',
  client_email: 'jean.dupont@example.com',
  services: [
    {
      description: 'Service de conseil',
      quantity: 2,
      unit_price: 150.000,
      amount: 300.000
    }
  ],
  subtotal: 300.000,
  tva_rate: 19,
  tva_amount: 57.000,
  timbre_fiscal: 1.000,
  total_amount: 358.000,
  status: 'Payée',
  currency: 'DT'
};

const fileName = await generateInvoicePDF(invoiceDataFR);
```

## 🔧 Configuration

### Interface InvoiceData

```typescript
interface InvoiceData {
  invoice_number: string;        // Numéro de facture
  issue_date: string;            // Date d'émission (format: YYYY-MM-DD)
  due_date?: string;             // Date d'échéance (optionnel)
  client_name: string;           // Nom du client
  client_whatsapp?: string;      // WhatsApp du client
  client_email?: string;         // Email du client
  client_tax_id?: string;        // Identifiant fiscal du client
  services: InvoiceService[];    // Liste des services
  subtotal: number;              // Sous-total
  tva_rate?: number;             // Taux de TVA (%)
  tva_amount?: number;           // Montant de TVA
  timbre_fiscal?: number;        // Timbre fiscal
  total_amount: number;          // Montant total
  status?: string;               // Statut de la facture
  notes?: string;                // Notes additionnelles
  currency?: string;             // Devise (par défaut: 'DT')
}

interface InvoiceService {
  description: string;           // Description du service
  quantity: number;              // Quantité
  unit_price: number;            // Prix unitaire
  amount: number;                // Montant total
}
```

### Options de génération

```typescript
interface InvoiceOptions {
  language?: 'ar' | 'fr' | 'auto';  // Langue ('auto' = détection automatique)
  bilingual?: boolean;               // Facture bilingue
  logo?: string;                     // Logo en base64 ou URL
  companyInfo?: CompanyInfo;         // Informations de l'entreprise
}
```

## 🎨 Personnalisation

### Modifier les couleurs

Dans le fichier `invoicePdfGeneratorUnified.ts`, vous pouvez modifier les couleurs :

```typescript
// Couleur principale (bleu foncé)
doc.setFillColor(30, 58, 95);  // RGB

// Couleur secondaire (or)
doc.setFillColor(184, 134, 11);  // RGB
```

### Ajouter un logo

```typescript
const options: InvoiceOptions = {
  logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  // ou
  logo: '/path/to/logo.png'
};
```

## 🔄 Migration depuis les anciens générateurs

### Avant (3 fichiers séparés)

```typescript
// Vous deviez choisir manuellement le générateur
import { generateInvoicePDFAR } from './invoicePdfGeneratorAR';
import { generateInvoicePDFFR } from './invoicePdfGeneratorFR';

// Et convertir les données selon le format
```

### Après (1 fichier unifié)

```typescript
// Un seul import, détection automatique
import { generateInvoicePDF } from './invoicePdfGeneratorUnified';

// Même structure de données pour toutes les langues
const fileName = await generateInvoicePDF(invoiceData);
```

## 📝 Différences avec les anciens générateurs

| Aspect | Anciens générateurs | Nouveau générateur unifié |
|--------|---------------------|---------------------------|
| **Nombre de fichiers** | 3 fichiers séparés | 1 fichier unique |
| **Interface** | Différente pour chaque langue | Interface standardisée |
| **Détection langue** | Manuelle | Automatique |
| **Police arabe** | Chargement externe | Embarquée en base64 |
| **Maintenance** | Difficile (3 fichiers) | Facile (1 fichier) |
| **Cohérence** | Styles différents | Styles unifiés |

## 🐛 Résolution des problèmes

### Problème : Le texte arabe ne s'affiche pas correctement

**Solution** : Installez `alif-toolkit` pour un meilleur support du shaping arabe :

```bash
npm install alif-toolkit
```

Puis décommentez les lignes dans `processArabicText()` :

```typescript
const processArabicText = (text: string): string => {
  if (!text || !hasArabicCharacters(text)) {
    return text;
  }
  
  try {
    const { WordShaper } = require('alif-toolkit');  // Décommenter
    const shaped = WordShaper(text);                  // Décommenter
    return shaped.split('').reverse().join('');       // Décommenter
  } catch (error) {
    // Fallback
    return text.split('').reverse().join('');
  }
};
```

### Problème : Erreur "Cannot find module 'amiriFontBase64'"

**Solution** : Vérifiez que le fichier `amiriFontBase64.ts` est bien dans le même répertoire et que le chemin d'import est correct.

### Problème : La police est trop volumineuse

**Solution** : La police Amiri fait environ 800 Ko en base64. Si c'est un problème :
1. Utilisez un chargement externe de la police (comme dans votre ancien système)
2. Ou utilisez une police arabe plus légère

## 📊 Comparaison des tailles

| Fichier | Taille |
|---------|--------|
| `amiriFontBase64.ts` | ~800 Ko |
| `invoicePdfGeneratorUnified.ts` | ~30 Ko |
| **Total** | ~830 Ko |

## 🔐 Licence

Ce code utilise la police Amiri qui est sous licence **OFL (Open Font License)**.

## 📞 Support

Pour toute question ou problème :
- Consultez la documentation de [jsPDF](https://github.com/parallax/jsPDF)
- Consultez la documentation de [alif-toolkit](https://github.com/aliftype/alif-toolkit)

## 🎯 Prochaines étapes

- [ ] Implémenter les factures bilingues
- [ ] Ajouter le support pour d'autres langues
- [ ] Optimiser la taille de la police embarquée
- [ ] Ajouter des templates de factures personnalisables
- [ ] Support pour les images/logos personnalisés

