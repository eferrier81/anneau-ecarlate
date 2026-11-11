# Écarlate — suivi d'anneau contraceptif

Appli Android personnelle (Expo SDK 58, TypeScript, Expo Router). Cycle 21 jours avec /
7 jours sans, rappels locaux répétés toutes les heures, retraits imprévus, calendrier.
**100 % local** : SQLite sur le téléphone, aucun compte, aucun serveur, aucune requête réseau.

## Commandes

```bash
npm install          # dépendances
npm test             # tests Jest (logique du cycle, notifications, contrastes WCAG)
npm run typecheck    # TypeScript
npx eslint src       # lint
npx expo start       # serveur de dev (Expo Go)
```

## Architecture

```
index.ts                      point d'entrée : tâche « C'est fait » définie avant tout
src/app/                      routes Expo Router uniquement
  _layout.tsx                 polices, store, thème, garde onboarding ↔ onglets
  onboarding.tsx
  (tabs)/                     Accueil / Calendrier / Réglages (NativeTabs)
src/core/                     logique PURE et testée (aucune dépendance React/Expo)
  cycle.ts                    état, échéances, frise, jours du calendrier, validations
  notification-plan.ts        liste des notifs à programmer + idempotence de « C'est fait »
  format.ts                   dates en français
src/data/db.ts                SQLite : événements + réglages
src/notifications/            expo-notifications (canal, catégorie, programmation, tâche)
src/state/app-store.tsx       store React : charge, modifie, reprogramme
src/theme/                    tokens (couleurs sombre/clair, espacements, typo, lueurs, motion)
src/components/               composants réutilisables (bouton lumineux, cercle magique…)
src/screens/                  corps des écrans
scripts/generate-icons.py     génère les icônes (motif original) avec cairosvg
```

### Règles métier

- Retrait prévu = dernière pose **réelle** + 21 jours ; pose prévue = dernier retrait réel + 7 jours.
- Calculs en jours calendaires locaux : l'heure murale est conservée au passage heure d'été / d'hiver.
- Retrait imprévu < 3 h : enregistrement seul. > 3 h : décompte de 7 jours à partir de l'heure
  saisie, indépendant du cycle (plusieurs décomptes : la fin la plus tardive l'emporte).
- Calendrier : la couleur d'un jour = phase en vigueur à la fin de la journée (21 jours « avec »,
  7 « sans »).

### Notifications

À chaque ouverture et à chaque changement : on annule tout, puis on programme jusqu'à 48 rappels
horaires datés à partir de l'échéance (+ 1 notif de fin de contraception supplémentaire), soit
≤ 60 (limite iOS : 64). Le bouton « C'est fait » enregistre l'action sans ouvrir l'appli
(tâche headless Android), et n'agit que si la notification correspond à l'action réellement
attendue (pas de double enregistrement).
