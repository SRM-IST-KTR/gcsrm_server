# Certificate Generation & Verification System

This document explains how to use the certificate generation and verification system.

## Features

✅ **Generate Certificates** - Create personalized certificates with custom fonts and styling
✅ **Multiple Output Formats** - Support for base64, PNG image, and PDF formats
✅ **Google Fonts Support** - Use any Google Font via CSS links
✅ **Certificate Tracking** - Each certificate gets a unique ID for verification
✅ **Digital Signatures** - Certificates are cryptographically signed for authenticity
✅ **Revocation Support** - Ability to revoke certificates if needed

---

## API Endpoints

### 1. Generate Certificate

**POST** `/api/certificates/generate`

Generates a personalized certificate for a participant with support for multiple output formats.

#### Request Body

```json
{
  "email": "john@email.com",
  "event": "hackathon-2024",
  "type": "participant",
  "format": "base64"
}
```

**Parameters:**

- `email` (required): Participant's email address
- `event` (required): Event slug
- `type` (required): Certificate type (`participants`, `organizers`, `volunteers`, `speakers`, `winners`)
- `format` (optional): Output format - `base64` (default), `image`, or `pdf`

#### Response Formats

**Base64 Response (format: "base64" or omitted):**

```json
{
  "success": true,
  "certificate": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "name": "John Doe",
  "certificateId": "HACKATHON-2024-X7B9K2",
  "issueDate": "2024-01-15T10:30:00.000Z"
}
```

**Image Response (format: "image"):**

Returns PNG image directly with headers:

- `Content-Type: image/png`
- `Content-Disposition: inline; filename="certificate-{id}.png"`
- `X-Certificate-Id: {certificateId}`

**PDF Response (format: "pdf"):**

Returns PDF document directly with headers:

- `Content-Type: application/pdf`
- `Content-Disposition: inline; filename="certificate-{id}.pdf"`
- `X-Certificate-Id: {certificateId}`

---

### 2. Verify Certificate

**GET** `/api/certificates/verify/:certificateId`

Verifies if a certificate is valid and authentic using its digital signature.

#### Request

```
GET /api/certificates/verify/HACKATHON-2024-X7B9K2
```

#### Response (Valid Certificate)

```json
{
  "success": true,
  "verified": true,
  "status": "valid",
  "certificate": {
    "certificateId": "HACKATHON-2024-X7B9K2",
    "participantName": "John Doe",
    "eventSlug": "hackathon-2024",
    "certificateType": "participant",
    "issueDate": "2024-01-15T10:30:00.000Z",
    "eventName": "Annual Hackathon 2024"
  },
  "security": {
    "signatureVerified": true,
    "message": "Digital signature verified successfully"
  }
}
```

#### Response (Revoked Certificate)

```json
{
  "success": true,
  "verified": false,
  "status": "revoked",
  "message": "This certificate has been revoked",
  "revokedAt": "2024-02-01T15:00:00.000Z",
  "revokedReason": "Duplicate certificate issued"
}
```

#### Response (Not Found)

```json
{
  "success": false,
  "error": "Certificate not found",
  "verified": false
}
```

---

### 3. Download Certificate

**GET** `/api/certificates/download/:certificateId?format=png`

Downloads a previously issued certificate in PNG or PDF format.

#### Request

```
GET /api/certificates/download/HACKATHON-2024-X7B9K2?format=pdf
```

**Parameters:**

- `certificateId` (required): The unique certificate ID
- `format` (optional): Output format - `png` (default) or `pdf`

#### Response

Returns the certificate file directly with headers:

**PNG Download:**

- `Content-Type: image/png`
- `Content-Disposition: attachment; filename="certificate-{id}-{name}.png"`
- `X-Certificate-Id: {certificateId}`
- `X-Certificate-Verified: true`

**PDF Download:**

- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="certificate-{id}-{name}.pdf"`
- `X-Certificate-Id: {certificateId}`
- `X-Certificate-Verified: true`

---

## MongoDB Event Schema

### Event Configuration

Each event in MongoDB should have the following structure:

```json
{
  "jimp_config": {
    "color": "white",
    "font_size": "72",
    "font_family": "Rouge Script",
    "text_align": "center",
    "xOffset": "-100",
    "yOffset": "-10",
    "uppercase": false,
    "fonts": {
      "Poppins": "https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrFJDUc1NECPY.ttf",
      "Rouge Script": "https://fonts.googleapis.com/css2?family=Rouge+Script&display=swap",
      "Birthstone": "https://fonts.gstatic.com/s/birthstone/v16/8AtsGs2xO4yLRhy87sv_LLDzjDXaDzIUAA.woff2"
    }
  }
}
```

### Font Configuration Options

#### 1. Google Fonts CSS Link (Recommended)

```json
"fonts": {
  "Rouge Script": "https://fonts.googleapis.com/css2?family=Rouge+Script&display=swap",
  "BBH Sans Hegarty": "https://fonts.googleapis.com/css2?family=BBH+Sans+Hegarty&display=swap"
}
```

### jimp_config Parameters


| Parameter     | Type    | Description                                    | Example                         |
| ------------- | ------- | ---------------------------------------------- | ------------------------------- |
| `color`       | String  | Text color                                     | `"white"` or `"black"`          |
| `font_size`   | String  | Font size in pixels                            | `"72"`, `"64"`, `"48"`          |
| `font_family` | String  | Font family name (must exist in`fonts` object) | `"Rouge Script"`                |
| `text_align`  | String  | Text alignment                                 | `"center"`, `"left"`, `"right"` |
| `xOffset`     | String  | Horizontal offset in pixels                    | `"-100"`, `"0"`, `"50"`         |
| `yOffset`     | String  | Vertical offset in pixels                      | `"-10"`, `"100"`, `"0"`         |
| `uppercase`   | Boolean | Convert name to uppercase                      | `true` or `false`               |
| `fonts`       | Object  | Font definitions                               | See examples above              |

---

## Issued Certificate Schema

Each generated certificate is saved in MongoDB with this structure:

```json
{
  "certificateId": "HACKATHON-2024-X7B9K2",
  "participantName": "John Doe",
  "participantEmail": "john@email.com",
  "eventSlug": "hackathon-2024",
  "certificateType": "participant",
  "issueDate": "2024-01-15T10:30:00.000Z",
  "digitalSignature": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
  "isRevoked": false,
  "revokedAt": null,
  "revokedReason": null,
  "metadata": {
    "eventName": "Annual Hackathon 2024",
    "generatedAt": "2024-01-15T10:30:00.000Z"
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## Usage Examples

### Example 1: Generate Certificate (Base64 JSON Response)

```javascript
const response = await fetch('https://your-api.com/api/certificates/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'alice@example.com',
    event: 'tech-fest-2024',
    type: 'participants',
    format: 'base64' // or omit for default
  })
});

const data = await response.json();
console.log('Certificate ID:', data.certificateId);
// Display certificate image: <img src={data.certificate} />
```
### Example 2: Generate Certificate (Direct Image)

```javascript
const response = await fetch('https://your-api.com/api/certificates/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'alice@example.com',
    event: 'tech-fest-2024',
    type: 'participants',
    format: 'image'
  })
});

const certificateId = response.headers.get('X-Certificate-Id');
const blob = await response.blob();
const imageUrl = URL.createObjectURL(blob);
// Display: <img src={imageUrl} />
```
### Example 3: Generate Certificate (PDF)

```javascript
const response = await fetch('https://your-api.com/api/certificates/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'alice@example.com',
    event: 'tech-fest-2024',
    type: 'participants',
    format: 'pdf'
  })
});

const certificateId = response.headers.get('X-Certificate-Id');
const blob = await response.blob();
const pdfUrl = URL.createObjectURL(blob);
// Display in iframe: <iframe src={pdfUrl} />
// Or download: <a href={pdfUrl} download="certificate.pdf">Download</a>
```
### Example 4: Verify a Certificate

```javascript
const certificateId = 'TECH-FEST-2024-X7B9K2';
const response = await fetch(`https://your-api.com/api/certificates/verify/${certificateId}`);
const data = await response.json();

if (data.verified && data.security.signatureVerified) {
  console.log('✅ Valid certificate for:', data.certificate.participantName);
  console.log('Issued:', data.certificate.issueDate);
} else {
  console.log('❌ Invalid or revoked certificate');
}
```
### Example 5: Download Certificate as PDF

```javascript
const certificateId = 'TECH-FEST-2024-X7B9K2';
const response = await fetch(
  `https://your-api.com/api/certificates/download/${certificateId}?format=pdf`
);

if (response.ok) {
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  
  // Trigger browser download
  const a = document.createElement('a');
  a.href = url;
  a.download = `certificate-${certificateId}.pdf`;
  a.click();
}
```
### Example 6: Revoke a Certificate (Backend)

```javascript
const IssuedCertificate = require('./models/certificate.model');

const certificate = await IssuedCertificate.findOne({ 
  certificateId: 'HACKATHON-2024-X7B9K2' 
});

if (certificate) {
  await certificate.revoke('Duplicate certificate issued');
  console.log('Certificate revoked successfully');
}
```

---

## How It Works

### Certificate Generation Flow

1. **Request Received** - Client sends email, event slug, certificate type, and optional format
2. **Event Lookup** - System fetches event configuration from MongoDB
3. **User Validation** - Checks if user exists in the event's participant database
4. **Font Resolution** - If using Google Fonts CSS, extracts actual font file URL
5. **Image Generation** - Uses Sharp + SVG to overlay name on certificate template
6. **Digital Signature** - Generates HMAC-SHA256 signature with secret salt
7. **Certificate Tracking** - Saves certificate with unique ID to database
8. **Format Response** - Returns certificate in requested format (base64/image/PDF)

### Font Loading Process

1. **Google Fonts CSS** (`fonts.googleapis.com/css`) → Fetches CSS → Extracts woff2 URL → Downloads font
2. **Direct Font URL** (`.ttf`, `.woff2`, `.otf`) → Downloads directly
3. **Fallback** - If font loading fails, uses system sans-serif font

### Digital Signature

Each certificate is signed using **HMAC-SHA256** with a server-side secret salt. The signature includes:

```
{certificateId}|{participantName}|{email}|{eventSlug}|{certificateType}|{issueDate}|{secret}
```
**Security Features:**

- **HMAC-SHA256** - Keyed-hash message authentication code (more secure than plain SHA256)
- **Secret Salt** - Server-side secret from `process.env.CERTIFICATE_SECRET`
- **Tamper Detection** - Any modification to certificate data invalidates the signature
- **Verification** - Signature is recomputed and compared during verification

This ensures certificate authenticity and prevents forgery or tampering.

---

## Security Considerations

✅ **Unique Certificate IDs** - Each certificate has a unique, non-guessable ID (EVENT-SLUG-YEAR-RANDOM)
✅ **HMAC-SHA256 Signatures** - Cryptographic signatures prevent forgery and tampering
✅ **Secret Salt** - Server-side secret key required for signature generation
✅ **Signature Verification** - Recomputed signatures must match stored signatures
✅ **Revocation Support** - Invalid certificates can be revoked with reason tracking
✅ **Email Verification** - Only registered participants can generate certificates
✅ **Database Validation** - Certificate must exist in event-specific database
✅ **Tamper Detection** - Any modification to certificate data is detected during verification

**Important:** Ensure `CERTIFICATE_SECRET` environment variable is set to a strong, random value in production!

---

## Troubleshooting

### Certificate Not Generated

- **Check** if event exists with the provided slug
- **Check** if participant email exists in event database
- **Check** if certificate template URL is accessible
- **Check** if font URLs are valid and accessible

### Font Not Applied

- **Check** if font family name matches key in `fonts` object
- **Check** if Google Fonts CSS link is valid
- **Check** server logs for font loading errors

### Verification Fails

- **Check** if certificate ID is correct (case-sensitive)
- **Check** if certificate was actually generated (not just previewed)
- **Check** if certificate has been revoked

---

## Environment Variables

Make sure to set the following environment variable in your `.env` file:

```bash
CERTIFICATE_SECRET=your-super-secret-random-string-here
```
**Security Note:** Use a strong, random string (at least 32 characters). Never commit this to version control!

---

## Quick Start

1. **Generate a certificate:**

   ```bash
   curl -X POST http://localhost:3000/api/certificates/generate \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","event":"hackathon-2024","type":"participants","format":"pdf"}'
   ```
2. **Verify a certificate:**

   ```bash
   curl http://localhost:3000/api/certificates/verify/HACKATHON-2024-X7B9K2
   ```
3. **Download a certificate:**

   ```bash
   curl http://localhost:3000/api/certificates/download/HACKATHON-2024-X7B9K2?format=pdf \
     --output certificate.pdf
   ```

---

**Last Updated:** October 2025
