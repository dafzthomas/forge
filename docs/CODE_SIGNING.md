# Code Signing Setup

## macOS

### Requirements
1. Apple Developer account ($99/year)
2. Developer ID Application certificate
3. App-specific password for notarization

### GitHub Secrets Required
- `MACOS_CERTIFICATE`: Base64-encoded .p12 certificate
- `MACOS_CERTIFICATE_PWD`: Certificate password
- `KEYCHAIN_PASSWORD`: Password for temporary keychain
- `APPLE_ID`: Your Apple ID email
- `APPLE_APP_SPECIFIC_PASSWORD`: App-specific password from appleid.apple.com
- `APPLE_TEAM_ID`: Your Apple Developer Team ID

### Generate Certificate
1. Open Keychain Access
2. Certificate Assistant > Request a Certificate from a Certificate Authority
3. Go to developer.apple.com > Certificates
4. Create "Developer ID Application" certificate
5. Download and install in Keychain
6. Export as .p12 file
7. Base64 encode: `base64 -i certificate.p12 | pbcopy`

## Windows

### Requirements
1. Code signing certificate (EV or standard)
2. SignTool (included in Windows SDK)

### GitHub Secrets Required
- `CSC_LINK`: Base64-encoded .pfx certificate or URL
- `CSC_KEY_PASSWORD`: Certificate password
- `WIN_CERT_SUBJECT`: Certificate subject name
- `WIN_PUBLISHER_NAME`: Publisher name for NSIS

### Local Testing
Set environment variables and run:
```bash
npm run package:win
```
