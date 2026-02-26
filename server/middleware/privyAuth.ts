import { PrivyClient } from '@privy-io/server-auth';
import { Request, Response, NextFunction, RequestHandler } from 'express';

export interface PrivyAuthenticatedRequest extends Request {
  privyUser?: {
    userId: string;     // Privy DID like "did:privy:..."
    email?: string;
  };
}

const privyClient = new PrivyClient(
  process.env.VITE_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

export const verifyPrivyToken: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      error: "Missing authorization",
      message: "Provide a Privy access token via 'Authorization: Bearer <token>'"
    });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const claims = await privyClient.verifyAuthToken(token);
    (req as PrivyAuthenticatedRequest).privyUser = {
      userId: claims.userId,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
};
