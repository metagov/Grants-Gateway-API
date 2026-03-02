import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { storage } from "../../storage";
import { registrationSchema } from "@shared/schema";
import crypto from "crypto";

// Generate a secure API key
function generateApiKey(): string {
  return `og_${crypto.randomBytes(32).toString("hex")}`;
}

// Hash API key for storage
function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Register for API access and generate API key
  app.post("/api/auth/register", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const claims = req.user.claims;
      
      // Validate request body
      const parseResult = registrationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid registration data",
          errors: parseResult.error.flatten().fieldErrors 
        });
      }
      
      const { orgName, intentOfUse } = parseResult.data;
      
      // Check if user already has an API user account
      let apiUser = await storage.getApiUserByReplitId(userId);
      
      if (!apiUser) {
        // Create new API user
        apiUser = await storage.createApiUser({
          replitUserId: userId,
          email: claims.email || "",
          name: `${claims.first_name || ""} ${claims.last_name || ""}`.trim() || "User",
          orgName,
          intentOfUse,
          status: "active",
        });
      }
      
      // Generate new API key
      const rawKey = generateApiKey();
      const keyHash = hashApiKey(rawKey);
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 3 months
      
      await storage.createApiKey({
        userId: apiUser.id,
        keyHash,
        keyPreview: rawKey.slice(-4),
        name: `Key for ${orgName}`,
        expiresAt,
        status: "active",
      });
      
      res.json({
        message: "Registration successful",
        apiKey: rawKey,
        expiresAt: expiresAt.toISOString(),
        user: {
          id: apiUser.id,
          email: apiUser.email,
          name: apiUser.name,
          orgName: apiUser.orgName,
        },
      });
    } catch (error) {
      console.error("Error during registration:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Get user's API keys (without the actual key values)
  app.get("/api/auth/keys", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const apiUser = await storage.getApiUserByReplitId(userId);
      
      if (!apiUser) {
        return res.json({ keys: [] });
      }
      
      const keys = await storage.getApiKeysByUserId(apiUser.id);
      
      res.json({
        keys: keys.map(key => ({
          id: key.id,
          preview: `og_...${key.keyPreview}`,
          name: key.name,
          createdAt: key.createdAt,
          lastUsedAt: key.lastUsedAt,
          expiresAt: key.expiresAt,
          status: key.status,
        })),
      });
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  // Revoke an API key
  app.delete("/api/auth/keys/:keyId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { keyId } = req.params;
      
      const apiUser = await storage.getApiUserByReplitId(userId);
      if (!apiUser) {
        return res.status(404).json({ message: "API user not found" });
      }
      
      const keys = await storage.getApiKeysByUserId(apiUser.id);
      const key = keys.find(k => k.id === keyId);
      
      if (!key) {
        return res.status(404).json({ message: "API key not found" });
      }
      
      await storage.revokeApiKey(keyId);
      res.json({ message: "API key revoked successfully" });
    } catch (error) {
      console.error("Error revoking API key:", error);
      res.status(500).json({ message: "Failed to revoke API key" });
    }
  });
}
