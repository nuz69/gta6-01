export class HudSystem {
  constructor() {
    this.createDomElements();
  }

  createDomElements() {
    let hudLayer = document.getElementById('hud-layer');
    if (!hudLayer) {
      hudLayer = document.createElement('div');
      hudLayer.id = 'hud-layer';
      hudLayer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vw; pointer-events: none; z-index: 10;';
      document.body.appendChild(hudLayer);
    }

    let stats = document.getElementById('hud-stats');
    if (!stats) {
      stats = document.createElement('div');
      stats.id = 'hud-stats';
      stats.style.cssText = 'position: absolute; top: 24px; left: 28px; color: #f8fafc; font-size: 15px; font-weight: 700; text-shadow: 0 2px 6px rgba(0,0,0,0.8); background: rgba(8, 12, 20, 0.6); padding: 12px 18px; border-left: 4px solid #ff781f; border-radius: 4px; display: none; backdrop-filter: blur(4px);';
      hudLayer.appendChild(stats);
    }
    if (!document.getElementById('hud-health-val') || !document.getElementById('hud-debt-val') || !document.getElementById('hud-speed-val')) {
      stats.innerHTML = `
        <div style="margin-bottom: 4px;">HEALTH: <span id="hud-health-val" style="color: #4ade80;">100</span>%</div>
        <div style="margin-bottom: 4px;">CASH: $<span id="hud-cash-val" style="color: #fde047;">5,000</span></div>
        <div style="margin-bottom: 4px;">DEBT: $<span id="hud-debt-val" style="color: #f87171;">50,000</span></div>
        <div>SPEED: <span id="hud-speed-val" style="color: #38bdf8;">0</span> MPH</div>
      `;
    }

    let stars = document.getElementById('hud-stars');
    if (!stars) {
      stars = document.createElement('div');
      stars.id = 'hud-stars';
      stars.style.cssText = 'position: absolute; top: 24px; right: 28px; font-size: 26px; color: #fde047; text-shadow: 0 0 10px rgba(253, 224, 71, 0.6); display: none; letter-spacing: 2px;';
      stars.textContent = '☆☆☆☆☆';
      hudLayer.appendChild(stars);
    }

    if (!document.getElementById('hud-objective-banner')) {
      const objDiv = document.createElement('div');
      objDiv.id = 'hud-objective-banner';
      objDiv.style.cssText = 'position: absolute; top: 24px; left: 50%; transform: translateX(-50%); background: rgba(8, 12, 20, 0.85); border: 2px solid #ff781f; padding: 10px 20px; border-radius: 8px; text-align: center; color: #f8fafc; text-shadow: 0 2px 4px rgba(0,0,0,0.8); display: none; pointer-events: auto; max-width: 500px; backdrop-filter: blur(4px);';
      objDiv.innerHTML = `
        <div id="hud-mission-title" style="font-size: 13px; font-weight: 800; color: #ff781f; letter-spacing: 1px; margin-bottom: 3px;">MISSION</div>
        <div id="hud-objective-text" style="font-size: 14px; font-weight: 600; color: #fde047;">Drive to destination</div>
      `;
      hudLayer.appendChild(objDiv);
    }

    if (!document.getElementById('minimap-container')) {
      const miniContainer = document.createElement('div');
      miniContainer.id = 'minimap-container';
      miniContainer.style.cssText = 'position: absolute; bottom: 24px; right: 28px; width: 160px; height: 160px; background: rgba(8, 12, 20, 0.85); border: 2px solid #ff781f; border-radius: 50%; overflow: hidden; display: none; box-shadow: 0 4px 16px rgba(0,0,0,0.6); backdrop-filter: blur(4px);';
      miniContainer.innerHTML = `<canvas id="minimap-canvas" width="160" height="160" style="display: block; width: 100%; height: 100%;"></canvas>`;
      hudLayer.appendChild(miniContainer);
    }

    let wasted = document.getElementById('wasted-banner');
    if (!wasted) {
      wasted = document.createElement('div');
      wasted.id = 'wasted-banner';
      wasted.style.cssText = 'position: absolute; top: 42%; left: 50%; transform: translate(-50%, -50%); color: #ef4444; font-size: 56px; font-weight: 900; letter-spacing: 4px; text-shadow: 0 0 20px rgba(239, 68, 68, 0.8), 0 4px 12px rgba(0,0,0,0.9); display: none; z-index: 30;';
      wasted.textContent = 'WASTED';
      hudLayer.appendChild(wasted);
    }

    let menuLayer = document.getElementById('menu-layer');
    if (!menuLayer) {
      menuLayer = document.createElement('div');
      menuLayer.id = 'menu-layer';
      menuLayer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vw; pointer-events: none; z-index: 40; display: flex; align-items: center; justify-content: center;';
      document.body.appendChild(menuLayer);
    }

    let titleOverlay = document.getElementById('title-overlay');
    if (!titleOverlay) {
      titleOverlay = document.createElement('div');
      titleOverlay.id = 'title-overlay';
      menuLayer.appendChild(titleOverlay);
    }
    titleOverlay.style.cssText = 'position: fixed; bottom: 40px; left: 40px; color: #f8fafc; pointer-events: auto; z-index: 20; background: rgba(8, 12, 20, 0.85); padding: 24px 32px; border-left: 5px solid #ff781f; border-radius: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); backdrop-filter: blur(6px); display: flex; flex-direction: column; gap: 12px; max-width: 450px;';
    if (!document.getElementById('start-game-btn')) {
      titleOverlay.innerHTML = `
        <h1 style="margin: 0 0 4px 0; font-size: 28px; letter-spacing: 3px; font-weight: 900; color: #ff781f; text-shadow: 0 0 15px rgba(255, 120, 31, 0.5);">SOLMARINA: NEON HEAT</h1>
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #fde047; letter-spacing: 1px; font-weight: 600;">REX DALTON • $50,000 DEBT TO VERA KANE</p>
        <div style="font-size: 12px; color: #94a3b8; line-height: 1.4;">
          WASD: Drive/Walk • E: Enter/Car • F: Punch • C: Camera • ESC: Pause
        </div>
        <button id="start-game-btn" style="background: linear-gradient(135deg, #ff781f, #f59e0b); color: #080c14; border: none; padding: 12px 24px; font-size: 16px; font-weight: 900; border-radius: 6px; cursor: pointer; box-shadow: 0 4px 16px rgba(255,120,31,0.4); letter-spacing: 1px; margin-top: 4px;">START GAME</button>
      `;
    }

    if (!document.getElementById('pause-menu')) {
      const pauseMenu = document.createElement('div');
      pauseMenu.id = 'pause-menu';
      pauseMenu.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(8,12,20,0.85); display: none; flex-direction: column; align-items: center; justify-content: center; color: #f8fafc; z-index: 50; pointer-events: auto; backdrop-filter: blur(6px);';
      pauseMenu.innerHTML = `
        <h2 style="font-size: 36px; font-weight: 900; color: #fde047; margin: 0 0 20px 0; letter-spacing: 2px;">PAUSED</h2>
        <div style="display: flex; flex-direction: column; gap: 12px; width: 240px;">
          <button id="pause-resume-btn" style="background: #1e293b; color: #f8fafc; border: 1px solid #475569; padding: 12px; font-size: 15px; font-weight: 700; border-radius: 6px; cursor: pointer;">RESUME</button>
          <button id="pause-restart-btn" style="background: #1e293b; color: #f8fafc; border: 1px solid #475569; padding: 12px; font-size: 15px; font-weight: 700; border-radius: 6px; cursor: pointer;">RESTART MISSION</button>
          <button id="pause-title-btn" style="background: #7f1d1d; color: #f8fafc; border: 1px solid #991b1b; padding: 12px; font-size: 15px; font-weight: 700; border-radius: 6px; cursor: pointer;">QUIT TO TITLE</button>
        </div>
      `;
      menuLayer.appendChild(pauseMenu);
    }

    if (!document.getElementById('mission-complete-screen')) {
      const mcScreen = document.createElement('div');
      mcScreen.id = 'mission-complete-screen';
      mcScreen.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(8,12,20,0.9); display: none; flex-direction: column; align-items: center; justify-content: center; color: #f8fafc; z-index: 50; pointer-events: auto; text-align: center; padding: 20px;';
      mcScreen.innerHTML = `
        <div style="font-size: 14px; font-weight: 800; color: #4ade80; letter-spacing: 3px; margin-bottom: 8px;">SUCCESS</div>
        <h2 id="mc-title" style="font-size: 40px; font-weight: 900; color: #fde047; margin: 0 0 15px 0; letter-spacing: 1px;">MISSION COMPLETE</h2>
        <div style="background: rgba(30,41,59,0.9); border: 1px solid rgba(74,222,128,0.4); padding: 20px 30px; border-radius: 10px; margin-bottom: 25px; min-width: 300px;">
          <div style="font-size: 14px; color: #94a3b8; margin-bottom: 6px;">REWARD EARNED</div>
          <div id="mc-reward" style="font-size: 28px; font-weight: 900; color: #4ade80; margin-bottom: 15px;">+$10,000</div>
          <div style="font-size: 14px; color: #94a3b8; margin-bottom: 6px;">REMAINING DEBT TO VERA</div>
          <div id="mc-debt" style="font-size: 22px; font-weight: 800; color: #f87171;">$40,000</div>
        </div>
        <button id="mc-continue-btn" style="background: linear-gradient(135deg, #22c55e, #16a34a); color: #080c14; border: none; padding: 14px 36px; font-size: 18px; font-weight: 900; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 16px rgba(34,197,94,0.4); letter-spacing: 1px;">CONTINUE</button>
      `;
      menuLayer.appendChild(mcScreen);
    }

    if (!document.getElementById('mission-failed-screen')) {
      const mfScreen = document.createElement('div');
      mfScreen.id = 'mission-failed-screen';
      mfScreen.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(8,12,20,0.9); display: none; flex-direction: column; align-items: center; justify-content: center; color: #f8fafc; z-index: 50; pointer-events: auto; text-align: center; padding: 20px; backdrop-filter: blur(6px);';
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
    const titleOverlay = document.getElementById('title-overlay');
    const pauseMenu = document.getElementById('pause-menu');
    const mcScreen = document.getElementById('mission-complete-screen');
    const mfScreen = document.getElementById('mission-failed-screen');
    const statsPanel = document.getElementById('hud-stats');
    const starsDiv = document.getElementById('hud-stars');
    const objBanner = document.getElementById('hud-objective-banner');
    const miniContainer = document.getElementById('minimap-container');

    if (titleOverlay) titleOverlay.style.display = 'none';
    if (pauseMenu) pauseMenu.style.display = 'none';
    if (mcScreen) mcScreen.style.display = 'none';
    if (mfScreen) mfScreen.style.display = 'none';

    if (state === 'attract') {
      if (titleOverlay) titleOverlay.style.display = 'flex';
      if (statsPanel) statsPanel.style.display = 'none';
      if (starsDiv) starsDiv.style.display = 'none';
      if (objBanner) objBanner.style.display = 'none';
      if (miniContainer) miniContainer.style.display = 'none';
    } else if (state === 'playing') {
      if (statsPanel) statsPanel.style.display = 'block';
      if (starsDiv) starsDiv.style.display = 'block';
      if (objBanner) objBanner.style.display = 'block';
      if (miniContainer) miniContainer.style.display = 'block';
    } else if (state === 'paused') {
      if (pauseMenu) pauseMenu.style.display = 'flex';
      if (statsPanel) statsPanel.style.display = 'block';
      if (starsDiv) statsPanel.style.display = 'block';
      if (objBanner) objBanner.style.display = 'block';
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
      healthEl.textContent = Math.round(data.health);
      healthEl.style.color = data.health > 30 ? '#4ade80' : '#ef4444';
    }
    if (cashEl) cashEl.textContent = data.cash.toLocaleString();
    if (debtEl) debtEl.textContent = data.debt.toLocaleString();
    if (speedEl) speedEl.textContent = Math.round(Math.abs(data.speed) * 2.23694);
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
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, w, h);

    const scale = 0.8;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-playerRot);
    ctx.translate(-playerPos.x * scale, -playerPos.z * scale);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    const worldSize = 480;
    const step = 60;

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

    if (policeCars) {
      ctx.fillStyle = '#3b82f6';
      for (const p of policeCars) {
        ctx.beginPath();
        ctx.arc(p.position.x * scale, p.position.z * scale, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

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

  showMissionComplete(reward, debt) {
    const mcReward = document.getElementById('mc-reward');
    const mcDebt = document.getElementById('mc-debt');
    if (mcReward) mcReward.textContent = `+$${reward.toLocaleString()}`;
    if (mcDebt) mcDebt.textContent = `$${debt.toLocaleString()}`;
    this.showState('mission-complete');
  }

  showMissionFailed(reason) {
    const mfReason = document.getElementById('mf-reason');
    if (mfReason) mfReason.textContent = reason || 'Mission objective failed.';
    this.showState('mission-failed');
  }

  showWasted() {
    const wasted = document.getElementById('wasted-banner');
    if (wasted) {
      wasted.style.display = 'block';
    }
  }

  hideOverlays() {
    const wasted = document.getElementById('wasted-banner');
    if (wasted) wasted.style.display = 'none';
    const mcScreen = document.getElementById('mission-complete-screen');
    if (mcScreen) mcScreen.style.display = 'none';
    const mfScreen = document.getElementById('mission-failed-screen');
    if (mfScreen) mfScreen.style.display = 'none';
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) pauseMenu.style.display = 'none';
    const titleOverlay = document.getElementById('title-overlay');
    if (titleOverlay) titleOverlay.style.display = 'none';
  }
}
