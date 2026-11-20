// MPH shown on the HUD for every 1 m/s of in-game speed.
const MS_TO_MPH = 2.23694;
// Health at or below this turns the HUD health value red.
const LOW_HEALTH = 30;
// Minimap world-to-pixel scale and the grid it draws.
const MINIMAP_SCALE = 0.8;
const MINIMAP_WORLD = 480;
const MINIMAP_GRID_STEP = 60;

export class HeadsUpDisplay {
  constructor() {
    this.buildInterface();
  }

  // Fetch an element by id, or create it under `parent` when missing.
  // Every HUD panel goes through here so the "create once, reuse" shape
  // lives in one place instead of being repeated per panel.
  ensureElement(id, tag, cssText, parent) {
    let el = document.getElementById(id);
    if (el) return el;
    el = document.createElement(tag);
    el.id = id;
    if (cssText) el.style.cssText = cssText;
    parent.appendChild(el);
    return el;
  }

  setDisplay(id, display) {
    const el = document.getElementById(id);
    if (el) el.style.display = display;
  }

  setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  buildInterface() {
    const hudLayer = this.buildHudLayer();
    this.buildStatsPanel(hudLayer);
    this.buildStarsRow(hudLayer);
    this.buildObjectiveBanner(hudLayer);
    this.buildMinimap(hudLayer);
    this.buildWastedBanner(hudLayer);

    const menuLayer = this.buildMenuLayer();
    this.buildTitleOverlay(menuLayer);
    this.buildPauseMenu(menuLayer);
    this.buildMissionCompleteScreen(menuLayer);
    this.buildMissionFailedScreen(menuLayer);
  }

  buildHudLayer() {
    return this.ensureElement(
      'hud-layer',
      'div',
      'position: fixed; top: 0; left: 0; width: 100vw; height: 100vw; pointer-events: none; z-index: 10;',
      document.body
    );
  }

  buildMenuLayer() {
    return this.ensureElement(
      'menu-layer',
      'div',
      'position: fixed; top: 0; left: 0; width: 100vw; height: 100vw; pointer-events: none; z-index: 40; display: flex; align-items: center; justify-content: center;',
      document.body
    );
  }

  buildStatsPanel(hudLayer) {
    const stats = this.ensureElement(
      'hud-stats',
      'div',
      'position: absolute; top: 24px; left: 28px; color: #f8fafc; font-size: 15px; font-weight: 700; text-shadow: 0 2px 6px rgba(0,0,0,0.8); background: rgba(8, 12, 20, 0.6); padding: 12px 18px; border-left: 4px solid #ff781f; border-radius: 4px; display: none; backdrop-filter: blur(4px);',
      hudLayer
    );
    if (!document.getElementById('hud-health-val') || !document.getElementById('hud-debt-val') || !document.getElementById('hud-speed-val')) {
      stats.innerHTML = `
        <div style="margin-bottom: 4px;">HEALTH: <span id="hud-health-val" style="color: #4ade80;">100</span>%</div>
        <div style="margin-bottom: 4px;">CASH: $<span id="hud-cash-val" style="color: #fde047;">5,000</span></div>
        <div style="margin-bottom: 4px;">DEBT: $<span id="hud-debt-val" style="color: #f87171;">50,000</span></div>
        <div>SPEED: <span id="hud-speed-val" style="color: #38bdf8;">0</span> MPH</div>
      `;
    }
  }

  buildStarsRow(hudLayer) {
    const stars = this.ensureElement(
      'hud-stars',
      'div',
      'position: absolute; top: 24px; right: 28px; font-size: 26px; color: #fde047; text-shadow: 0 0 10px rgba(253, 224, 71, 0.6); display: none; letter-spacing: 2px;',
      hudLayer
    );
    // Only the freshly created row needs its initial (empty) stars.
    if (stars.textContent === '') stars.textContent = '☆☆☆☆☆';
  }

  buildObjectiveBanner(hudLayer) {
    if (document.getElementById('hud-objective-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'hud-objective-banner';
    banner.style.cssText = 'position: absolute; top: 24px; left: 50%; transform: translateX(-50%); background: rgba(8, 12, 20, 0.85); border: 2px solid #ff781f; padding: 10px 20px; border-radius: 8px; text-align: center; color: #f8fafc; text-shadow: 0 2px 4px rgba(0,0,0,0.8); display: none; pointer-events: auto; max-width: 500px; backdrop-filter: blur(4px);';
    banner.innerHTML = `
        <div id="hud-mission-title" style="font-size: 13px; font-weight: 800; color: #ff781f; letter-spacing: 1px; margin-bottom: 3px;">MISSION</div>
        <div id="hud-objective-text" style="font-size: 14px; font-weight: 600; color: #fde047;">Drive to destination</div>
      `;
    hudLayer.appendChild(banner);
  }

  buildMinimap(hudLayer) {
    if (document.getElementById('minimap-container')) return;
    const container = document.createElement('div');
    container.id = 'minimap-container';
    container.style.cssText = 'position: absolute; bottom: 24px; right: 28px; width: 160px; height: 160px; background: rgba(8, 12, 20, 0.85); border: 2px solid #ff781f; border-radius: 50%; overflow: hidden; display: none; box-shadow: 0 4px 16px rgba(0,0,0,0.6); backdrop-filter: blur(4px);';
    container.innerHTML = `<canvas id="minimap-canvas" width="160" height="160" style="display: block; width: 100%; height: 100%;"></canvas>`;
    hudLayer.appendChild(container);
  }

  buildWastedBanner(hudLayer) {
    const wasted = this.ensureElement(
      'wasted-banner',
      'div',
      'position: absolute; top: 42%; left: 50%; transform: translate(-50%, -50%); color: #ef4444; font-size: 56px; font-weight: 900; letter-spacing: 4px; text-shadow: 0 0 20px rgba(239, 68, 68, 0.8), 0 4px 12px rgba(0,0,0,0.9); display: none; z-index: 30;',
      hudLayer
    );
    if (wasted.textContent === '') wasted.textContent = 'WASTED';
  }

  buildTitleOverlay(menuLayer) {
    const overlay = this.ensureElement('title-overlay', 'div', '', menuLayer);
    overlay.style.cssText = 'position: fixed; bottom: 40px; left: 40px; color: #f8fafc; pointer-events: auto; z-index: 20; background: rgba(8, 12, 20, 0.85); padding: 24px 32px; border-left: 5px solid #ff781f; border-radius: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); backdrop-filter: blur(6px); display: flex; flex-direction: column; gap: 12px; max-width: 450px;';
    if (!document.getElementById('start-game-btn')) {
      overlay.innerHTML = `
        <h1 style="margin: 0 0 4px 0; font-size: 28px; letter-spacing: 3px; font-weight: 900; color: #ff781f; text-shadow: 0 0 15px rgba(255, 120, 31, 0.5);">SOLMARINA: NEON HEAT</h1>
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #fde047; letter-spacing: 1px; font-weight: 600;">REX DALTON • $50,000 DEBT TO VERA KANE</p>
        <div style="font-size: 12px; color: #94a3b8; line-height: 1.4;">
          WASD: Drive/Walk • E: Enter/Car • F: Punch • C: Camera • ESC: Pause
        </div>
        <button id="start-game-btn" style="background: linear-gradient(135deg, #ff781f, #f59e0b); color: #080c14; border: none; padding: 12px 24px; font-size: 16px; font-weight: 900; border-radius: 6px; cursor: pointer; box-shadow: 0 4px 16px rgba(255,120,31,0.4); letter-spacing: 1px; margin-top: 4px;">START GAME</button>
      `;
    }
  }

  buildPauseMenu(menuLayer) {
    if (document.getElementById('pause-menu')) return;
    const menu = document.createElement('div');
    menu.id = 'pause-menu';
    menu.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(8,12,20,0.85); display: none; flex-direction: column; align-items: center; justify-content: center; color: #f8fafc; z-index: 50; pointer-events: auto; backdrop-filter: blur(6px);';
    menu.innerHTML = `
        <h2 style="font-size: 36px; font-weight: 900; color: #fde047; margin: 0 0 20px 0; letter-spacing: 2px;">PAUSED</h2>
        <div style="display: flex; flex-direction: column; gap: 12px; width: 240px;">
          <button id="pause-resume-btn" style="background: #1e293b; color: #f8fafc; border: 1px solid #475569; padding: 12px; font-size: 15px; font-weight: 700; border-radius: 6px; cursor: pointer;">RESUME</button>
          <button id="pause-restart-btn" style="background: #1e293b; color: #f8fafc; border: 1px solid #475569; padding: 12px; font-size: 15px; font-weight: 700; border-radius: 6px; cursor: pointer;">RESTART MISSION</button>
          <button id="pause-title-btn" style="background: #7f1d1d; color: #f8fafc; border: 1px solid #991b1b; padding: 12px; font-size: 15px; font-weight: 700; border-radius: 6px; cursor: pointer;">QUIT TO TITLE</button>
        </div>
      `;
    menuLayer.appendChild(menu);
  }

  buildMissionCompleteScreen(menuLayer) {
    if (document.getElementById('mission-complete-screen')) return;
    const screen = document.createElement('div');
    screen.id = 'mission-complete-screen';
    screen.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(8,12,20,0.9); display: none; flex-direction: column; align-items: center; justify-content: center; color: #f8fafc; z-index: 50; pointer-events: auto; text-align: center; padding: 20px;';
    screen.innerHTML = `
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
    menuLayer.appendChild(screen);
  }

  buildMissionFailedScreen(menuLayer) {
    if (document.getElementById('mission-failed-screen')) return;
    const screen = document.createElement('div');
    screen.id = 'mission-failed-screen';
    screen.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(8,12,20,0.9); display: none; flex-direction: column; align-items: center; justify-content: center; color: #f8fafc; z-index: 50; pointer-events: auto; text-align: center; padding: 20px; backdrop-filter: blur(6px);';
    screen.innerHTML = `
        <div style="font-size: 14px; font-weight: 800; color: #ef4444; letter-spacing: 3px; margin-bottom: 8px;">MISSION FAILED</div>
        <h2 style="font-size: 40px; font-weight: 900; color: #ef4444; margin: 0 0 15px 0; letter-spacing: 1px;">BUSTED OR EXPIRED</h2>
        <p id="mf-reason" style="font-size: 16px; color: #cbd5e1; margin: 0 0 25px 0;">Time expired or mission objective failed.</p>
        <button id="mf-retry-btn" style="background: linear-gradient(135deg, #ef4444, #dc2626); color: #f8fafc; border: none; padding: 14px 36px; font-size: 18px; font-weight: 900; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 16px rgba(239,68,68,0.4); letter-spacing: 1px;">RETRY MISSION</button>
      `;
    menuLayer.appendChild(screen);
  }

  // Which full-screen overlay each state shows, and whether the in-game
  // HUD cluster (stats / stars / banner / minimap) is visible. A null
  // `hud` entry leaves the cluster exactly as it was — the mission-end
  // states never touch it.
  static STATE_LAYOUTS = {
    attract: { overlay: ['title-overlay', 'flex'], hud: 'none' },
    playing: { overlay: null, hud: 'block' },
    paused: { overlay: ['pause-menu', 'flex'], hud: 'block' },
    'mission-complete': { overlay: ['mission-complete-screen', 'flex'], hud: null },
    'mission-failed': { overlay: ['mission-failed-screen', 'flex'], hud: null }
  };

  static OVERLAY_IDS = [
    'title-overlay',
    'pause-menu',
    'mission-complete-screen',
    'mission-failed-screen'
  ];

  static HUD_IDS = [
    'hud-stats',
    'hud-stars',
    'hud-objective-banner',
    'minimap-container'
  ];

  showState(state) {
    for (const id of HeadsUpDisplay.OVERLAY_IDS) this.setDisplay(id, 'none');

    const layout = HeadsUpDisplay.STATE_LAYOUTS[state];
    if (!layout) return;
    if (layout.overlay) this.setDisplay(layout.overlay[0], layout.overlay[1]);
    if (layout.hud !== null) {
      for (const id of HeadsUpDisplay.HUD_IDS) this.setDisplay(id, layout.hud);
    }
  }

  updateHUD(data) {
    const healthEl = document.getElementById('hud-health-val');
    if (healthEl) {
      healthEl.textContent = Math.round(data.health);
      healthEl.style.color = data.health > LOW_HEALTH ? '#4ade80' : '#ef4444';
    }
    this.setText('hud-cash-val', data.cash.toLocaleString());
    this.setText('hud-debt-val', data.debt.toLocaleString());
    this.setText('hud-speed-val', Math.round(Math.abs(data.speed) * MS_TO_MPH));

    const stars = data.policeStars || 0;
    this.setText('hud-stars', '★'.repeat(stars) + '☆☆☆☆☆'.slice(0, 5 - stars));

    if (data.mission) {
      this.setText('hud-mission-title', `MISSION ${data.mission.id}: ${data.mission.title.toUpperCase()}`);
      this.setText('hud-objective-text', data.mission.objective);
    } else {
      this.setText('hud-mission-title', `FREE ROAM`);
      this.setText('hud-objective-text', `Explore Solmarina or trigger missions!`);
    }
  }

  updateMinimap(playerPos, playerRot, waypoint, policeCars, sunCoins) {
    const canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-playerRot);
    ctx.translate(-playerPos.x * MINIMAP_SCALE, -playerPos.z * MINIMAP_SCALE);

    this.drawMinimapGrid(ctx);
    this.drawMinimapCoins(ctx, sunCoins);
    this.drawMinimapPolice(ctx, policeCars);
    this.drawMinimapWaypoint(ctx, waypoint);

    ctx.restore();

    ctx.save();
    ctx.translate(w / 2, h / 2);
    this.drawPlayerArrow(ctx);
    ctx.restore();
  }

  drawMinimapGrid(ctx) {
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    for (let x = -MINIMAP_WORLD; x <= MINIMAP_WORLD; x += MINIMAP_GRID_STEP) {
      ctx.beginPath();
      ctx.moveTo(x * MINIMAP_SCALE, -MINIMAP_WORLD * MINIMAP_SCALE);
      ctx.lineTo(x * MINIMAP_SCALE, MINIMAP_WORLD * MINIMAP_SCALE);
      ctx.stroke();
    }
    for (let z = -MINIMAP_WORLD; z <= MINIMAP_WORLD; z += MINIMAP_GRID_STEP) {
      ctx.beginPath();
      ctx.moveTo(-MINIMAP_WORLD * MINIMAP_SCALE, z * MINIMAP_SCALE);
      ctx.lineTo(MINIMAP_WORLD * MINIMAP_SCALE, z * MINIMAP_SCALE);
      ctx.stroke();
    }
  }

  drawMinimapCoins(ctx, sunCoins) {
    if (!sunCoins) return;
    ctx.fillStyle = '#fde047';
    for (const coin of sunCoins) {
      if (!coin.collected) {
        ctx.beginPath();
        ctx.arc(coin.position.x * MINIMAP_SCALE, coin.position.z * MINIMAP_SCALE, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawMinimapPolice(ctx, policeCars) {
    if (!policeCars) return;
    ctx.fillStyle = '#3b82f6';
    for (const car of policeCars) {
      ctx.beginPath();
      ctx.arc(car.position.x * MINIMAP_SCALE, car.position.z * MINIMAP_SCALE, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawMinimapWaypoint(ctx, waypoint) {
    if (!waypoint) return;
    ctx.fillStyle = '#ff781f';
    ctx.beginPath();
    ctx.arc(waypoint.x * MINIMAP_SCALE, waypoint.z * MINIMAP_SCALE, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawPlayerArrow(ctx) {
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
  }

  showMissionComplete(reward, debt) {
    this.setText('mc-reward', `+$${reward.toLocaleString()}`);
    this.setText('mc-debt', `$${debt.toLocaleString()}`);
    this.showState('mission-complete');
  }

  showMissionFailed(reason) {
    this.setText('mf-reason', reason || 'Mission objective failed.');
    this.showState('mission-failed');
  }

  showWasted() {
    this.setDisplay('wasted-banner', 'block');
  }

  hideOverlays() {
    this.setDisplay('wasted-banner', 'none');
    this.setDisplay('mission-complete-screen', 'none');
    this.setDisplay('mission-failed-screen', 'none');
    this.setDisplay('pause-menu', 'none');
    this.setDisplay('title-overlay', 'none');
  }
}
