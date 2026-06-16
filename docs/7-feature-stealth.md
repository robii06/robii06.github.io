---
id: stealth
title: 'Feature: Furtivité'
sidebar_position: 6
---

# Feature: Furtivité (Hiding)

Cette section détaille les mécanismes utilisés par WLKOM pour se rendre invisible sur le système victime, ciblant à la fois le système de fichiers, la liste des modules et les processus.

## Masquage des fichiers et répertoires

**Mécanisme : Hook getdents64 via ftrace**

L'appel système `getdents64` est le pilier central de l'énumération du contenu des répertoires sous Linux (utilisé par `ls`, `find`, `du`). WLKOM intercepte cet appel pour filtrer les résultats avant qu'ils n'atteignent l'espace utilisateur.

- **Comportement** : Toute entrée dont le nom commence par le préfixe défini dans `config.h` (par défaut `wlkom`) est supprimée de la structure retournée.
- **Portée** : Cela s'applique de manière identique aux **fichiers** et aux **répertoires**. Si un dossier est nommé `wlkom_secrets`, il sera totalement invisible, ainsi que tout son contenu.
- **Technique** : Utilisation de `ftrace` pour détourner le pointeur d'instruction (`regs->ip`) vers notre fonction `hooked_getdents64`.

## Dissimulation du module (lsmod)

Le module s'extrait de la liste doublement chaînée globale des modules maintenue par le noyau.

- **Impact** : Le module disparaît de la commande `lsmod`, du fichier `/proc/modules` et du répertoire `/sys/module/`.
- **Mécanisme** : Appel à `list_del(&THIS_MODULE->list)` lors de l'initialisation. Le code reste résident en mémoire mais n'est plus "référencé" officiellement.

## Masquage du processus (kthread)

Le thread de connexion reverse shell tourne en arrière-plan sous une identité usurpée.

- **Nom usurpé** : `kworker/u2:0h`
- **Impact** : Dans une liste de processus (`ps aux` ou `top`), le thread apparaît comme un worker noyau standard, ne levant aucun soupçon de la part de l'administrateur système.

## Résistance au déchargement

WLKOM utilise `try_module_get(THIS_MODULE)` pour incrémenter son propre compteur de référence. 
- **Résultat** : Toute tentative de `rmmod wlkom` échouera avec un message indiquant que le module est utilisé, rendant sa suppression impossible sans un redémarrage complet du système.
