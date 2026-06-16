---
id: shell
title: 'Feature: Connexion & Shell'
sidebar_position: 5
---

# Feature: Connexion & Shell PTY

Cette section documente les fonctionnalités de communication interactive du rootkit, centrées sur le reverse shell PTY natif et la résilience de la connexion.

## Reverse Shell PTY Interactif

**Concept du reverse shell PTY en C**

Un reverse shell classique (comme `/bin/sh > /dev/tcp/...`) redirige simplement stdin/stdout vers une socket, ce qui pose problème avec les programmes interactifs (vim, htop) car il manque la gestion des signaux et de la taille du terminal.

WLKOM implémente un **PTY Bridge natif** intégralement en C dans l'espace noyau. Le module ouvre directement `/dev/ptmx` pour obtenir un Master PTY, crée deux kthreads relais (`sock_to_ptm` et `ptm_to_sock`), puis invoque nativement `/bin/sh` dont les flux standards sont attachés au PTY Slave (`/dev/pts/X`). 

## Résilience et Reconnexion

Le rootkit implémente une boucle de connexion infinie dans un thread noyau dédié :
- Si la connexion échoue ou est coupée, il attend `RETRY_DELAY` (5 secondes) avant de retenter.
- Cela garantit que l'attaquant peut retrouver l'accès même après un redémarrage de son propre serveur ou une coupure réseau temporaire.

## Fonctions côté noyau (shell.c)

| Fonction | Rôle | Mécanisme détaillé |
| :--- | :--- | :--- |
| `start_interactive_shell()` | Établit le PTY | Connecte la socket TCP, ouvre `/dev/ptmx`, lance les threads relais, et utilise `call_usermodehelper_setup` pour exécuter `/bin/sh`. |
| `sock_to_ptm()` / `ptm_to_sock()`| PTY Bridge (Relais) | Deux kthreads qui copient les données de manière asynchrone entre la socket et le Master PTY. Gère aussi le redimensionnement de fenêtre via protocole d'échappement. |

## Fonctions côté attaquant (main.c)

L'attaquant bascule son propre terminal en **mode RAW** pour transmettre les caractères bruts sans interprétation locale.

| Fonction | Rôle | Mécanisme détaillé |
| :--- | :--- | :--- |
| `set_raw_mode()` | Mode terminal RAW | Désactive ICANON et ECHO via `tcsetattr`. |
| `main()` | Multiplexage | Utilise `poll()` sur `stdin` et la socket pour une réactivité instantanée. |
| `sigwinch_handler()`| Redimensionnement | Intercepte les changements de taille de fenêtre locale et envoie les dimensions au rootkit via un paquet `0xff`. |
