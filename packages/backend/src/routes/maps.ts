import { Router } from 'express';
import { z } from 'zod';
import { db } from '../services/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { updateMapRequestSchema } from '../schema';

const router = Router();

/**
 * POST /maps/:mapId
 * Updates or creates an argument map with the specified ID
 * Requires:
 * - Valid Google OAuth2 token in Authorization header
 * - Valid ArgumentMap in request body
 */
router.post('/:mapId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    // Validate request body against our schema
    const validatedData = updateMapRequestSchema.parse(req.body);

    // Ensure map ID in body matches URL parameter
    if (validatedData.map.id !== req.params.mapId) {
      res.status(400).json({
        error: 'Map ID in body must match URL parameter'
      });
      return;
    }

    // Store the map
    await db.updateMap(req.user!.email, validatedData.map);

    res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid request body',
        details: error.errors
      });
    } else {
      console.error('Error updating map:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
});

/**
 * GET /maps/:mapId
 * Retrieves a specific map for the authenticated user
 */
router.get('/:mapId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const map = await db.getMap(req.user!.email, req.params.mapId);
    if (!map) {
      res.status(404).json({ error: 'Map not found' });
      return;
    }
    res.json({ map });
  } catch (error) {
    console.error('Error retrieving map:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /maps
 * Lists all maps for the authenticated user
 */
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const maps = await db.listMaps(req.user!.email);
    res.json({ maps });
  } catch (error) {
    console.error('Error listing maps:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;
