---
id: infra
title: Infrastructure
sidebar_position: 7
---

# Infrastructure Ansible + QEMU/KVM

**Vue d'ensemble du déploiement**

L'infrastructure du projet est entièrement automatisée via **Ansible**, un outil de gestion de configuration agentless qui exécute des tâches via SSH. Le playbook principal `playbook.yml` provisionne deux machines virtuelles Debian 12 (Bookworm) sur QEMU/KVM depuis un hôte Arch Linux, en utilisant des images **cloud-init** pour la configuration initiale.

## Les Machines Virtuelles

### debian-vm-1 (Attaquant)

| Paramètre | Valeur |
| :--- | :--- |
| IP | `192.168.122.101` |
| vCPUs | 2 |
| RAM | 2048 Mo |
| Disque | 20 Go (qcow2) |
| User | debian / debian |
| Extra packages | git |

### debian-vm-2 (Victime)

| Paramètre | Valeur |
| :--- | :--- |
| IP | `192.168.122.102` |
| vCPUs | 2 |
| RAM | 2048 Mo |
| Disque | 20 Go (qcow2) |
| User | debian / debian |
| Kernel headers | installés automatiquement |

## Tâches du playbook principal (playbook.yml)

| Tâche Ansible | Module utilisé | Action |
| :--- | :--- | :--- |
| Installer QEMU/KVM | `community.general.pacman` | Installe qemu-full, libvirt, virt-manager, virt-install, dnsmasq, cloud-image-utils, cdrtools, wget sur l'hôte Arch Linux. |
| Activer libvirtd | `ansible.builtin.systemd` | Démarre et active en autostart le daemon libvirt qui gère les VMs QEMU/KVM. |
| Ajouter au groupe libvirt | `ansible.builtin.user` | Ajoute l'utilisateur courant aux groupes `libvirt` et `kvm` pour accéder aux VMs sans sudo. |
| Réseau virtuel default | `ansible.builtin.command` | Démarre et active en autostart le réseau NAT libvirt "default" (plage 192.168.122.0/24, bridge virbr0). |
| Télécharger image cloud | `ansible.builtin.get_url` | Télécharge l'image officielle Debian 12 generic amd64 au format qcow2 depuis cloud.debian.org (uniquement si absente). |
| Créer répertoire partagé | `ansible.builtin.file` | Crée `/var/lib/libvirt/vm-share/` (mode 777) pour le partage de fichiers hôte ↔ VMs via VirtIO 9p. |
| Provisionner les VMs | `ansible.builtin.include_tasks` | Itère sur la liste `vms` et appelle `create_vm.yml` pour chaque machine. |

## Tâches create_vm.yml — Création individuelle d'une VM

| Étape | Action | Détail technique |
| :--- | :--- | :--- |
| Vérification existence | virsh dominfo | Vérifie si la VM existe déjà (idempotence). Si rc=0, le bloc de création est skippé. |
| Copie image | cp qcow2 base | Copie l'image cloud Debian de base pour créer un disque individuel par VM. |
| Resize disque | qemu-img resize | Agrandit le disque qcow2 à 20 Go (l'image cloud de base fait ~2 Go). |
| Cloud-init meta-data | Génération YAML | Définit l'instance-id et le hostname de la VM. |
| Cloud-init user-data | Génération YAML | Configure : utilisateurs (debian + root), sudo NOPASSWD, SSH par mot de passe, paquets à installer, montage du répertoire partagé, linux-headers. |
| Cloud-init network-config | Génération YAML netplan | Configure une IP statique (192.168.122.101 ou .102), gateway .1, DNS 8.8.8.8. |
| ISO cloud-init | genisoimage | Crée un ISO "seed" (volume label: cidata) contenant les trois fichiers cloud-init. Monté comme cdrom dans la VM. |
| virt-install | Création VM QEMU/KVM | Crée la VM avec : disques virtio, réseau virtio NAT, filesystem 9p partagé, canal QEMU guest agent SPICE, import direct (pas d'installateur). |
| Autostart | virsh autostart | Active le démarrage automatique de la VM quand libvirtd démarre. |

:::success Idempotence
Le playbook peut être exécuté plusieurs fois sans effet de bord. La vérification via `virsh dominfo` et le flag `force: false` sur la copie de l'image garantissent qu'une VM existante n'est pas recréée.
:::
