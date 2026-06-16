---
id: password
title: 'Feature: Authentification'
sidebar_position: 6
---

# Feature: Authentification (Password)

Le rootkit WLKOM implémente une couche de sécurité indispensable : l'authentification par mot de passe avant toute interaction avec le shell. Cette fonctionnalité garantit que seul l'attaquant légitime peut prendre le contrôle de la victime.

## Utilisation de l'API Crypto du Noyau

Plutôt que de comparer le mot de passe en clair (ce qui serait une faille de sécurité majeure si le binaire était analysé), WLKOM utilise l'**API Crypto** native du noyau Linux pour gérer des condensats (hashs).

- **Algorithme utilisé** : SHA256.
- **Stockage** : Seul le hash de 32 octets est stocké dans le module (`PASSWORD_HASH`).

## Processus d'authentification

Dès que la connexion TCP est établie avec l'attaquant, le thread noyau lance la procédure suivante :

1.  **Prompt** : Envoi de la chaîne `Password: ` à travers la socket.
2.  **Lecture caractère par caractère** : Le noyau lit les données entrantes, gère les retours à la ligne (`\n`, `\r`) et stocke le mot de passe dans un buffer temporaire.
3.  **Hachage** :
    - Allocation d'un transformateur de hash via `crypto_alloc_shash("sha256", 0, 0)`.
    - Calcul du digest du mot de passe saisi par l'utilisateur.
4.  **Comparaison** : Utilisation de `memcmp` pour comparer le digest généré avec le hash attendu.
5.  **Décision** :
    - **Succès** : Le processus continue vers l'initialisation du shell PTY.
    - **Échec** : Envoi de `Access denied.`, fermeture de la socket et retour à la boucle d'attente.

## Détails techniques (`shell.c`)

Le code s'appuie sur la structure `shash_desc` pour effectuer l'opération de hachage de manière sécurisée dans l'espace mémoire du noyau.

```c
tfm = crypto_alloc_shash("sha256", 0, 0);
desc = kmalloc(sizeof(*desc) + crypto_shash_descsize(tfm), GFP_KERNEL);
desc->tfm = tfm;

// Génère le hash SHA256 du buffer pwbuf
crypto_shash_digest(desc, pwbuf, len, digest);
```

:::info Configuration
Le hash peut être généré à l'avance (via `echo -n "monpass" | sha256sum`) et mis à jour dans le tableau `PASSWORD_HASH` au début du fichier `shell.c`.
:::
