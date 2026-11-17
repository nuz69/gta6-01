export class HudSystem {
  constructor() {
    this.createDomElements();
  }

  createDomElements() {
    // If containers already exist in HTML, use them, otherwise create them
    let hudLayer = document.getElementById('hud-layer');
    if (!hudLayer) {
      hudLayer = document.createElement('div');
      hudLayer.id = 'hud-layer';
      hudLayer.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;';
      document.body.appendChild(hudLayer);
    }

    // HUD Stats & Health & Cash & Debt & Speed & Stars
    if (!document.getElementById('hud-stats-panel')) {
      const statsPanel = document.createElement('div');
      statsPanel.id = 'hud-stats-panel';
      statsPanel.style.cssText = 'position: absolute; top: 20px; left: 20px; color: #f8fafc; font-size: 15px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.8); background: rgba(15, 23, 42, 0.7); padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(255,120,31,0.4); display: none;';
      statsPanel.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 20px;">
          <span>HEALTH:</span> <span id="hud-health-val" style="color: #4ade80;">100%</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 20px;">
          <span>CASH:</span> <span id="hud-cash-val" style="color: #fde047;">$5,000</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 20px;">
          <span>DEBT:</span> <span id="hud-debt-val" style="color: #f87171;">$50,000</span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 20px;">
          <span>SPEED:</span> <span id="hud-speed-val" style="color: #38bdf8;">0 MPH</span>
        </div>
      `;
      hudLayer.appendChild(statsPanel);
    }

    if (!document.getElementById('hud-stars')) {
      const starsDiv = document.createElement('div');
      starsDiv.id = 'hud-stars';
      starsDiv.style.cssText = 'position: absolute; top: 20px; right: 20px; font-size: 24px; color: #fde047; text-shadow: 0 2px 4px rgba(0,0,0,0.8); display: none;';
      starsDiv.textContent = '☆☆☆☆☆';
      hudLayer.appendChild(starsDiv);
    }

    // Objective Banner
    if (!document.getElementById('hud-objective-banner')) {
      const objDiv = document.createElement('div');
      objDiv.id = 'hud-objective-banner';
      objDiv.style.cssText = 'position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.85); border: 2px solid #ff781f; padding: 10px 20px; border-radius: 8px; text-align: center; color: #f8fafc; text-shadow: 0 2px 4px rgba(0,0,0,0.8); display: none; pointer-events: auto; max-width: 500px;';
      objDiv.innerHTML = `
        <div id="hud-mission-title" style="font-size: 13px; font-weight: 800; color: #ff781f; letter-spacing: 1px; margin-bottom: 3px;">MISSION</div>
        <div id="hud-objective-text" style="font-size: 14px; font-weight: 600; color: #fde047;">Drive to client drop-off</div>
      `;
      hudLayer.appendChild(objDiv);
    }

    // Minimap Canvas
    if (!document.getElementById('minimap-container')) {
      const miniContainer = document.createElement('div');
      miniContainer.id = 'minimap-container';
      miniContainer.style.cssText = 'position: absolute; bottom: 20px; right: 20px; width: 160px; height: 160px; background: rgba(15, 23, 42, 0.85); border: 2px solid #ff781f; border-radius: 50%; overflow: hidden; display: none; box-shadow: 0 4px 12px rgba(0,0,0,0.5);';
      miniContainer.innerHTML = `<canvas id="minimap-canvas" width="160" height="160" style="display: block; width: 100%; height: 100%;"></canvas>`;
      hudLayer.appendChild(miniContainer);
    }

    // Wasted Banner
    if (!document.getElementById('wasted-banner')) {
      const wasted = document.createElement('div');
      wasted.id = 'wasted-banner';
      wasted.style.cssText = 'position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); color: #ef4444; font-size: 56px; font-weight: 900; text-shadow: 0 4px 12px rgba(0,0,0,0.9); display: none; z-index: 30; letter-spacing: 3px;';
      wasted.textContent = 'WASTED';
      hudLayer.appendChild(wasted);
    }

    // Menus Overlay Container (Pointer events auto for menu interaction)
    let menuLayer = document.getElementById('menu-layer');
    if (!menuLayer) {
      menuLayer = document.createElement('div');
      menuLayer.id = 'menu-layer';
      menuLayer.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 40; display: flex; align-items: center; justify-content: center;';
      document.body.appendChild(menuLayer);
    }

    // Start Screen / Title Overlay
    if (!document.getElementById('start-screen')) {
      const startScreen = document.createElement('div');
      startScreen.id = 'start-screen';
      startScreen.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,27,75,0.95)); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #f8fafc; z-index: 50; pointer-events: auto; padding: 20px; box-sizing: border-box; text-align: center;';
      startScreen.innerHTML = `
        <div style="font-size: 14px; font-weight: 800; color: #ff781f; letter-spacing: 4px; margin-bottom: 10px;">MAKE.FUN COMPETITION ENTRY</div>
        <h1 style="font-size: 48px; font-weight: 900; color: #fde047; margin: 0 0 10px 0; text-shadow: 0 4px 12px rgba(0,0,0,0.6); letter-spacing: 2px;">SOLMARINA: NEON HEAT</h1>
        <p style="font-size: 16px; color: #94a3b8; max-width: 600px; margin: 0 0 30px 0; line-height: 1.5;">
          Rex Dalton is a driver-for-hire who owes $50,000 to ruthless fixer Vera Kane. 
          Steal cars, outrun the police, complete high-stakes missions, and pay off your debt before time runs out.
        </p>
        <div style="background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255,120,31,0.4); padding: 15px 25px; border-radius: 8px; margin-bottom: 30px; font-size: 13px; color: #cbd5e1; text-align: left; max-width: 500px;">
          <div style="color: #ff781f; font-weight: 800; margin-bottom: 6px; letter-spacing: 1px;">CONTROLS:</div>
          <div>• <b>WASD / Arrows</b>: Drive / Walk</div>
          <div>• <b>E</b>: Enter / Exit Vehicle</div>
          <div>• <b>F</b>: Punch / Attack</div>
          <div>• <b>M</b>: Toggle Audio Mute</div>
          <div>• <b>C</b>: Change Camera View</div>
          <div>• <b>ESC</b>: Pause Game</div>
        </div>
        <button id="start-game-btn" style="background: linear-gradient(135deg, #ff781f, #f59e0b); color: #0f172a; border: none; padding: 14px 36px; font-size: 18px; font-weight: 900; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 16px rgba(255,120,31,0.4); letter-spacing: 1px; transition: transform 0.1s;">START GAME</button>
      `;
      menuLayer.appendChild(startScreen);
    }

    // Pause Menu
    if (!document.getElementById('pause-menu')) {
      const pauseMenu = document.createElement('div');
      pauseMenu.id = 'pause-menu';
      pauseMenu.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15,23,42,0.85); display: none; flex-direction: column; align-items: center; justify-content: center; color: #f8fafc; z-index: 50; pointer-events: auto;';
      pauseMenu.innerHTML = `
        <h2 style="font-size: 36px; font-weight: 900; color: #fde047; margin: 0 0 20px 0; letter-spacing: 2px;">PAUSED</h2>
        <div style="display: flex; flex-direction: column; gap: 12px; width: 240px;">
          <button id="pause-resume-btn" style="background: #334155; color: #f8fafc; border: 1px solid #64748b; padding: 12px; font-size: 15px; font-weight: 700; border-radius: 6px; cursor: pointer;">RESUME</button>
          <button id="pause-restart-btn" style="background: #334155; color: #f8fafc; border: 1px solid #64748b; padding: 12px; font-size: 15px; font-weight: 700; border-radius: 6px; cursor: pointer;">RESTART MISSION</button>
          <button id="pause-mute-btn" style="background: #334155; color: #f8fafc; border: 1px solid #64748b; padding: 12px; font-size: 15px; font-weight: 700; border-radius: 6px; cursor: pointer;">MUTE: OFF</button>
          <button id="pause-title-btn" style="background: #7f1d1d; color: #f8fafc; border: 1px solid #991b1b; padding: 12px; font-size: 15px; font-weight: 700; border-radius: 6px; cursor: pointer;">QUIT TO TITLE</button>
        </div>
      `;
      menuLayer.appendChild(pauseMenu);
    }

    // Mission Complete Screen
    if (!document.getElementById('mission-complete-screen')) {
      const mcScreen = document.createElement('div');
      mcScreen.id = 'mission-complete-screen';
      mcScreen.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15,23,42,0.9); display: none; flex-direction: column; align-items: center; justify-content: center; color: #f8fafc; z-index: 50; pointer-events: auto; text-align: center; padding: 20px;';
      mcScreen.innerHTML = `
        <div style="font-size: 14px; font-weight: 800; color: #4ade80; letter-spacing: 3px; margin-bottom: 8px;">SUCCESS</div>
        <h2 id="mc-title" style="font-size: 40px; font-weight: 900; color: #fde047; margin: 0 0 15px 0; letter-spacing: 1px;">MISSION COMPLETE</h2>
        <div style="background: rgba(30,41,59,0.9); border: 1px solid rgba(74,222,128,0.4); padding: 20px 30px; border-radius: 10px; margin-bottom: 25px; min-width: 300px;">
          <div style="font-size: 14px; color: #94a3b8; margin-bottom: 6px;">REWARD EARNED</div>
          <div id="mc-reward" style="font-size: 28px; font-weight: 900; color: #4ade80; margin-bottom: 15px;">+$10,000</div>
          <div style="font-size: 14px; color: #94a3b8; margin-bottom: 6px;">REMAINING DEBT TO VERA</div>
          <div id="mc-debt" style="font-size: 22px; font-weight: 800; color: #f87171;">$40,000</div>
        </div>
        <button id="mc-continue-btn" style="background: linear-gradient(135deg, #22c55e, #16a34a); color: #0f172a; border: none; padding: 14px 36px; font-size: 18px; font-weight: 900; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 16px rgba(34,197,94,0.4); letter-spacing: 1px;">CONTINUE</button>
      `;
      menuLayer.appendChild(mcScreen);
    }

    // Mission Failed Screen
    if (!document.getElementById('mission-failed-screen')) {
      const mfScreen = document.createElement('div');
      mfScreen.id = 'mission-failed-screen';
      mfScreen.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15,23,42,0.9); display: none; flex-direction: column; align-items: center; justify-content: center; color: #f8fafc; z-index: 50; pointer-events: auto; text-align: center; padding: 20px;';
      mfScreen.innerHTML = `
        <div style="font-size: 14px; font-weight: 800; color: #ef4444; letter-spacing: 3px; margin-bottom: 8px;">MISSION FAILED</div>
        <h2 style="font-size: 40px; font-weight: 900; color: #ef4444; margin: 0 0 15px 0; letter-spacing: 1px;">BUSTED OR EXPIRED</h2>
        <p id="mf-reason" style="font-size: 16px; color: #cbd5e1; margin: 0 0 25px 0;">Time expired or mission objective failed.</p>
        <button id="mf-retry-btn" style="background: linear-gradient(135deg, #ef4444, #dc2626); color: #f8fafc; border: none; padding: 14px 36px; font-size: 18px; font-weight: 900; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 16px rgba(239,68,68,0.4); letter-spacing: 1px;">RETRY MISSION</button>
      `;
      menuLayer.appendChild(mfScreen);
    }
  }

  showState(state) {
    const startScreen = document.getElementById('start-screen');
    const pauseMenu = document.getElementById('pause-menu');
    const mcScreen = document.getElementById('mission-complete-screen');
    const mfScreen = document.getElementById('mission-failed-screen');
    const statsPanel = document.getElementById('hud-stats-panel');
    const starsDiv = document.getElementById('hud-stars');
    const objBanner = document.getElementById('hud-objective-banner');
    const miniContainer = document.getElementById('minimap-container');

    // Hide all first
    if (startScreen) startScreen.style.display = 'none';
    if (pauseMenu) pauseMenu.style.display = 'none';
    if (mcScreen) mcScreen.style.display = 'none';
    if (mfScreen) mfScreen.style.display = 'none';

    if (state === 'attract') {
      if (startScreen) startScreen.style.display = 'flex';
      if (statsPanel) statsPanel.style.display = 'none';
      if (starsDiv) starsDiv.style.display = 'none';
      if (objBanner) objBanner.style.display = 'none';
      if (miniContainer) miniContainer.style.display = 'none';
    } else if (state === 'playing') {
      if (statsPanel) statsPanel.style.display = 'block';
      if (starsDiv) statsPanel.style.display = 'block';
      if (objBanner) objBanner.style.display = 'block';
      if (miniContainer) miniContainer.style.display = 'block';
    } else if (state === 'paused') {
      if (pauseMenu) pauseMenu.style.display = 'flex';
      if (statsPanel) statsPanel.style.display = 'block';
      if (starsDiv) statsPanel.style.display = 'block';
      if (objBanner) statsPanel.style.display = 'block';
      if (miniContainer) miniContainer.style.display = 'block';
    } else if (state === 'mission-complete') {
      if (mcScreen) mcScreen.style.display = 'flex';
    } else if (state === 'mission-failed') {
      if (mfScreen) mfScreen.style.display = 'flex';
    }
  }

  updateHUD(data) {
    const healthEl = document.getElementById('hud-health-val');
    const cashEl = document.getElementById('hud-cash-val');
    const debtEl = document.getElementById('hud-debt-val');
    const speedEl = document.getElementById('hud-speed-val');
    const starsEl = document.getElementById('hud-stars');
    const missionTitleEl = document.getElementById('hud-mission-title');
    const objectiveTextEl = document.getElementById('hud-objective-text');

    if (healthEl) {
      healthEl.textContent = `${Math.round(data.health)}%`;
      healthEl.style.color = data.health > 30 ? '#4ade80' : '#ef4444';
    }
    if (cashEl) cashEl.textContent = `$${data.cash.toLocaleString()}`;
    if (debtEl) debtEl.textContent = `$${data.debt.toLocaleString()}`;
    if (speedEl) speedEl.textContent = `${Math.round(Math.abs(data.speed) * 2.23694)} MPH`; // m/s to mph approx
    if (starsEl) {
      const stars = data.policeStars || 0;
      starsEl.textContent = '★'.repeat(stars) + '☆☆☆☆☆'.slice(0, 5 - stars);
    }

    if (data.mission) {
      if (missionTitleEl) missionTitleEl.textContent = `MISSION ${data.mission.id}: ${data.mission.title.toUpperCase()}`;
      if (objectiveTextEl) objectiveTextEl.textContent = data.mission.objective;
    } else {
      if (missionTitleEl) missionTitleEl.textContent = `FREE ROAM`;
      if (objectiveTextEl) objectiveTextEl.textContent = `Explore Solmarina or trigger missions!`;
    }
  }

  updateMinimap(playerPos, playerRot, waypoint, policeCars, sunCoins) {
    const canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const scale = 0.8; // World units to minimap pixels

    // Draw grid / roads roughly around player
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    const worldSize = 480;
    const step = 60;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-playerRot);
    ctx.translate(-playerPos.x * scale, -playerPos.z * scale);

    // Draw world roads (grid)
    for (let x = -worldSize; x <= worldSize; x += step) {
      ctx.beginPath();
      ctx.moveTo(x * scale, -worldSize * scale);
      ctx.lineTo(x * scale, worldSize * scale);
      ctx.stroke();
    }
    for (let z = -worldSize; z <= worldSize; z += step) {
      ctx.beginPath();
      ctx.moveTo(-worldSize * scale, z * scale);
      ctx.lineTo(worldSize * scale, z * scale);
      ctx.stroke();
    }

    // Draw sun coins
    if (sunCoins) {
      ctx.fillStyle = '#fde047';
      for (const coin of sunCoins) {
        if (!coin.collected) {
          ctx.beginPath();
          ctx.arc(coin.position.x * scale, coin.position.z * scale, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw police blips
    if (policeCars) {
      ctx.fillStyle = '#3b82f6';
      for (const p of policeCars) {
        ctx.beginPath();
        ctx.arc(p.position.x * scale, p.position.z * scale, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw mission waypoint
    if (waypoint) {
      ctx.fillStyle = '#ff781f';
      ctx.beginPath();
      ctx.arc(waypoint.x * scale, waypoint.z * scale, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();

    // Draw Player Arrow in center
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
