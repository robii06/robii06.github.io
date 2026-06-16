---
id: persistence
title: 'Feature: Persistance'
sidebar_position: 7
---

# Feature: Persistance & Survie au Reboot

Un module noyau chargé manuellement via `insmod` est perdu au prochain redémarrage. Pour qu'un rootkit survive, il doit s'intégrer dans le mécanisme de démarrage du système. WLKOM utilise **systemd** pour s'autocharger à chaque boot.

## Service systemd furtif

Dès son chargement initial, WLKOM tente d'écrire son propre service systemd dans `/etc/systemd/system/wlkom.service`.

```ini
[Unit]
Description=WLKOM Kernel Module
DefaultDependencies=no
After=local-fs.target network.target

[Service]
Type=oneshot
ExecStart=/sbin/modprobe wlkom
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

## Séquence de persistance

1. **Auto-Installation** : Lors de l'appel à `wlkom_init()`, le rootkit appelle `persist()`.
2. **Écriture du service** : Utilisation des fonctions de fichiers du noyau (`filp_open`, `kernel_write`) pour créer le fichier de service si nécessaire.
3. **Activation** : Le module invoque `systemctl enable wlkom` via `call_usermodehelper` pour garantir son lancement au prochain démarrage.
4. **Chargement précoce** : Au reboot, systemd exécute `modprobe wlkom` après l'initialisation réseau, restaurant immédiatement l'accès à l'attaquant.

## Dissimulation de la persistance

Bien que le fichier de service soit présent sur le disque, il est masqué par le hook `getdents64` si son nom commence par le préfixe configuré (`wlkom`), rendant sa détection difficile par un simple `ls /etc/systemd/system/`.
