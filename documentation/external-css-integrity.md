# External CSS integrity audit

Remote stylesheets are build inputs and must be pinned with a SHA-256 SRI value. The build rejects missing or malformed integrity metadata, verifies cached bytes on every read, and verifies downloaded bytes before decoding, preprocessing, caching, or publishing them. Routine tests and quality builds use `tests/fixtures/css/safe.min.css` and do not access the public network.

## Current audited resource

- URL: `https://unpkg.com/bulma@1.0.4/css/bulma.min.css`
- Verification response: HTTP 200, no redirect, `text/css; charset=utf-8`
- Raw size: 677931 bytes
- SHA-256 hex: `67fa26df1ca9e95d8f2adc7c04fa1b15fa3d24257470ebc10cc68b9aab914bee`
- SRI: `sha256-Z/om3xyp6V2PKtx8BPobFfo9JCV0cOvBDMaLmquRS+4=`

The values were independently rechecked against the exact pinned URL before updating `index.html`. Run this one-off maintainer audit only when intentionally renewing a pinned resource:

```bash
node -e "fetch('https://unpkg.com/bulma@1.0.4/css/bulma.min.css',{redirect:'manual'}).then(async r=>{const b=Buffer.from(await r.arrayBuffer());const h=require('node:crypto').createHash('sha256').update(b).digest('hex');console.log(JSON.stringify({status:r.status,location:r.headers.get('location'),contentType:r.headers.get('content-type'),bytes:b.length,sha256:h,sri:'sha256-'+Buffer.from(h,'hex').toString('base64')}))}).catch(e=>{console.error(e);process.exit(1)})"
```

Confirm status 200, `location: null`, a CSS content type, the expected byte count, and the digest through an independent trusted release source. If the network is unavailable or any value differs, do not update the pinned digest or resource; leave the change pending maintainer confirmation. Never put this request into tests or normal build gates.

## Renewal procedure

1. Pin the dependency URL to an exact release; do not use a moving tag or version range.
2. Run the command above with the exact new URL and record its response metadata, raw byte count, SHA-256 hex, and SRI token.
3. Independently compare the release and digest with a trusted upstream source.
4. Update the `href`, `integrity`, and this audit record together. Keep `crossorigin="anonymous"`.
5. Run `npm run check`, which remains offline for CSS inputs.

Redirects default to HTTPS destinations on the original origin. Add a canonical HTTPS origin to `config/external-css.yaml` only after auditing an intentional cross-origin redirect. Time, byte, and redirect limits in that file are strict build-stopping controls.
