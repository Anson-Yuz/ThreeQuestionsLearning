const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

let mainWindow = null;
let backendProcess = null;
let isQuitting = false;

function getPythonPath() {
  const isDev = !app.isPackaged;
  if (isDev) {
    return os.platform() === 'win32' ? 'python' : 'python3';
  }
  const resourcesPath = process.resourcesPath;
  if (os.platform() === 'win32') {
    return path.join(resourcesPath, 'python', 'python.exe');
  } else if (os.platform() === 'darwin') {
    return path.join(resourcesPath, 'python', 'bin', 'python3');
  }
  return 'python3';
}

function getBackendPath() {
  const isDev = !app.isPackaged;
  if (isDev) {
    return path.join(__dirname, '..', 'backend', 'main.py');
  }
  return path.join(process.resourcesPath, 'backend', 'main.py');
}

function getFrontendPath() {
  const isDev = !app.isPackaged;
  if (isDev) {
    return 'http://localhost:5173';
  }
  return path.join(process.resourcesPath, 'frontend', 'index.html');
}

async function startBackend() {
  return new Promise((resolve) => {
    const pythonPath = getPythonPath();
    const backendPath = getBackendPath();
    console.log(`[electron] starting backend: ${pythonPath} ${backendPath}`);

    const env = { ...process.env, PYTHONUNBUFFERED: '1' };
    backendProcess = spawn(pythonPath, [backendPath], {
      env,
      cwd: path.dirname(backendPath),
    });

    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[backend] ${output}`);
      if (output.includes('Application startup complete') || output.includes('Uvicorn running')) {
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`[backend] ${data}`);
    });

    backendProcess.on('close', (code) => {
      console.log(`[electron] backend exited (${code})`);
      if (!isQuitting && code !== 0) {
        setTimeout(() => startBackend(), 5000);
      }
    });

    // fallback: assume ready after 8s
    setTimeout(() => resolve(), 8000);
  });
}

async function createWindow() {
  await startBackend();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: '三问高效学习机',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const frontendPath = getFrontendPath();
  if (frontendPath.startsWith('http')) {
    await mainWindow.loadURL(frontendPath);
  } else {
    await mainWindow.loadFile(frontendPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => createWindow());

app.on('window-all-closed', () => {
  if (os.platform() !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
  if (backendProcess) backendProcess.kill();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
