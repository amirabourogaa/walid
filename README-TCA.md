# TCA VISA - Application de Gestion Administrative

## 🎯 Vue d'ensemble

TCA VISA est une solution complète et moderne de gestion administrative pour cabinet d'avocats spécialisé dans les visas. L'application offre deux interfaces distinctes :

- **Interface Gestionnaire** : Web et mobile pour les administrateurs, managers et employés
- **Interface Client** : Mobile-first optimisée pour les clients avec support App Store/Play Store

## ✨ Fonctionnalités

### Interface Gestionnaire
- 📊 **Dashboard** avec statistiques en temps réel
- 👥 **Gestion des clients** complète
- 📅 **Système de rendez-vous** 
- 📁 **Gestion des dossiers visa**
- 💰 **Système de facturation**
- 📈 **Statistiques et rapports**
- 🔒 **Système d'authentification sécurisé**

### Interface Client
- 📱 **Interface mobile optimisée**
- 📋 **Suivi de dossier en temps réel**
- 📄 **Gestion des documents**
- 🔔 **Notifications push**
- 📞 **Contact direct avec le cabinet**
- 📅 **Prise de rendez-vous**

## 🚀 Démarrage Rapide

### Comptes de démonstration

**Gestionnaire :**
- Email: `admin@tcavisa.com`
- Mot de passe: `demo`

**Client :**
- Email: `client@example.com`
- Mot de passe: `demo`

## 📱 Déploiement Mobile (App Store/Play Store)

L'application utilise **Capacitor** pour permettre le déploiement sur les stores mobiles.

### Configuration initiale
```bash
# Installer les dépendances
npm install

# Initialiser Capacitor (déjà configuré)
npx cap init

# Construire l'application
npm run build
```

### Déploiement iOS
```bash
# Ajouter la plateforme iOS (Mac requis)
npx cap add ios

# Mettre à jour les dépendances natives
npx cap update ios

# Synchroniser les fichiers
npx cap sync

# Ouvrir dans Xcode
npx cap run ios
```

### Déploiement Android
```bash
# Ajouter la plateforme Android
npx cap add android

# Mettre à jour les dépendances natives
npx cap update android

# Synchroniser les fichiers
npx cap sync

# Ouvrir dans Android Studio
npx cap run android
```

## 🎨 Design System

L'application utilise un design system professionnel avec :
- **Couleurs** : Bleu professionnel (#1e40af) et or (#f59e0b)
- **Typographie** : Moderne et lisible
- **Animations** : Fluides et élégantes
- **Responsive** : Optimisé pour tous les écrans

## 🛠 Technologies

- **Frontend** : React 18 + TypeScript
- **Styling** : Tailwind CSS + shadcn/ui
- **Backend** : Supabase (intégré)
- **Mobile** : Capacitor
- **Routing** : React Router
- **Build** : Vite

## 📁 Structure du Projet

```
src/
├── components/          # Composants réutilisables
│   ├── ui/             # Composants UI (shadcn)
│   ├── AuthGuard.tsx   # Protection des routes
│   └── Sidebar.tsx     # Navigation gestionnaire
├── pages/              # Pages principales
│   ├── Login.tsx       # Page de connexion
│   ├── ManagerDashboard.tsx  # Dashboard gestionnaire
│   └── ClientDashboard.tsx   # Interface client
├── lib/                # Utilitaires
│   └── auth.ts         # Service d'authentification
├── types/              # Types TypeScript
└── assets/             # Images et assets
```

## 🔐 Sécurité

- ✅ Authentification JWT
- ✅ Protection des routes
- ✅ Gestion des rôles utilisateur
- ✅ Validation des données
- ✅ Headers de sécurité

## 📞 Support

Pour toute question ou demande de fonctionnalité, contactez l'équipe de développement.

---

*Application développée avec ❤️ pour TCA VISA*