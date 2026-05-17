# Code signing — Win + macOS

Senza code signing, gli installer mostrano warning bloccanti (SmartScreen su Win, Gatekeeper su macOS) e il tasso di reso esplode. Step minimi per produzione.

## macOS

1. Iscriviti al [Apple Developer Program](https://developer.apple.com/programs/) (~$99/anno).
2. Crea un **Developer ID Application** certificate da Xcode → Settings → Accounts.
3. Esporta in formato `.p12` con password.
4. Su CI / build locale, configura env:
   ```
   APPLE_CERTIFICATE=<base64 del .p12>
   APPLE_CERTIFICATE_PASSWORD=<password p12>
   APPLE_SIGNING_IDENTITY=Developer ID Application: TUO NOME (TEAMID)
   APPLE_ID=<email apple>
   APPLE_PASSWORD=<app-specific-password>
   APPLE_TEAM_ID=<team id>
   ```
5. Tauri firma automaticamente in build se trova queste env.
6. **Notarization**: Tauri 2 invia il bundle ad Apple per notarizzazione (ci vogliono 1-10 min).

## Windows

1. Compra un **Code Signing Certificate EV** da Sectigo (~€280/anno).
2. Riceverai un token hardware USB o (più moderno) un Azure Key Vault cert.
3. Configura env:
   ```
   WINDOWS_CERTIFICATE_THUMBPRINT=<sha1 del cert>
   WINDOWS_CERTIFICATE_PASSWORD=<password>
   ```
4. Tauri usa `signtool.exe` (Windows SDK) per firmare il `.msi`.

## Tauri updater signing (separato!)

Diverso da signing OS. Serve per firmare i bundle che il updater scarica.

```bash
pnpm --filter @mini-tools/estrattore-fatture exec tauri signer generate -w ~/.tauri/estrattore-fatture.key
```

- La chiave privata resta locale / in env del CI.
- La chiave pubblica va in `apps/<tool>/src-tauri/tauri.conf.json` (campo `plugins.updater.pubkey`).
- Ogni release firma il bundle e produce un `.sig` da pubblicare insieme.

## CI release pipeline

Vedi `.github/workflows/release-estrattore-fatture.yml`.
