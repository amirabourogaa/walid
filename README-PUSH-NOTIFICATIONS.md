# Configuration des Notifications Push

Ce guide explique comment configurer les notifications push Web pour votre application.

## Étape 1: Générer les clés VAPID

Les clés VAPID (Voluntary Application Server Identification) sont nécessaires pour authentifier votre serveur auprès des services de push.

### Option A: Utiliser web-push (Recommandé)

```bash
npm install -g web-push
web-push generate-vapid-keys
```

### Option B: Utiliser un générateur en ligne

Visitez: https://web-push-codelab.glitch.me/

## Étape 2: Configurer les secrets Supabase

Vous avez déjà ajouté les secrets suivants via l'interface Lovable:
- `VAPID_PUBLIC_KEY` - Clé publique VAPID
- `VAPID_PRIVATE_KEY` - Clé privée VAPID
- `VAPID_SUBJECT` - mailto:votre-email@example.com ou votre URL

**Important**: Assurez-vous que ces secrets contiennent les vraies valeurs générées à l'étape 1.

## Étape 3: Ajouter la clé publique au frontend

Créez un fichier `.env` à la racine du projet avec:

```
VITE_VAPID_PUBLIC_KEY=votre_cle_publique_vapid_ici
```

**Note**: La clé publique peut être exposée côté client (c'est normal).

## Étape 4: Tester les notifications

1. Activez les notifications dans les paramètres de l'application
2. Changez le statut d'un client via `VisaStatusTracker`
3. L'employé assigné recevra une notification push

## Architecture

### Frontend
- `src/hooks/usePushNotifications.tsx` - Hook pour gérer les abonnements push
- `src/components/PushNotificationSettings.tsx` - Interface utilisateur
- `src/lib/pushNotificationHelpers.ts` - Fonctions utilitaires

### Backend
- `supabase/functions/send-push-notification/index.ts` - Edge function pour envoyer les notifications
- Table `push_subscriptions` - Stocke les abonnements des utilisateurs

### Intégration
- `src/lib/whatsappHelpers.ts` - Envoie automatiquement une notification push lors de la mise à jour du statut visa

## Fonctionnalités

✅ Notifications push Web natives  
✅ Support PWA complet  
✅ Gestion automatique des abonnements  
✅ Nettoyage des abonnements expirés  
✅ Support multi-appareil  
✅ Intégration avec le workflow existant  

## Limitations

- Les notifications push nécessitent HTTPS en production
- Safari sur iOS nécessite que l'app soit ajoutée à l'écran d'accueil
- Les notifications ne fonctionnent pas en navigation privée

## Dépannage

### Les notifications ne s'affichent pas
1. Vérifiez que les permissions sont accordées dans le navigateur
2. Vérifiez que les clés VAPID sont correctement configurées
3. Consultez la console du navigateur pour les erreurs

### L'abonnement échoue
1. Assurez-vous que le service worker est enregistré
2. Vérifiez que `VITE_VAPID_PUBLIC_KEY` est dans `.env`
3. Vérifiez que la clé publique correspond à la clé privée dans Supabase

### Les notifications ne sont pas reçues
1. Vérifiez que l'edge function est déployée
2. Vérifiez les logs de l'edge function dans Supabase
3. Assurez-vous que l'utilisateur a un abonnement actif dans la table `push_subscriptions`

## Sécurité

- ✅ Les clés privées sont stockées uniquement dans les secrets Supabase
- ✅ Les abonnements sont liés à l'authentification utilisateur
- ✅ RLS est activé sur la table `push_subscriptions`
- ✅ Les notifications sont envoyées uniquement aux employés assignés

## Ressources

- [Web Push API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Workers MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [VAPID Protocol](https://tools.ietf.org/html/rfc8292)
