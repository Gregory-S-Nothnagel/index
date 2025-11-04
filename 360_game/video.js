// VideoNodePlayer.js
import { createProgram, setupFullscreenQuad, setupFOV, setupVideoTexture } from './setup.js';

export class VideoNodePlayer {
  /**
   * @param {WebGLRenderingContext} gl
   * @param {WebGLProgram}        program
   * @param {HTMLCanvasElement}   canvas
   * @param {Array}               nodeArr   – your node_arr for this video
   * @param {string}              videoSrc  – URL of the .mp4
   */
  constructor(gl, program, canvas, nodeArr, videoSrc, tailConnections, headConnections, actionTargets) {
    this.gl       = gl;
    this.program  = program;
    this.canvas   = canvas;
    this.nodeArr  = nodeArr;
    this.tailConnections = tailConnections;
    this.headConnections = headConnections;
    this.actionTargets = actionTargets;
    this.fps      = 30;
    this.video = [];
    this.texture = [];
    this.playToken = [];
    this.shouldBePlaying = [];
    this.playingReady = [];

    // constructor: register one handler per video index
    for (let i = 0; i < videoSrc.length; i++) {
      this.video[i] = document.createElement('video');
      this.video[i].src = videoSrc[i];
      this.video[i].crossOrigin = 'anonymous';
      this.video[i].playsInline = true;
      this.video[i].preload = 'auto';
      this.video[i].loop = false;
      this.texture[i] = null;
      this.playToken[i] = 0;
      this.shouldBePlaying[i] = false;
      this.playingReady[i] = true;

      // pass index to shared handler
      this.video[i].addEventListener('loadeddata', () => this._onLoaded(i), { once: true });
    }
    
    this.frameIndex = 0;
  }

  // single _onLoaded(index) method
  _onLoaded(index) {
    // size/viewport only once per player
    this.canvas.width  = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    this.texture[index] = setupVideoTexture(
      this.gl,
      this.video[index].videoWidth || 1,
      this.video[index].videoHeight || 1
    );
  }

}
