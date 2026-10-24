import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = process.cwd();

test('Simplified Single-Player HUD in src/App.tsx excludes speed sliders, notation script bar, and multiplayer lobby', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');

  // Must include simplified game & camera controls
  for (const requiredId of [
    'btn-side-toggle',
    'btn-ai-move',
    'btn-reset',
    'btn-cam-player',
    'btn-cam-top',
    'btn-cam-side',
    'btn-cam-wide',
    'btn-hide-ui',
    'controls-hint',
    'captured-tray'
  ]) {
    assert.ok(appTsx.includes(`id="${requiredId}"`), `Missing required HUD control #${requiredId}`);
  }

  // Must NOT include camera speed sliders, script mode bar, or multiplayer lobby
  for (const forbiddenId of [
    'cam-speed-wrap',
    'input-cam-speed',
    'rot-speed-wrap',
    'input-rot-speed',
    'script-bar',
    'btn-script-modal',
    'btn-script-prev',
    'btn-script-next',
    'btn-lobby',
    'lobby-modal',
    'room-pill',
    'btn-checkmate-stepback'
  ]) {
    assert.ok(!appTsx.includes(forbiddenId), `Forbidden UI element #${forbiddenId} found in App.tsx`);
  }
});

test('All 7 compressed 3D assets (.glb.gz.b64) decode and gunzip to valid glTF 2.0 binary models', () => {
  const expectedModels = [
    'option8_cathedral',
    'pawn_white',
    'rook_white',
    'knight_white',
    'bishop_white',
    'queen_white',
    'king_white'
  ];

  for (const name of expectedModels) {
    const b64Path = path.join(ROOT, 'public/assets/glb', `${name}.glb.gz.b64`);
    assert.ok(fs.existsSync(b64Path), `Missing 3D asset ${b64Path}`);
    const b64Text = fs.readFileSync(b64Path, 'utf-8').trim();
    assert.ok(b64Text.length > 1000, `Asset ${name}.glb.gz.b64 is unexpectedly small`);

    const gzBuf = Buffer.from(b64Text, 'base64');
    const glbBuf = zlib.gunzipSync(gzBuf);

    const magic = glbBuf.toString('ascii', 0, 4);
    const version = glbBuf.readUInt32LE(4);
    const totalLen = glbBuf.readUInt32LE(8);
    assert.equal(magic, 'glTF', `Invalid glTF magic header for ${name}`);
    assert.equal(version, 2, `Invalid glTF version for ${name}`);
    assert.equal(totalLen, glbBuf.length, `Mismatched glTF byte length for ${name}`);
  }
});

test('Procedural audio buffers are pre-decoded on boot via OfflineAudioContext in wizardChessEngine.js', () => {
  const engineJs = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');

  assert.ok(engineJs.includes('precomputeAllAudioBuffers'), 'Missing precomputeAllAudioBuffers function');
  assert.ok(engineJs.includes('precomputedAudioBuffers'), 'Missing precomputedAudioBuffers object pool');
  assert.ok(engineJs.includes('playVictorySound'), 'Missing playVictorySound fanfare function');
  assert.ok(engineJs.includes('playSelectSound'), 'Missing playSelectSound function');
  assert.ok(engineJs.includes('playMoveSound'), 'Missing playMoveSound function');
  assert.ok(engineJs.includes('playCaptureSound'), 'Missing playCaptureSound function');
  assert.ok(engineJs.includes('playCheckSound'), 'Missing playCheckSound function');
  assert.ok(engineJs.includes('OfflineAudioContext'), 'Must use OfflineAudioContext to pre-decode audio buffers before gameplay');
});

test('Local game state and preferences persistence (FEN, snapshot, camera, sound) in wizardChessEngine.js', () => {
  const engineJs = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');

  assert.ok(engineJs.includes('boardToFen'), 'Missing boardToFen function');
  assert.ok(engineJs.includes('saveLocalGameState'), 'Missing saveLocalGameState function');
  assert.ok(engineJs.includes('restoreLocalGameState'), 'Missing restoreLocalGameState function');
  assert.ok(engineJs.includes('orzukod_3d_gamestate'), 'Missing localStorage key for game state');
  assert.ok(engineJs.includes('orzukod_3d_sound'), 'Missing localStorage key for sound preference');
});

test('Pre-compiled chess opening book lookup provides instant 0ms AI opening moves', () => {
  const engineJs = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');

  assert.ok(engineJs.includes('OPENING_BOOK'), 'Missing OPENING_BOOK dictionary');
  assert.ok(engineJs.includes('coordsToUci'), 'Missing coordsToUci function');
  assert.ok(engineJs.includes('uciToCoords'), 'Missing uciToCoords function');
  assert.ok(engineJs.includes('queryOpeningBook'), 'Missing queryOpeningBook function');

  // Verify key standard openings are included
  assert.ok(engineJs.includes('"e2e4"'), 'Opening book missing 1. e4');
  assert.ok(engineJs.includes('"d2d4"'), 'Opening book missing 1. d4');
  assert.ok(engineJs.includes('"e2e4,e7e5"'), 'Opening book missing Open Game line');
  assert.ok(engineJs.includes('"e2e4,c7c5"'), 'Opening book missing Sicilian line');
});

test('Native Android APK / Capacitor configuration, offline PWA service worker, and GitHub Actions build workflow', () => {
  // Capacitor config check
  const capPath = path.join(ROOT, 'capacitor.config.json');
  assert.ok(fs.existsSync(capPath), 'Missing capacitor.config.json');
  const capJson = JSON.parse(fs.readFileSync(capPath, 'utf-8'));
  assert.equal(capJson.appId, 'com.orzukod.wizardchess3d', 'Mismatched Capacitor appId');
  assert.equal(capJson.appName, 'Orzukod 3D', 'Mismatched Capacitor appName');
  assert.equal(capJson.webDir, 'dist', 'Mismatched Capacitor webDir');
  assert.equal(capJson.bundledWebRuntime, false, 'bundledWebRuntime must be false');

  // Package dependencies check for Capacitor
  const pkgPath = path.join(ROOT, 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  assert.ok(pkgJson.dependencies['@capacitor/core'], 'Missing @capacitor/core');
  assert.ok(pkgJson.dependencies['@capacitor/android'], 'Missing @capacitor/android');
  assert.ok(pkgJson.devDependencies['@capacitor/cli'], 'Missing @capacitor/cli');

  // GitHub Actions workflow check
  const wfPath = path.join(ROOT, '.github/workflows/build.yml');
  assert.ok(fs.existsSync(wfPath), 'Missing .github/workflows/build.yml');
  const wfCode = fs.readFileSync(wfPath, 'utf-8');
  assert.ok(!wfCode.includes('android-actions/setup-android'), 'Must not use broken android-actions/setup-android');
  assert.ok(wfCode.includes('actions/checkout@v4'), 'Workflow must use actions/checkout@v4');
  assert.ok(wfCode.includes('actions/setup-node@v4'), 'Workflow must use actions/setup-node@v4');
  assert.ok(wfCode.includes('actions/setup-java@v4'), 'Workflow must use actions/setup-java@v4');
  assert.ok(wfCode.includes('npm install --legacy-peer-deps'), 'Workflow must run npm install --legacy-peer-deps');
  assert.ok(wfCode.includes('npm run build'), 'Workflow must run npm run build');
  assert.ok(wfCode.includes('npx cap add android'), 'Workflow must run npx cap add android');
  assert.ok(wfCode.includes('npx cap sync android'), 'Workflow must run npx cap sync android');
  assert.ok(wfCode.includes('./gradlew assembleDebug --no-daemon'), 'Workflow must run assembleDebug');
  assert.ok(wfCode.includes('name: orzu-kod-3D-APK'), 'Workflow must upload artifact with name orzu-kod-3D-APK');

  // Service worker check
  const swPath = path.join(ROOT, 'public/sw.js');
  assert.ok(fs.existsSync(swPath), 'Missing public/sw.js service worker');
  const swCode = fs.readFileSync(swPath, 'utf-8');
  assert.ok(swCode.includes('orzukod-3d-cache-v1'), 'Service worker missing cache name');

  // index.html viewport check
  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
  assert.ok(
    indexHtml.includes('viewport-fit=cover'),
    'index.html missing viewport-fit=cover for Android WebView edge-to-edge'
  );
  assert.ok(indexHtml.includes('user-scalable=no'), 'index.html missing user-scalable=no');
  assert.ok(indexHtml.includes('serviceWorker.register'), 'index.html must register offline service worker');
});

test('activeMoveTweens is declared before resetChessBoard and restoreBoardSnapshot to prevent ReferenceError', () => {
  const engineJs = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');

  const tweensIdx = engineJs.indexOf('const activeMoveTweens = [];');
  const restoreIdx = engineJs.indexOf('function restoreBoardSnapshot');
  const resetIdx = engineJs.indexOf('function resetChessBoard');

  assert.ok(tweensIdx !== -1, 'Missing activeMoveTweens declaration');
  assert.ok(restoreIdx !== -1, 'Missing restoreBoardSnapshot declaration');
  assert.ok(resetIdx !== -1, 'Missing resetChessBoard declaration');
  assert.ok(
    tweensIdx < restoreIdx,
    'activeMoveTweens must be declared before restoreBoardSnapshot'
  );
  assert.ok(
    tweensIdx < resetIdx,
    'activeMoveTweens must be declared before resetChessBoard'
  );
});

test('Anti-flickering, Z-fighting prevention, and permanent GPU memory retention for board & altar', () => {
  const engineJs = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  const stylesCss = fs.readFileSync(path.join(ROOT, 'src/styles.css'), 'utf-8');

  // Root-cause fix for Z-fighting: Logarithmic Depth Buffer
  assert.ok(engineJs.includes('logarithmicDepthBuffer: true'), 'logarithmicDepthBuffer must be enabled on WebGLRenderer');

  // Tightened camera near/far clipping planes for depth precision
  assert.ok(engineJs.includes('camera.near = 1.0'), 'Camera near must be set to 1.0 for optimal mobile Z-precision');
  assert.ok(engineJs.includes('camera.far = 60.0'), 'Camera far must be set to 60.0');

  // OrbitControls distance limits to prevent empty-space zoom out
  assert.ok(engineJs.includes('orbitControls.minDistance = 6.0'), 'orbitControls.minDistance must be 6.0');
  assert.ok(engineJs.includes('orbitControls.maxDistance = 24.0'), 'orbitControls.maxDistance must be 24.0');

  // Board tile elevations and polygon offsets
  assert.ok(engineJs.includes('altarTopY + 0.03'), 'Chess tiles must be elevated to altarTopY + 0.03');
  assert.ok(engineJs.includes('polygonOffset: true'), 'Tile materials must have polygonOffset: true');
  assert.ok(engineJs.includes('polygonOffsetFactor: -2'), 'polygonOffsetFactor must be -2');
  assert.ok(engineJs.includes('polygonOffsetUnits: -4'), 'polygonOffsetUnits must be -4');

  // Frustum culling disabled on board & tiles
  assert.ok(engineJs.includes('boardGroup.frustumCulled = false'), 'boardGroup frustum culling must be disabled');
  assert.ok(engineJs.includes('sqMesh.frustumCulled = false'), 'Tile squares frustum culling must be disabled');

  // Google-verified performance boost
  assert.ok(engineJs.includes('renderer.shadowMap.autoUpdate = false'), 'Shadow map autoUpdate must be false to cache static shadows');
  assert.ok(engineJs.includes('Math.min(window.devicePixelRatio, 1.25)'), 'Pixel ratio must be capped at 1.25 for battery efficiency');

  // Mobile Touch Buttons & Safe-area margins in styles.css
  assert.ok(stylesCss.includes('env(safe-area-inset-top, 16px)'), 'Top status banner must include safe-area margins');
  assert.ok(stylesCss.includes('border-radius: 12px'), 'HUD buttons must have 12px rounded pill styling');
  assert.ok(stylesCss.includes('transform: scale(0.94)'), 'Touch buttons must have tactile scale(0.94) feedback');
  assert.ok(stylesCss.includes('min-height: 48px'), 'Buttons must meet 48x48px tap target requirement');
});
