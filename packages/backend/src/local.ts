import app from './app';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
🚀 Server running at http://localhost:${PORT}

Available endpoints:
GET  /health           - Health check
GET  /maps            - List all maps for authenticated user
GET  /maps/:mapId     - Get specific map
POST /maps/:mapId     - Update/create map

Using DynamoDB Local at http://localhost:8000
  `);
});
