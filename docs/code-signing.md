# Code signing — perché serve, quanto costa, come si fa

## Il problema "Utente sconosciuto"

Quando installi un `.msi` o un `.exe` non firmato su Windows, **SmartScreen** mostra:

> Microsoft Defender SmartScreen ha impedito l'avvio di un'app non riconosciuta.
> Editore: **Utente sconosciuto**

Su macOS, **Gatekeeper** dice:

> «Estrattore Fatture» non può essere aperto perché non è stato possibile verificare lo sviluppatore.

Questo è un comportamento **by design** dei sistemi operativi, non un bug nelle app. Si attiva ogni volta che il binario non è firmato con un certificato di un'authority riconosciuta. Anche app perfettamente sicure hanno questo problema fino a quando non vengono firmate.

**Non esiste un bypass tecnico**. L'unico modo per togliere il warning è acquistare i certificati e firmare le build.

## Workaround temporanei per testing

### Windows
1. Click su "Ulteriori informazioni" (link in piccolo)
2. Compare il bottone "Esegui comunque" → click

### macOS
1. Tasto destro sull'app → "Apri" (NON doppio click). La prima volta chiede conferma, poi sblocca.
2. Oppure: Sistema → Privacy e Sicurezza → "Apri comunque" (appare per 1h dopo il primo tentativo bloccato)

## Soluzione definitiva: code signing certificates

Per la vendita su TikTok Shop / qualsiasi distribuzione professionale, **devi acquistare i cert**. Altrimenti tasso di abbandono >50% perché chi compra vede "App non riconosciuta" e teme un virus.

### Costi annuali

| Componente | Provider consigliato | Costo |
|---|---|---|
| **Windows EV Code Signing** | Sectigo / SSL.com / DigiCert | €280–400/anno |
| **Apple Developer Program** (firma macOS + notarizzazione) | Apple | $99/anno (~€90) |
| **Totale** | | **~€370–490/anno** |

### Differenza EV vs OV (Windows)

- **EV (Extended Validation)**: SmartScreen ti riconosce **subito** come editore fidato. Required per software commerciale.
- **OV (Organization Validation)**: cheaper (~€100/anno) ma SmartScreen blocca finché il tuo cert non accumula "reputation" (~500-1000 download). Per i primi mesi mostra comunque l'avviso. **Non consigliato** per il tuo caso.

### Per Windows EV — passi pratici

1. **Compra il cert** da Sectigo (sectigo.com) o SSL.com. Ti chiedono:
   - Documento d'identità
   - P.IVA
   - Eventualmente visura camerale
   - Verifica telefonica
2. **Ricevi il token USB hardware** (per legge il private key deve stare su hardware HSM — non puoi scaricare il cert come file)
3. **Configuri signtool** su Windows per firmare:
   ```powershell
   signtool sign /fd SHA256 /tr http://timestamp.sectigo.com /td SHA256 file.msi
   ```
4. Il workflow GitHub Actions può firmare via **SignPath** (servizio cloud che gestisce il token HSM per te) o via **Azure Key Vault** integration.

### Per macOS — passi pratici

1. Iscriviti al **Apple Developer Program** su developer.apple.com (servono Apple ID + numero D-U-N-S se sei azienda, gratis su upgrade.dnb.com)
2. Da Xcode → Settings → Accounts crei un **Developer ID Application** certificate
3. Esporta in `.p12` con password
4. Configura le env nel CI:
   ```
   APPLE_CERTIFICATE=<base64 del .p12>
   APPLE_CERTIFICATE_PASSWORD=<password>
   APPLE_SIGNING_IDENTITY=Developer ID Application: TUO NOME (TEAMID)
   APPLE_ID=<email apple>
   APPLE_PASSWORD=<app-specific-password>  ← non la password Apple ID! generala su appleid.apple.com
   APPLE_TEAM_ID=<team id>
   ```
5. Tauri firma + notarizza automaticamente se trova queste env

## Integrazione nel nostro workflow

Quando avrai i cert, basta aggiungere i secret su GitHub:

GitHub → repo → Settings → Secrets and variables → Actions → New repository secret:
- `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`
- `WINDOWS_CERTIFICATE_THUMBPRINT`, `WINDOWS_CERTIFICATE_PASSWORD` (o SignPath token)

Poi modifico `build-all.yml` per ri-passare queste env al Tauri build step, e gli installer vengono firmati automaticamente.

## Vai sul mercato senza signing?

Solo se vuoi distribuire ad amici/colleghi/test interni. Mai per vendita pubblica.

Tasso di reso atteso da TikTok Shop senza signing: 30-60% (gente che compra, vede warning, chiede refund).
Tasso di reso con signing EV + Apple: <5%.

In termini di ROI: vendi 10 licenze a €69 = €690. Senza signing perdi €300+ in refund = ROI negativo. €400/anno di cert ripaga al ~6° tool venduto.

## Riferimenti

- [Sectigo EV Code Signing](https://www.sectigo.com/code-signing-certificate)
- [Apple Developer Program](https://developer.apple.com/programs/)
- [Tauri 2 — signing docs](https://v2.tauri.app/distribute/sign/)
- [SignPath (cert management cloud)](https://signpath.io/)
