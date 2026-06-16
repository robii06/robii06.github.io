---
id: installation
title: Installation & Infra
sidebar_position: 2
---

# Installation & Infrastructure

L'infrastructure du projet est entièrement automatisée via **Ansible**, un outil de gestion de configuration agentless qui exécute des tâches via SSH. Le playbook principal `playbook.yml` provisionne deux machines virtuelles sur QEMU/KVM.

## Choix technologiques

Conformément aux exigences du sujet, voici les justifications de nos choix :

- **Distribution : Debian 12 (Bookworm)**
    - *Pourquoi ?* Debian est la référence pour la stabilité serveur. La version 12 (actuelle stable) offre un environnement prévisible pour le développement noyau tout en étant suffisamment moderne.
- **Version du Noyau : Linux 6.1+**
    - *Pourquoi ?* Le rootkit nécessite au minimum un noyau 5.7+ pour l'utilisation de la technique kprobe permettant de retrouver `kallsyms_lookup_name`. Debian 12 embarque nativement un noyau 6.1, ce qui est parfait pour nos besoins de hooking ftrace.
- **Virtualisation : QEMU/KVM**
    - *Pourquoi ?* C'est l'hyperviseur standard sous Linux, offrant les meilleures performances et une intégration parfaite avec Ansible via `virt-install`.
- **Automatisation : Ansible**
    - *Pourquoi ?* Permet de garantir un environnement de test identique pour le correcteur ("Infrastructure as Code"), installant automatiquement les dépendances et configurant le réseau.

## Les Machines Virtuelles

| Machine | IP Statique | Rôle |
| :--- | :--- | :--- |
| **debian-vm-1** | `192.168.122.101` | **Attaquant** (Serveur C d'écoute) |
| **debian-vm-2** | `192.168.122.102` | **Victime** (Héberge le rootkit LKM) |

## Tâches du playbook principal (playbook.yml)

Le playbook automatise les étapes suivantes sur l'hôte :
1. Installation de la stack virtualisation (`qemu`, `libvirt`, `virt-manager`).
2. Configuration du réseau virtuel NAT `default` (192.168.122.0/24).
3. Téléchargement de l'image officielle Debian 12 Cloud-Init.
4. Création d'un répertoire partagé `/var/lib/libvirt/vm-share/` (via VirtIO 9p).
5. Provisionnement des deux VMs avec configuration IP statique et accès SSH.

## Création individuelle d'une VM (`create_vm.yml`)

Chaque VM est configurée via **Cloud-Init** pour :
- Créer l'utilisateur `debian` (mot de passe: `debian`).
- Installer les `linux-headers` correspondants au noyau courant.
- Monter le dossier partagé pour faciliter le transfert du code source.
- Configurer l'interface réseau avec une IP fixe.

:::success Idempotence
Le playbook peut être exécuté plusieurs fois. Si les VMs existent déjà, Ansible les ignorera et ne modifiera rien.
:::
