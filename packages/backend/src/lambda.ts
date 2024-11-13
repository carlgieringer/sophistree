import serverless from 'serverless-http';
import app from './app';

// Create Lambda handler from Express app
export const handler = serverless(app, {
  // Configure serverless-http options if needed
  // For example, to handle binary responses:
  // binary: ['application/pdf', 'image/*']
});
