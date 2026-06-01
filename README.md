# mainilkanjo – automatisierte Social-Media-Pipeline (Instagram + Facebook)

Erzeugt ~2 Beiträge pro Woche **vollautomatisch**: Content aus dem WordPress-Blog
und den anonymisierten Fallstudien → Caption im mainilkanjo-Markenton → KI-Motiv
über **OpenAI `gpt-image-1`** → markengerechte grafische Aufbereitung → **Freigabe per
E-Mail-Button** → automatische Veröffentlichung auf Instagram **und** Facebook.

```
GitHub Actions Cron (Di + Do)
  └─ generate.mjs   Content wählen · Caption texten · Motiv generieren · Marken-Overlay
       └─ git push  (Bild bekommt öffentliche URL)
            └─ notify.mjs  Freigabe-Mail mit ✅/✕ Buttons an dich
                 └─ du klickst ✅ → social-approve.php (auf dem WP-Server)
                      └─ repository_dispatch → publish.mjs → Instagram + Facebook
```

Kein eigener Server nötig. Laufende Kosten: ~0,30–0,50 € pro Woche (OpenAI-Bilder),
GitHub Actions & E-Mail sind kostenlos.

---

## Was läuft schon, was musst DU einrichten

Der komplette Code steht. Damit es live geht, brauchst du **vier Zugänge** und musst
die zugehörigen **GitHub Secrets** + die **PHP-Datei auf dem WP-Server** eintragen.

### 1. GitHub-Repo anlegen
1. Neues Repo erstellen, z. B. `mainilkanjo-social`. **Öffentlich** ist am einfachsten
   (die generierten Bilder brauchen eine öffentliche URL, damit Instagram sie abholen kann –
   im Repo liegen nur Marketing-Bilder + Code, **keine** Passwörter; die liegen in Secrets).
   *Alternative für privates Repo:* Bilder über die eigene Domain ausliefern und
   `IMAGE_BASE_URL` setzen (siehe unten).
2. Diesen Ordner hochladen:
   ```bash
   cd mainilkanjo-social
   git init && git add . && git commit -m "init social pipeline"
   git branch -M main
   git remote add origin https://github.com/<DEIN-NAME>/mainilkanjo-social.git
   git push -u origin main
   ```

### 2. OpenAI-API-Key  (Bilder + Caption)
- platform.openai.com → API Keys → neuen Key erstellen.
- Etwas Guthaben aufladen. `gpt-image-1` kostet bei `quality: medium` ~0,04 $/Bild.

### 3. Meta: Instagram + Facebook posten (Graph API)
> Voraussetzung (laut deiner Angabe vorhanden): **Facebook-Seite** + **Instagram-Business-Account**,
> miteinander verknüpft (im Meta Business Manager unter *Konten → Instagram*).

Token + IDs besorgen:
1. **developers.facebook.com** → *My Apps* → *Create App* → Typ **Business**.
2. Produkt **Instagram Graph API** (und *Facebook Login for Business*) hinzufügen.
3. Im **Graph API Explorer** (Tools) deine App wählen und ein **User-Token** mit diesen
   Berechtigungen generieren:
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`,
   `instagram_basic`, `instagram_content_publish`, `business_management`.
4. **FB_PAGE_ID + Page-Token holen:** im Explorer `GET /me/accounts` aufrufen →
   liefert deine Seite mit `id` (= `FB_PAGE_ID`) und einem **Page Access Token**.
5. **IG_USER_ID holen:** `GET /<FB_PAGE_ID>?fields=instagram_business_account&access_token=<PAGE-TOKEN>`
   → das `instagram_business_account.id` ist deine `IG_USER_ID`.
6. **Token langlebig machen** (sonst läuft es nach ~1 h ab): über den Endpoint
   `GET /oauth/access_token?grant_type=fb_exchange_token&client_id=<APP-ID>&client_secret=<APP-SECRET>&fb_exchange_token=<PAGE-TOKEN>`
   → das Ergebnis ist dein **`META_ACCESS_TOKEN`** (langlebiges Page-Token, ~60 Tage;
   ein System-User-Token im Business Manager hält unbegrenzt – empfohlen, siehe Meta-Doku).

> ⚠️ Damit `gpt-image-1` nutzbar ist, muss deine OpenAI-Organisation ggf. einmal verifiziert sein.
> Bei Bild-Fehlern: in den OpenAI-Settings *Verify Organization* prüfen.

### 4. E-Mail-Versand (SMTP)
Zugangsdaten deines Postfachs `welcome@mainilkanjo.de` (Host/Port/User/Passwort).
Die Freigabe-Mail wird an `REVIEW_EMAIL_TO` geschickt.

### 5. Freigabe-Endpoint auf den WP-Server legen
1. `approve/social-approve.php` per FTP/SFTP ins Web-Root legen
   → erreichbar als `https://mainilkanjo.de/social-approve.php`.
2. Daneben `social-approve-config.php` anlegen (NICHT ins GitHub-Repo!):
   ```php
   <?php
   define('SOCIAL_APPROVE_SECRET', 'GLEICHES-Geheimnis-wie-APPROVE_SECRET');
   define('SOCIAL_GH_OWNER', '<DEIN-GITHUB-NAME>');
   define('SOCIAL_GH_REPO',  'mainilkanjo-social');
   define('SOCIAL_GH_TOKEN', 'github_pat_...'); // siehe Schritt 6
   ```

### 6. GitHub Fine-grained PAT (damit der Button den Workflow auslösen darf)
- github.com → *Settings → Developer settings → Fine-grained tokens* → neuer Token,
  nur auf das Repo `mainilkanjo-social`, Berechtigungen **Contents: Read and write**
  und **Actions: Read and write**. → als `SOCIAL_GH_TOKEN` in die PHP-Config eintragen.

### 7. GitHub Secrets eintragen
Repo → *Settings → Secrets and variables → Actions → New repository secret*:

| Secret | Wert |
|---|---|
| `OPENAI_API_KEY` | dein OpenAI-Key |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Postfach-Daten |
| `REVIEW_EMAIL_TO` | wohin die Freigabe-Mail geht |
| `APPROVE_ENDPOINT` | `https://mainilkanjo.de/social-approve.php` |
| `APPROVE_SECRET` | langes Zufallsgeheimnis (identisch zur PHP-Config) |
| `IG_USER_ID` | Instagram-Business-Account-ID |
| `FB_PAGE_ID` | Facebook-Seiten-ID |
| `META_ACCESS_TOKEN` | langlebiges Page-/System-User-Token |
| `IMAGE_BASE_URL` | *(optional, nur bei privatem Repo)* |

---

## Testen (ohne irgendwas zu posten)
```bash
npm install
cp .env.example .env   # OPENAI_API_KEY eintragen
npm run dry-run        # erzeugt Caption + fertiges Motiv in dry-run/, postet/mailt NICHTS
```
Schau dir `dry-run/<slug>.jpg` und die ausgegebene Caption an.

## Echter Lauf
- **Manuell auslösen:** Repo → *Actions → „Beitrag erzeugen & zur Freigabe mailen" → Run workflow*.
- **Automatisch:** läuft Di + Do 07:00 UTC (in `.github/workflows/generate.yml` änderbar).
- Du bekommst die Mail → klickst **✅ Veröffentlichen** → Beitrag geht auf IG + FB live.
  Klickst du nichts, passiert nichts.

## Stellschrauben
- **Markenton / Hashtags / CTA:** `config/brand.json`
- **Bild-Stil-Prompt:** `config/brand.json → image.stylePrompt`
- **Logo im Motiv:** `config/logo.png` ablegen (sonst Wortmarke „mainilkanjo")
- **Posting-Tage/-zeit:** `cron` in `generate.yml`
- **Fallstudien-Texte:** `content/cases.json` (Blog-Posts kommen automatisch per REST)
- Schon gepostete Inhalte stehen in `state/used.json` und werden nicht wiederholt,
  bis der Pool einmal durch ist.

## Wichtig / Grenzen
- Instagram-API-Posting geht **nur** mit Business-/Creator-Account.
- Motive werden generativ erstellt – die Freigabe per Mail ist bewusst der Qualitäts-Check.
- Captions nutzen nur Fakten aus Blog/Fallstudie; trotzdem vor Freigabe kurz drüberlesen.
