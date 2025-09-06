const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 5000; // Hardcoded port

// For development - proxy to create-react-app dev server
if (process.env.NODE_ENV !== 'production') {
  console.log(`Starting React app on hardcoded port ${PORT}...`);
  
  // Start create-react-app dev server with custom port
  const reactProcess = spawn('npx', ['react-scripts', 'start'], {
    stdio: 'inherit',
    env: { ...process.env, PORT: PORT, BROWSER: 'none' },
    shell: true
  });

  reactProcess.on('close', (code) => {
    console.log(`React process exited with code ${code}`);
  });

  // Keep this process alive
  process.on('SIGINT', () => {
    reactProcess.kill('SIGINT');
    process.exit(0);
  });
} else {
  // For production - serve built files
  app.use(express.static(path.join(__dirname, 'build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
  
  app.listen(PORT, () => {
    console.log(`React app running on port ${PORT}`);
  });
}
