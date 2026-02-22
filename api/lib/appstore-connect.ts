/**
 * App Store Connect API Client
 * JWT generation and API calls for fetching app version review status
 */

import { createSign } from 'crypto';

const ASC_ISSUER_ID = process.env.ASC_ISSUER_ID || '';
const ASC_KEY_ID = process.env.ASC_KEY_ID || '';
const ASC_PRIVATE_KEY = process.env.ASC_PRIVATE_KEY || '';
const ASC_APP_ID = process.env.ASC_APP_ID || '';

/**
 * Generate a JWT for App Store Connect API authentication
 * Uses ES256 algorithm with the .p8 private key
 */
export function generateToken(): string {
  if (!ASC_ISSUER_ID || !ASC_KEY_ID || !ASC_PRIVATE_KEY) {
    throw new Error('Missing App Store Connect credentials (ASC_ISSUER_ID, ASC_KEY_ID, ASC_PRIVATE_KEY)');
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 20 * 60; // 20 minute expiry

  const header = {
    alg: 'ES256',
    kid: ASC_KEY_ID,
    typ: 'JWT',
  };

  const payload = {
    iss: ASC_ISSUER_ID,
    iat: now,
    exp,
    aud: 'appstoreconnect-v1',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Handle private key — may be raw or PEM formatted, newlines may be escaped
  let privateKey = ASC_PRIVATE_KEY.replace(/\\n/g, '\n');
  if (!privateKey.includes('-----BEGIN')) {
    privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
  }

  const sign = createSign('SHA256');
  sign.update(signingInput);
  sign.end();

  const derSignature = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' });
  const encodedSignature = base64UrlEncode(derSignature);

  return `${signingInput}.${encodedSignature}`;
}

function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface AppStoreVersion {
  id: string;
  type: string;
  attributes: {
    versionString: string;
    platform: string;
    appStoreState: string;
    createdDate: string;
    releaseType?: string;
  };
  relationships?: {
    appStoreVersionSubmission?: {
      data?: { id: string } | null;
    };
  };
}

export interface AppStoreVersionSubmission {
  id: string;
  type: string;
  attributes: {
    submittedDate?: string;
  };
}

export interface ASCApiResponse {
  data: AppStoreVersion[];
  included?: AppStoreVersionSubmission[];
}

/**
 * Fetch current app store versions from App Store Connect API
 * Returns the most recent version(s) with submission data
 */
export async function fetchAppVersions(): Promise<ASCApiResponse> {
  if (!ASC_APP_ID) {
    throw new Error('Missing ASC_APP_ID environment variable');
  }

  const token = generateToken();
  const url = `https://api.appstoreconnect.apple.com/v1/apps/${ASC_APP_ID}/appStoreVersions?include=appStoreVersionSubmission&limit=5&sort=-createdDate`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ASC API error ${response.status}: ${body}`);
  }

  return response.json() as Promise<ASCApiResponse>;
}
