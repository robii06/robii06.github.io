---
id: overview
title: Vue d'ensemble
sidebar_position: 1
---

# Présentation du projet

**Qu'est-ce que WLKOM ?**

WLKOM (*Wild Linux Kernel Object Module*) est un rootkit pédagogique développé dans le cadre du module SYS2. Il se présente sous la forme d'un **LKM (Loadable Kernel Module)** — un module noyau Linux dynamiquement chargeable — qui offre à un attaquant un contrôle complet sur la machine victime.

Contrairement aux rootkits userland qui opèrent depuis l'espace utilisateur, WLKOM s'exécute directement dans le **ring 0** (espace noyau), lui conférant des privilèges maximaux et la capacité d'intercepter des appels système fondamentaux.

Le module combine trois capacités principales : établissement d'un **reverse shell PTY interactif** vers l'attaquant, **dissimulation de sa présence** via hooks ftrace sur `getdents64`, et **survie aux redémarrages** via un service `systemd` dédié.

## Fonctionnalités implémentées

- Reverse shell PTY interactif entièrement en C (Kernel PTY Bridge)
- Authentification par mot de passe sécurisé (hash SHA256)
- Reconnexion automatique toutes les 5 secondes
- Dissimulation des fichiers (hook getdents64)
- Dissimulation de lsmod / /proc/modules
- Masquage du processus (nom kworker/u2:0h)
- Résistance au déchargement (try_module_get)
- Persistance automatique via service systemd (dès le chargement)
- Déploiement Ansible 2 VMs automatisé

## Stack technique

- **Noyau** C — Linux Kernel API
- **Hook** ftrace + kprobes
- **Shell** Kernel PTY Bridge (C kthreads)
- **Sécurité** Crypto API du noyau (SHA256)
- **Attaquant** C — poll() + raw terminal
- **Infra** Ansible + QEMU/KVM
- **OS cible** Debian 12 Bookworm
- **Noyau min.** Linux 5.7+
- **Réseau** TCP port 4444

## Flux d'attaque général

```text
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                        MACHINE ATTAQUANTE                              │
  │                        192.168.122.101                                 │
  │   [ attacker ]  ←──── poll() stdin/socket ────→  terminal RAW          │
  │   écoute :4444                                                         │
  └─────────────────────┬───────────────────────────────────────────────────┘
                        │  TCP :4444  (reverse shell PTY + Password)
                        │
  ┌─────────────────────▼───────────────────────────────────────────────────┐
  │                        MACHINE VICTIME                                 │
  │                        192.168.122.102                                 │
  │                                                                        │
  │   USER SPACE                          KERNEL SPACE                     │
  │   ┌────────────────────┐              ┌────────────────────────────┐   │
  │   │  /bin/sh (TTY)     │◄──PTY Bridge─►  wlkom.ko (LKM)            │   │
  │   └────────────────────┘              │  ├─ kthread conn_loop      │   │
  │                                       │  ├─ hook getdents64        │   │
  │   ┌────────────────────┐              │  ├─ persist() systemd      │   │
  │   │  systemd wlkom     │◄──configure──│  └─ try_module_get         │   │
  │   │  (persistance)     │              └────────────────────────────┘   │
  │   └────────────────────┘                                               │
  └────────────────────────────────────────────────────────────────────────┘
```

:::warning Usage pédagogique uniquement
Ce projet est réalisé dans un cadre scolaire strictement contrôlé. L'utilisation de techniques de rootkit en dehors de ce cadre est illégale. Tout le déploiement s'effectue sur des VMs isolées.
:::
