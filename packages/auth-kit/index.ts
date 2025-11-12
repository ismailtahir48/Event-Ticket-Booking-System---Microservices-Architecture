import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export interface JWTPayload {
  sub: string;
  email: string;
  role: 'customer' | 'staff' | 'owner';
  orgId?: string;
  iat?: number;
  exp?: number;
}

let jwksClientInstance: jwksClient.JwksClient | null = null;

export function getJwksClient(jwksUri: string): jwksClient.JwksClient {
  if (!jwksClientInstance) {
    jwksClientInstance = jwksClient({
      jwksUri,
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
      rateLimit: true,
      jwksRequestsPerMinute: 5,
    });
  }
  return jwksClientInstance;
}

export async function verifyToken(
  token: string,
  jwksUri: string
): Promise<JWTPayload> {
  const client = getJwksClient(jwksUri);
  
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      (header, callback) => {
        client.getSigningKey(header.kid, (err, key) => {
          if (err) {
            callback(err);
            return;
          }
          const signingKey = key?.getPublicKey();
          callback(null, signingKey);
        });
      },
      {
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(decoded as JWTPayload);
      }
    );
  });
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

