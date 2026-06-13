---
id: stealth
title: Furtivité
sidebar_position: 5
---

# Furtivité & Techniques Stealth

- **Fichiers cachés** : Hook sur `sys_getdents64` via ftrace. Filtre toute entrée dont le nom commence par "wlkom" dans les réponses du VFS.
- **lsmod invisible** : Suppression du module de la liste chaînée interne du noyau via `list_del()`. Disparaît de `lsmod` et `/proc/modules`.
- **Processus masqué** : Le kthread est créé avec le nom `kworker/u2:0h`, identique à un worker noyau légitime. Passe inaperçu dans `ps aux`.

## Hook getdents64 via ftrace

**Pourquoi ftrace ?**
**ftrace** est le framework de tracing du noyau Linux. WLKOM l'utilise non pas pour tracer, mais pour **détourner** l'appel système `getdents64` (qui liste le contenu d'un répertoire). La technique repose sur la modification du registre instruction pointer (`regs->ip`) juste avant l'exécution de la fonction originale, redirigeant vers notre fonction interceptrice.

Cette approche est plus robuste que la modification directe de la *syscall table* (qui nécessite de désactiver la write-protection des pages), car ftrace est une API officielle du noyau.

| Fonction | Rôle | Mécanisme |
| :--- | :--- | :--- |
| `hook_install()` | Installe le hook ftrace | Résout l'adresse de `__x64_sys_getdents64` via `resolve_symbol()`. Appelle `ftrace_set_filter_ip()` pour cibler cette adresse. Enregistre `hook_ops` via `register_ftrace_function()`. Retourne une erreur si l'une des étapes échoue. |
| `ftrace_callback()` | Callback ftrace — redirige l'IP | Appelée par ftrace à chaque invocation de `getdents64`. Vérifie que l'appelant n'est PAS le module lui-même (anti-récursion via `within_module(parent_ip, THIS_MODULE)`), puis réécrit `regs->ip` pour pointer vers `hooked_getdents64`. |
| `hooked_getdents64()` | Implémentation du filtre | Appelle la vraie `getdents64` pour obtenir les entrées. Copie le buffer kernel avec `copy_from_user()`. Parcourt chaque `struct linux_dirent64` et supprime (`memmove`) celles dont le nom commence par HIDE_PREFIX. Réécriture dans l'espace user via `copy_to_user()`. |
| `hook_remove()` | Désinstalle le hook | Appelle `unregister_ftrace_function()` pour retirer le callback. Retire le filtre IP avec `ftrace_set_filter_ip(..., 1, 0)` (le 1 = remove). Nettoyage propre lors du déchargement. |

```c
/* Algorithme de filtrage getdents64 */
long remaining = ret;    // taille totale initiale
long offset = 0;

while (offset < remaining) {
    struct linux_dirent64 *cur = (void *)kbuf + offset;

    if (strncmp(cur->d_name, HIDE_PREFIX, strlen(HIDE_PREFIX)) == 0) {
        /* Entrée à cacher → l'écraser par ce qui suit */
        memmove(cur, (void *)cur + cur->d_reclen,
                remaining - offset - cur->d_reclen);
        remaining -= cur->d_reclen;
        /* Ne PAS incrémenter offset : réexaminer même position */
    } else {
        offset += cur->d_reclen;  // entrée légitime, suivante
    }
}
/* copy_to_user avec remaining (taille réduite si cachage) */
```

## Dissimulation de lsmod

| Fonction | Mécanisme | Impact |
| :--- | :--- | :--- |
| `hide_from_lsmod()` | Sauvegarde `THIS_MODULE->list.prev` dans `prev_module_entry`, puis appelle `list_del(&THIS_MODULE->list)` pour extraire le module de la liste doublement chaînée `modules` du noyau. | Le module disparaît de `lsmod`, `/proc/modules`, `/sys/module/`. Le module reste fonctionnel en mémoire mais n'est plus référencé dans les listes de découverte standard. |

:::warning Note d'implémentation
Le pointeur `prev_module_entry` est sauvegardé pour permettre une future réinsertion dans la liste si nécessaire lors de wlkom_exit(). Bien que le déchargement soit normalement impossible (try_module_get), c'est une bonne pratique.
:::

## Résistance au déchargement

La fonction `try_module_get(THIS_MODULE)` incrémente le compteur de référence interne du module. Le noyau Linux refuse de décharger un module dont le compteur de référence est supérieur à zéro — c'est le mécanisme utilisé par les pilotes pour signaler qu'un périphérique est en cours d'utilisation. En s'auto-incrémentant, WLKOM rend `rmmod wlkom` impossible sans reboot ou décrément forcé du compteur.
