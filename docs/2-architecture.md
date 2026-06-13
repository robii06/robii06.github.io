---
id: architecture
title: Architecture
sidebar_position: 2
---

# Architecture du projet

## Structure des fichiers

```text
wlkom/
├── rootkit/
│   ├── wlkom.c            # Module noyau principal (LKM)
│   ├── Makefile           # Build du module .ko + install/uninstall
│   └── wlkom.service      # Service systemd pour la persistance
│
├── attacking_program/
│   ├── attacker.c         # Programme C côté attaquant (terminal RAW)
│   ├── victim_userland.c  # Programme userland de test connexion
│   └── Makefile           # Compile attacker
│
├── playbook.yml           # Ansible : déploiement 2 VMs QEMU/KVM
├── create_vm.yml          # Ansible tasks : création individuelle VM
├── inventory.ini          # Ansible : hôte local
└── README.md              # Documentation rapide
```

## Séparation des composants

### Côté Attaquant (192.168.122.101)

Le programme attaquant est un serveur TCP écrit en C qui écoute sur le port 4444. Une fois la victime connectée, il bascule le terminal local en **mode RAW** et utilise `poll()` pour multiplexer stdin/socket en temps réel, offrant une interactivité totale (Ctrl+C, flèches, tab, etc.).

```c
socket() → bind() → listen() → accept()
set_conio_terminal_mode() // raw
while(1) {
  poll(fds, 2, -1)
  stdin → send(sock)
  recv(sock) → stdout
}
```

### Côté Victime (192.168.122.102)

Le module noyau WLKOM est chargé via `insmod`. Il tourne directement dans le kernel space et configure immédiatement sa propre persistance. Ensuite, il lance un **kthread** qui établit la connexion TCP, vérifie le mot de passe, crée un pseudo-terminal (PTY) directement dans le noyau, et invoque `/bin/sh` pour établir le reverse shell.

```c
wlkom_init()
├── try_module_get()         // lock
├── hook_install()           // ftrace
├── hide_from_lsmod()        // list_del
├── persist()                // auto-installation systemd
└── kthread_run(conn_loop)   // bridge PTY C
```

## Réseau, Communication & Sécurité

### Protocole TCP Reverse Shell & Mot de passe

WLKOM implémente un **reverse shell** : c'est la victime qui initie la connexion vers l'attaquant, et non l'inverse. Cette approche contourne les règles de pare-feu habituelles (entrant bloqué, sortant autorisé). 

Dès que la connexion TCP est établie, le noyau demande un mot de passe à l'attaquant. Ce mot de passe est haché en **SHA256** via la Crypto API du noyau (`crypto_shash_digest`) et comparé à un hash dur en dur. Si l'accès est refusé, la connexion se coupe.

| Paramètre | Valeur | Configurable dans |
| :--- | :--- | :--- |
| ATTACKER_IP | `192.168.122.101` | `wlkom.c` ligne 19 |
| PORT | `4444` | `wlkom.c` + `attacker.c` |
| RETRY_DELAY | `5000 ms` | `wlkom.c` ligne 21 |
| Sécurité | Mot de passe (SHA256) | `shell.c` (PASSWORD_HASH) |
| Shell | `/bin/sh` natif via Kernel PTY | `shell.c` |
