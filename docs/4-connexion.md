---
id: connexion
title: Reverse Shell & Sécurité
sidebar_position: 4
---

# Reverse Shell PTY Interactif & Authentification

**Concept du reverse shell PTY en C**

Un reverse shell classique redirige simplement stdin/stdout vers une socket, ce qui pose problème avec les programmes interactifs (vim, htop). Au lieu d'utiliser un binaire externe comme Python, WLKOM implémente un **PTY Bridge natif** intégralement en C dans l'espace noyau.

Le module ouvre directement `/dev/ptmx` pour obtenir un Master PTY, crée deux kthreads relais (`sock_to_ptm` et `ptm_to_sock`), puis invoque nativement `/bin/sh` dont les flux standards sont attachés au PTY Slave (`/dev/pts/X`). 

## Authentification par mot de passe

Avant même de lancer le shell, le module exige un mot de passe de l'attaquant :

1. Envoi du prompt `Password: ` à la connexion TCP.
2. Le rootkit attend (timeout 30s) la saisie du mot de passe.
3. Le mot de passe est haché via la **Crypto API du noyau** (`crypto_alloc_shash("sha256", 0, 0)`).
4. Le hash est comparé avec `PASSWORD_HASH` durcodé. L'accès est refusé (`Access denied.\n`) si incorrect.

## Fonctions côté noyau (shell.c)

| Fonction | Rôle | Mécanisme détaillé |
| :--- | :--- | :--- |
| `check_password()` | Sécurité du Shell | Gère la réception du mot de passe, génère le digest SHA256, et le compare. |
| `start_interactive_shell()` | Établit le PTY | Connecte la socket TCP, ouvre `/dev/ptmx`, lance les threads relais, et utilise `call_usermodehelper_setup` pour exécuter `/bin/sh`. La fonction `shell_init` associe les descripteurs de fichiers au PTY. |
| `sock_to_ptm()` / `ptm_to_sock()`| PTY Bridge (Relais) | Deux kthreads qui copient les données de manière asynchrone entre la socket réseau de l'attaquant et le Master PTY du système. Support du redimensionnement de fenêtre via un protocole d'échappement (in-band resize). |

## Fonctions côté attaquant (attacker.c)

L'attaquant bascule son propre terminal en **mode RAW** pour transmettre les caractères bruts sans interprétation locale.

| Fonction | Rôle | Mécanisme détaillé |
| :--- | :--- | :--- |
| `set_raw_mode()` | Passe le terminal en mode RAW | Désactive ICANON (mode ligne) et ECHO dans `tcsetattr`. |
| `main()` | Authentification et multiplexage | Affiche le prompt de mot de passe, lit le mot de passe sans affichage (`ECHO` désactivé temporairement), puis utilise `poll()` sur `stdin` et la socket. |
| `sigwinch_handler()`| Redimensionnement PTY | Intercepte les changements de taille de fenêtre locale et envoie les nouvelles dimensions au rootkit via un paquet spécial (commençant par `0xff`). |

```c
/* Multiplexage de la connexion avec poll() */
while (1) {
    poll(fds, 2, -1);
    if (fds[0].revents & POLLIN) {  // frappe clavier
        n = read(STDIN_FILENO, buf, sizeof(buf));
        send(client_sock, buf, n, 0);
    }
    if (fds[1].revents & POLLIN) {  // réponse du shell
        n = recv(client_sock, buf, sizeof(buf), 0);
        if (n <= 0) break;
        write(STDOUT_FILENO, buf, n);
    }
}
```
