---
id: persistence
title: Persistance
sidebar_position: 6
---

# Persistance & Survie au Reboot

Un module noyau chargé manuellement via `insmod` est perdu au prochain redémarrage. Pour qu'un rootkit survive, il doit s'intégrer dans le mécanisme de démarrage du système. WLKOM utilise **systemd**, le gestionnaire de services standard des distributions Linux modernes, pour s'autocharger à chaque boot.

La persistance est configurée automatiquement par la cible `make install` du Makefile, qui copie le fichier `wlkom.service` dans `/etc/systemd/system/` et l'active via `systemctl enable`.

## Service systemd — wlkom.service

```ini
[Unit]
Description=WLKOM Kernel Module
DefaultDependencies=no            # pas de deps systemd standard
After=local-fs.target network.target  # attend FS + réseau

[Service]
Type=oneshot                       # exécution unique
ExecStart=/sbin/modprobe wlkom    # charge le module
RemainAfterExit=yes               # service marqué actif après fin

[Install]
WantedBy=multi-user.target        # démarre en mode normal
```

| Directive systemd | Valeur | Explication |
| :--- | :--- | :--- |
| `DefaultDependencies=no` | `no` | Désactive les dépendances automatiques de systemd (shutdown.target, etc.) pour permettre un démarrage très tôt dans la séquence de boot. |
| `After=` | `local-fs.target network.target` | Garantit que le système de fichiers est monté (pour accéder au .ko) et que le réseau est initialisé (pour la connexion vers l'attaquant) avant le chargement. |
| `Type=oneshot` | `oneshot` | Le service exécute une commande unique et se termine. Systemd attend la fin avant de continuer la séquence de démarrage. |
| `ExecStart` | `/sbin/modprobe wlkom` | `modprobe` (contrairement à `insmod`) résout automatiquement les dépendances entre modules. Il cherche wlkom.ko dans les répertoires standards (/lib/modules/...). |
| `RemainAfterExit=yes` | `yes` | Maintient le service à l'état "active" même après la fin du processus ExecStart. Permet à systemctl de rapporter le service comme actif. |
| `WantedBy=multi-user.target` | `multi-user.target` | Active le service pour tous les modes de démarrage normaux (non graphiques et graphiques). Équivalent du runlevel 3/5 en SysV init. |

## Séquence de démarrage complète

1. **BIOS/UEFI → GRUB → Kernel** : Le noyau Linux démarre normalement. Le rootkit est absent de la mémoire à ce stade.
2. **systemd init — local-fs.target** : Les systèmes de fichiers sont montés. Le fichier wlkom.ko est accessible dans `/lib/modules/`.
3. **network.target** : Les interfaces réseau sont initialisées. L'IP de l'attaquant est joignable.
4. **wlkom.service — modprobe wlkom** : Systemd exécute `modprobe wlkom`. Le module est chargé en mémoire noyau. `wlkom_init()` est appelé : hook ftrace, dissimulation lsmod, lancement kthread reverse shell.
5. **multi-user.target — Système prêt** : Le système est opérationnel pour les utilisateurs. Le rootkit tourne silencieusement en arrière-plan, invisible et connecté à l'attaquant.
