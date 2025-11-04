// main.js
import { vertexShaderSrc, fragmentShaderSrc } from './shaders.js';
import { createProgram, setupFullscreenQuad, setupFOV, setupVideoTexture } from './setup.js';
import { initWASD, keyState, movementDirection } from './wasd.js';
import { nodeArr0, nodeArr1, nodeArr2 } from './nodeArrs.js';
import { VideoNodePlayer } from './video.js';

function dot(v1, v2) {
  return v1.reduce((sum, val, i) => sum + val * v2[i], 0);
}

function normalize(v) {
  const len = Math.hypot(...v);
  if (len === 0) return [...v]; // return copy of original to avoid mutation
  return v.map(x => x / len);
}

const canvas = document.getElementById('gl');
const gl     = canvas.getContext('webgl');
if (!gl) throw new Error('WebGL not supported');

// compile & bind your shader program:
const program = createProgram(gl, vertexShaderSrc, fragmentShaderSrc);
gl.useProgram(program);
setupFullscreenQuad(gl, program);
setupFOV(gl, program, canvas);

// build two players:
const players = [
  new VideoNodePlayer(gl, program, canvas, nodeArr0, ['./0.mp4', './0b.mp4'], [2, 1], [], []),
  new VideoNodePlayer(gl, program, canvas, nodeArr1, ['./1.mp4', './1b.mp4', './3.mp4'], [], [0], [99]),
  new VideoNodePlayer(gl, program, canvas, nodeArr2, ['./2.mp4', './2b.mp4'], [], [0], []),
];

initWASD(canvas, program, gl, players);

// bind sampler uniform once:
const uTexLoc = gl.getUniformLocation(program, 'uTex');
gl.uniform1i(uTexLoc, 0);

// track which is active:
let activeIdx = 0;
let active = players[0];
let backwards = 0;
let interacting = false;

// replace safePlay + safePause with this single function
function setPlaying(video, player, idx, want) {
  // bump token so older play() promises are ignored
  player.playToken[idx] = (player.playToken[idx] || 0) + 1;
  const token = player.playToken[idx];

  if (!want) {
    // pause immediately and mark not-ready
    try { video.pause(); } catch (e) {}
    player.playingReady[idx] = false;
    return;
  }

  // already playing?
  if (!video.paused && !video.ended) {
    player.playingReady[idx] = true;
    return;
  }

  // try to start playback; catch sync exceptions
  let p;
  try { p = video.play(); } catch (err) {
    player.playingReady[idx] = false;
    return;
  }

  if (p && typeof p.then === 'function') {
    player.playingReady[idx] = false;
    p.then(() => {
      if (player.playToken[idx] !== token) return; // stale
      player.playingReady[idx] = true;
    }).catch(err => {
      if (player.playToken[idx] !== token) return; // stale
      const isAbort = err && (err.name === 'AbortError' || (err.message && err.message.includes('interrupted')));
      if (!isAbort) console.warn('Video failed to play:', err);
      player.playingReady[idx] = false;
    });
  } else {
    // old browsers
    player.playingReady[idx] = !video.paused;
  }
}

function render() {
  
  console.log(active.frameIndex);

  let matchActionTarget = -1;
  for (let i = 0; i < active.actionTargets.length; i++) {
    if (active.frameIndex === active.actionTargets[i]) {
      matchActionTarget = i;
      console.log("match!");
    }
  }

  if ((keyState.KeyE && matchActionTarget != -1) || interacting) { // seeking action

    if (!interacting) {
      setPlaying(active.video[backwards], active, backwards, false);
    }
    
    if (active.video[2 + matchActionTarget].ended) {
      interacting = false;
      keyState.KeyE = false;
      console.log("ended");
      backwards = 0;
      active.video[0].currentTime = active.actionTargets[matchActionTarget] / 30.0;
      active.video[2 + matchActionTarget].currentTime = 0;
    }
    else if (keyState.KeyE) {
      backwards = 2 + matchActionTarget;
      setPlaying(active.video[2 + matchActionTarget], active, 2 + matchActionTarget, true);
      interacting = true;
    }
    else {
      setPlaying(active.video[2 + matchActionTarget], active, 2 + matchActionTarget, false);
    }
    
  }
  else { // using movement
  
    active = players[activeIdx];
  
    // 2) Update what frame we're on
    if (backwards === 0) active.frameIndex = Math.min(Math.round(active.video[backwards].currentTime * active.fps), active.nodeArr.length - 1);
    else if (backwards === 1) active.frameIndex = Math.min(Math.round((active.video[backwards].duration - active.video[backwards].currentTime) * active.fps), active.nodeArr.length - 1);
  
    // find best frame
    let bestFrame = active.frameIndex;
    let bestFrameDot = -Infinity;
    for (const idx of active.nodeArr[active.frameIndex][2]) {
      const dir = normalize([
        active.nodeArr[idx][0] - active.nodeArr[active.frameIndex][0],
        active.nodeArr[idx][1] - active.nodeArr[active.frameIndex][1],
        0
      ]);
      const d = dot(movementDirection, dir);
      if (d > bestFrameDot && d > 0) {
        bestFrameDot = d;
        bestFrame = idx;
      }
    }
    
    // find best video
    let bestVideo = activeIdx;
    let bestVideoDot = -Infinity;
    if (active.frameIndex === active.nodeArr.length - 1) {
        for (var playerIdx of active.tailConnections) {
          const dir = normalize([
            players[playerIdx].nodeArr[0][0] - active.nodeArr[active.frameIndex][0],
            players[playerIdx].nodeArr[0][1] - active.nodeArr[active.frameIndex][1],
            0
          ]);
          const d = dot(movementDirection, dir);
          if (d > bestVideoDot && d > 0) {
            bestVideoDot = d;
            bestVideo = playerIdx;
          }
        }
    }
    else if (active.frameIndex === 0) {
        for (var playerIdx of active.headConnections) {
          const idx = players[playerIdx].nodeArr.length - 1;
          //console.log(idx, active.frameIndex);
          const dir = normalize([
            players[playerIdx].nodeArr[idx][0] - active.nodeArr[active.frameIndex][0],
            players[playerIdx].nodeArr[idx][1] - active.nodeArr[active.frameIndex][1],
            0
          ]);
          const d = dot(movementDirection, dir);
          if (d > bestVideoDot && d > 0) {
            bestVideoDot = d;
            bestVideo = playerIdx;
          }
        }
    }


    if (!keyState.KeyW && !keyState.KeyA && !keyState.KeyS && !keyState.KeyD) { // user stopped
      if (!active.video[backwards].paused) setPlaying(active.video[backwards], active, backwards, false);
    }
    else if (active.frameIndex === active.nodeArr.length - 1) { // last node in a sequence
      console.log("bestVideo: ", bestVideo, "activeIdx: ", activeIdx, "bestFrame", bestFrame, active.nodeArr[bestFrame][0], active.nodeArr[bestFrame][1]);
      if (bestVideo != activeIdx) {
        setPlaying(players[activeIdx].video[backwards], players[activeIdx], backwards, false);
        activeIdx = bestVideo;
        players[activeIdx].video[0].currentTime = 0;
        setPlaying(players[activeIdx].video[0], players[activeIdx], 0, true);
        backwards = 0;
      }
      else if (bestFrame === active.frameIndex) {
        setPlaying(active.video[backwards], active, backwards, false);
      }
      else { // going backward
        if (backwards === 0) { // was just going forward
          if (!active.video[0].paused) setPlaying(active.video[0], active, 0, false);
          active.video[1].currentTime = active.video[0].duration - active.video[0].currentTime;
          if (active.video[1].paused) setPlaying(active.video[1], active, 1, true);
        }
        else if (backwards === 1) { // was just going backward
          if (active.video[1].paused) setPlaying(active.video[1], active, 1, true);
        }
        backwards = 1;
      }
    
    }
    else if (active.frameIndex === 0) {
        
      if (bestVideo != activeIdx) {
        setPlaying(players[activeIdx].video[backwards], players[activeIdx], backwards, false);
        activeIdx = bestVideo;
        players[activeIdx].video[1].currentTime = 0;
        setPlaying(players[activeIdx].video[1], players[activeIdx], 1, true);
        backwards = 1;
      }
      else if (bestFrame > active.frameIndex) { // going forward
        if (backwards === 0) { // was just going forward
          if (active.video[0].paused) setPlaying(active.video[0], active, 0, true);
        }
        else if (backwards === 1) { // was just going backward
          if (!active.video[1].paused) setPlaying(active.video[1], active, 1, false);
          active.video[0].currentTime = active.video[1].duration - active.video[1].currentTime;
          if (active.video[0].paused) setPlaying(active.video[0], active, 0, true);
        }
        backwards = 0;
      }
    
    }
    else if (bestFrame > active.frameIndex) { // going forward
      if (backwards === 0) { // was just going forward
        if (active.video[0].paused) setPlaying(active.video[0], active, 0, true);
      }
      else if (backwards === 1) { // was just going backward
        if (!active.video[1].paused) setPlaying(active.video[1], active, 1, false);
        active.video[0].currentTime = active.video[1].duration - active.video[1].currentTime;
        if (active.video[0].paused) setPlaying(active.video[0], active, 0, true);
      }
      backwards = 0;
    }
    else { // going backward
      if (backwards === 0) { // was just going forward
        if (!active.video[0].paused) setPlaying(active.video[0], active, 0, false);
        active.video[1].currentTime = active.video[0].duration - active.video[0].currentTime;
        if (active.video[1].paused) setPlaying(active.video[1], active, 1, true);
      }
      else if (backwards === 1) { // was just going backward
        if (active.video[1].paused) setPlaying(active.video[1], active, 1, true);
      }
      backwards = 1;
    }
  }
  
  if (keyState.ShiftLeft) active.video[backwards].playbackRate = 3.0;
  else active.video[backwards].playbackRate = 1.0;
    
  const vid = active.video && active.video[backwards];
  const tex = active.texture && active.texture[backwards];
  if (!active.playingReady[backwards] || !vid || vid.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !tex) {
    // 4) Draw the fullscreen quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
    return; // skip texture upload & draw until playback is ready
  }
  else {
    // safe: bind texture and upload video frame
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, vid);

    // draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
}

requestAnimationFrame(render);

