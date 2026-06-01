# mainilkanjo – automatisierte Social-Media-Pipeline (Instagram + Facebook)

Erzeugt ~2 Beiträge pro Woche **vollautomatisch**: Content aus dem WordPress-Blog
und den anonymisierten Fallstudien → Caption im mainilkanjo-Markenton → KI-Motiv
über **OpenAI `gpt-image-1`** → markengerechte grafische Aufbereitung → **Freigabe per
Klick in GitHub** → automatische Veröffentlichung auf Instagram **und** Facebook.

```
GitHub Actions Cron (Di + Do)
  └─ Job "generate"   Content wählen · Caption texten · Motiv generieren · Marken-Overlay
       └─ git push  (Bild bekommt öffentliche URL) + Vorschau in der Lauf-Zusammenfassung
            └─ Job "publish"  wartet hinter Environment "freigabe" (Pflicht-Freigabe)
                 └─ GitHub mailt "Freigabe nötig" → du klickst 1× "Approve and deploy"
                      └─ publish.mjs → Instagram + Facebook
```

Kein eigener Server, kein E-Mail-Setup, keine PHP-Datei nötig – die Freigabe läuft
komplett über GitHubs eingebaute Deployment-Freigabe. Laufende Kosten: ~0,30–0,50 €
pro Woche (OpenAI-Bilder), GitHub Actions ist kostenlos.

---

## Was läuft schon, was musst DU einrichten

Der komplette Code steht. Damit es live geht, brauchst du **drei Zugänge**
(GitHub-Repo, OpenAI, Meta) und musst die zugehörigen **GitHub Secrets** eintragen
sowie **einmalig die Freigabe-Umgebung** anlegen.

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

> ⚠️ Damit `gpt-image-1` nutzbar ist, muss deine OpenAI-Organisation ggf. einmal verifiziert sein.
> Bei Bild-Fehlern: in den OpenAI-Settings *Verify Organization* prüfen.

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

### 4. Freigabe-Umgebung anlegen  (das ist die Freigabe – einmalig, ~30 Sek.)
Repo → *Settings → Environments → New environment* → Name exakt **`freigabe`** →
*Configure environment* → Häkchen bei **Required reviewers** → dich selbst hinzufügen →
**Save protection rules**.

Damit wartet der Veröffentlichen-Job, bis du freigibst. GitHub schickt dir bei jedem
neuen Beitrag automatisch eine „Freigabe nötig"-Mail an deine GitHub-Adresse.

### 5. GitHub Secrets eintragen
Repo → *Settings → Secrets and variables → Actions → New repository secret*:

| Secret | Wert |
|---|---|
| `OPENAI_API_KEY` | dein OpenAI-Key |
| `IG_USER_ID` | Instagram-Business-Account-ID |
| `FB_PAGE_ID` | Facebook-Seiten-ID |
| `META_ACCESS_TOKEN` | langlebiges Page-/System-User-Token |
| `IMAGE_BASE_URL` | *(optional, nur bei privatem Repo)* |

Mehr ist nicht nötig – kein SMTP, kein zweiter Token, kein `APPROVE_SECRET`.

---

## Testen (ohne irgendwas zu posten)
```bash
npm install
cp .env.example .env   # OPENAI_API_KEY eintragen
npm run dry-run        # erzeugt Caption + fertiges Motiv in dry-run/, postet NICHTS
```
Schau dir `dry-run/<slug>.jpg` und die ausgegebene Caption an.

## Echter Lauf
- **Manuell auslösen:** Repo → *Actions → „Beitrag erzeugen & freigeben" → Run workflow*.
- **Automatisch:** läuft Di + Do 07:00 UTC (in `.github/workflows/generate.yml` änderbar).
- Nach dem `generate`-Job: oben auf der Lauf-Seite **„Review deployments" → „freigabe"
  ankreuzen → „Approve and deploy"** → Beitrag geht auf IG + FB live.
  Bild + Caption siehst du vorher in der **Zusammenfassung** des Laufs.
  Klickst du **„Reject"** (oder nichts), passiert nichts.

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
- Motive werden generativ erstellt – die Freigabe per Klick ist bewusst der Qualitäts-Check.
- Captions nutzen nur Fakten aus Blog/Fallstudie; trotzdem vor Freigabe kurz drüberlesen.
- Lehnst du einen Beitrag mit „Reject" ab, bleibt der Entwurf in `pending/` liegen
  (kann bei Bedarf manuell gelöscht werden).
