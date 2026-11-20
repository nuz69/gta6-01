import * as THREE from '../vendor/three.min.js';
import { CONFIG } from './config.js';

export function stageShot(game, name, seed) {
  // Reset input & ensure state playing
  game.state = 'playing';
  game.hud.showState('playing');
  game.activeCar = null;
  game.player.group.visible = true;

  if (name === 'cover' || name === 'chase') {
    // Find or create sports car
    let sportsCar = game.vehicleManager.vehicles.find(v => v.typeKey === 'sports');
    if (!sportsCar) {
      const mesh = game.vehicleManager.createCarMesh('sports');
      sportsCar = {
        mesh,
        typeKey: 'sports',
        spec: game.vehicleManager.carTypes.sports,
        position: new THREE.Vector3(0, 0, 10),
        velocity: new THREE.Vector3(0, 0, 20),
        speed: 20,
        steering: 0,
        rotation: 0,
        isTraffic: false,
        isParked: false,
        health: 100
      };
      mesh.position.copy(sportsCar.position);
      game.vehicleManager.group.add(mesh);
      game.vehicleManager.vehicles.push(sportsCar);
    } else {
      sportsCar.position.set(0, 0, 10);
      sportsCar.speed = 22;
      sportsCar.rotation = 0;
      sportsCar.mesh.position.copy(sportsCar.position);
      sportsCar.mesh.rotation.y = sportsCar.rotation;
    }

    game.activeCar = sportsCar;
    game.player.group.visible = false;

    // Set camera chase pose behind active car
    const camPos = sportsCar.position.clone().add(new THREE.Vector3(0, 5, -16));
    const camTarget = sportsCar.position.clone().add(new THREE.Vector3(0, 1.6, 0));
    game.renderer.snapCamera(camPos, camTarget);

    if (name === 'cover') {
      game.police.setWanted(3);
      // Place ONE police car explicitly visible ahead & slightly to the side
      const pMesh = game.police.createPoliceCarMesh();
      const pPos = new THREE.Vector3(3.5, 0, 15);
      pMesh.position.copy(pPos);
      pMesh.rotation.y = Math.PI;
      game.police.group.add(pMesh);
      game.police.policeCars.push({
        mesh: pMesh,
        position: pPos.clone(),
        velocity: new THREE.Vector3(),
        speed: 25,
        rotation: Math.PI,
        health: 100,
        smoked: false
      });
    } else if (name === 'chase') {
      game.police.setWanted(4);
      sportsCar.speed = 32;
      // Place TWO police cars explicitly visible
      const offsets = [
        [new THREE.Vector3(-4, 0, 12), Math.PI + 0.2],
        [new THREE.Vector3(4, 0, 18), Math.PI - 0.2]
      ];
      for (const [pos, rot] of offsets) {
        const pMesh = game.police.createPoliceCarMesh();
        pMesh.position.copy(pos);
        pMesh.rotation.y = rot;
        game.police.group.add(pMesh);
        game.police.policeCars.push({
          mesh: pMesh,
          position: pos.clone(),
          velocity: new THREE.Vector3(),
          speed: 28,
          rotation: rot,
          health: 100,
          smoked: false
        });
      }
    }
  } else if (name === 'onfoot') {
    // Start Mission 2
    game.missions.startMission(1);
    const m = game.missions.getCurrentMission();
    if (m) {
      m.packagesCollected = 2;
      m.packagesNeeded = 3;
      m.objective = "Collect 3 hidden packages around the city (2/3)";
      m.waypoint.set(70, 0, 20);
      game.player.position.set(70, 0, 0);
      game.player.group.position.copy(game.player.position);
    }
    game.police.setWanted(0);
    const camPos = game.player.position.clone().add(new THREE.Vector3(0, 3.5, -8));
    const camTarget = game.player.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    game.renderer.snapCamera(camPos, camTarget);
  } else if (name === 'beach') {
    // West edge x ≈ -420 (beach)
    const beachPos = new THREE.Vector3(-420, 0, -60);
    game.player.position.copy(beachPos.clone().add(new THREE.Vector3(3, 0, 2)));
    game.player.group.position.copy(game.player.position);
    game.player.group.visible = true;
    game.activeCar = null;

    // Park a sports car nearby on sand
    const cMesh = game.vehicleManager.createCarMesh('sports');
    cMesh.position.copy(beachPos);
    cMesh.rotation.y = Math.PI / 4;
    game.vehicleManager.group.add(cMesh);

    game.police.setWanted(0);
    game.hud.showMissionComplete(10000, game.missions.getDebt());
    const mcScreen = document.getElementById('mission-complete-screen');
    if (mcScreen) mcScreen.style.background = 'transparent';

    const camPos = new THREE.Vector3(-400, 15, -35);
    const camTarget = new THREE.Vector3(-420, 2, -60);
    game.renderer.snapCamera(camPos, camTarget);
  }

  // Advance simulation a fixed number of steps with fixed dt (1/60 s) for determinism
  const dt = 1 / 60;
  for (let i = 0; i < 30; i++) {
    if (game.activeCar) {
      game.audio.updateEngine(game.activeCar.speed, true);
    }
    game.audio.updateSiren(game.police.stars > 0, dt);
    if (game.activeCar) {
      game.player.position.copy(game.activeCar.position);
      game.player.group.position.copy(game.activeCar.position);
    } else {
      game.player.update(dt, game.input, game.renderer.camera);
    }
    game.vehicleManager.update(dt, game.player, game.activeCar, game.input);
    game.pedManager.update(dt, game.player.position, null);
    game.police.update(dt, game.player.position, game.activeCar, game.vehicleManager, game.player);
    game.missions.update(dt, game.player.position, game.activeCar, game.police.stars);
  }

  if (name === 'cover' || name === 'chase') {
    game.missions.startMission(0);
    // R3b3c: mission objects carry `desc`, not `objective` — without this
    // updateHUD() would render the banner as "undefined".
    const curM = game.missions.getCurrentMission();
    if (curM) curM.objective = curM.desc;
    game.player.health = 100;
    if (name === 'cover') {
      if (game.activeCar) game.activeCar.speed = 22;
      game.police.setWanted(3);
    } else if (name === 'chase') {
      if (game.activeCar) game.activeCar.speed = 32;
      game.police.setWanted(4);
    }
  }

  // R3b3c: refresh HUD + minimap from the final staged state, before freezing.
  // tick() early-returns once shotFrozen, so without this the frozen frame
  // shows the initial HUD values. Payload identical to tick() in main.js.
  const curMission = game.missions.getCurrentMission();
  const waypoint = (curMission && curMission.active) ? curMission.targetPosition : null;
  game.hud.updateHUD({
    health: game.player.health,
    cash: game.missions.getCash(),
    debt: game.missions.getDebt(),
    speed: game.activeCar ? game.activeCar.speed : 0,
    policeStars: game.police.stars,
    mission: curMission
  });
  game.hud.updateMinimap(
    game.player.position,
    game.activeCar ? game.activeCar.rotation : game.player.rotationY,
    waypoint,
    game.police.policeCars,
    game.missions.sunCoins
  );

  game.shotFrozen = true;

  // One render after freeze, then set __shotReady = true
  game.renderer.render();
  requestAnimationFrame(() => {
    window.__shotReady = true;
  });
}
