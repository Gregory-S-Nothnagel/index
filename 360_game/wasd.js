export const keyState = {
  KeyW: false,
  KeyA: false,
  KeyS: false,
  KeyD: false,
  ShiftLeft: false,
  KeyE: false,
};

let hasPointerLock = false;
let lat = 0, lon = 0;

const movementDirection = [0, 0, 0]; // x, y, z — exported and updated continuously
export { movementDirection };

export function initWASD(canvas, program, gl, players) {
  canvas.addEventListener('click', () => {    
    if (!hasPointerLock) {
      canvas.requestPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    hasPointerLock = document.pointerLockElement === canvas;

    if (hasPointerLock) {
      document.addEventListener('mousemove', handleMouseMove);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
    }
    
  });

  window.addEventListener('keydown', (e) => {
    if (hasPointerLock && e.code in keyState) {
      if (!e.repeat) { // only on first press
        keyState[e.code] = true;
        console.log("here");
      }
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (hasPointerLock && e.code in keyState) {
      keyState[e.code] = false;
      e.preventDefault();
    }
  });

  const uLatLoc = gl.getUniformLocation(program, 'uLat');
  const uLonLoc = gl.getUniformLocation(program, 'uLon');

  let prevLat = 0, prevLon = 0;

  function handleMouseMove(e) {
    //console.log("handlemousemove");
    lon += e.movementX * 0.1;
    lat -= e.movementY * 0.1;
    lat = Math.max(-90, Math.min(89, lat));

    if (lat !== prevLat || lon !== prevLon) {
      prevLat = lat;
      prevLon = lon;
    }

    gl.uniform1f(uLatLoc, lat);
    gl.uniform1f(uLonLoc, lon);
  }

  // Update movement direction every frame
  function updateMovementDirection() {
    // Convert lon from degrees to radians
    const yaw = (lon * Math.PI) / 180;

    const forward = [
      Math.sin(yaw),  // x
      Math.cos(yaw),
      0,  // z
    ];

    const right = [
      Math.cos(yaw),  // x
      -Math.sin(yaw),
      0, // z
    ];

    // Reset vector
    movementDirection[0] = 0;
    movementDirection[1] = 0;
    movementDirection[2] = 0;

    // Apply WASD
    if (keyState.KeyW) {
      movementDirection[0] += forward[0];
      movementDirection[1] += forward[1];
    }
    if (keyState.KeyS) {
      movementDirection[0] -= forward[0];
      movementDirection[1] -= forward[1];
    }
    if (keyState.KeyD) {
      movementDirection[0] += right[0];
      movementDirection[1] += right[1];
    }
    if (keyState.KeyA) {
      movementDirection[0] -= right[0];
      movementDirection[1] -= right[1];
    }

    //console.log('Moving vector:', movementDirection);

    requestAnimationFrame(updateMovementDirection);
  }

  requestAnimationFrame(updateMovementDirection);
}
