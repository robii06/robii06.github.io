---
id: architecture
title: Architecture
sidebar_position: 4
---

# Architecture du projet

## Structure des fichiers

```text
wlkom/
├── rootkit/
│   ├── main.c             # Point d'entrée du module (LKM)
│   ├── shell.c            # Bridge PTY et gestion TCP
│   ├── stealth.c          # Hooks ftrace et dissimulation lsmod
│   ├── persistence.c      # Installation auto du service systemd
│   ├── resolve.c          # Résolution de symboles via kprobe
│   └── Makefile           # Build du module .ko + install/uninstall
│
├── attacking_program/
│   ├── main.c             # Programme C côté attaquant (terminal RAW)
│   └── Makefile           # Compile l'attaquant
│
├── playbook.yml           # Ansible : déploiement 2 VMs QEMU/KVM
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
├── hook_install()           // ftrace getdents64
├── hide_from_lsmod()        // list_del
├── persist()                // auto-installation systemd
└── kthread_run(conn_loop)   // bridge PTY C
```

## Réseau, Communication & Sécurité

### Protocole TCP Reverse Shell & Mot de passe

WLKOM implémente un **reverse shell** : c'est la victime qui initie la connexion vers l'attaquant, et non l'inverse. Cette approche contourne les règles de pare-feu habituelles (entrant bloqué, sortant autorisé). 

Dès que la connexion TCP est établie, le noyau demande un mot de passe à l'attaquant. Ce mot de passe est haché en **SHA256** via la Crypto API du noyau (`crypto_shash_digest`) et comparé à un hash codé en dur. Si l'accès est refusé, la connexion se coupe.

| Paramètre | Valeur | Configurable dans |
| :--- | :--- | :--- |
| ATTACKER_IP | `192.168.122.101` | `config.h` |
| PORT | `4444` | `config.h` |
| RETRY_DELAY | `5000 ms` | `config.h` |
| Sécurité | Mot de passe (SHA256) | `shell.c` |
| Shell | `/bin/sh` natif via Kernel PTY | `shell.c` |
