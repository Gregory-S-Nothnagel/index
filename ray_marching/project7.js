/*
CS 535)
Project #7
Gregory Nothnagel


Description: 

Procedurally generated voxel terrain, stretching infinitely in all directions, rendered using raymarching technique.
This javascript file handles initialization of terrain parameters, player movement and collision of viewer with terrain.
The html file handles the raymarching from the view direction of each fragment, and the colorization of blocks.

CONTROLS: WASD to move, space to fly, Shift while moving to move faster

* NOTE: if controls aren't working, you may have to click the window with your mouse. (like when you try to type in a browser search bar but it doesn't work because you have Microsoft Word open, so you have to click the search bar so the browser knows to associate your key presses to the browser environment)

CONSTANTS WHICH CAN BE CHANGED:
	SMOOTHING (bool in html file), just because it's cool to see the difference between smooth shading and blocky shading
	numWaves (must be changed in javascript file AND html file)   (I wouldn't suggest changing this, the way I have it now with numWaves = 10 looks the best in my opinion)
	RENDER_DISTANCE (int in html file), since this may affect latency/lag of program.

* NOTE: If the program is running too slow, you may want to consider adjusting the browser's resolution (in chrome it's called "zoom"). This reduces number of fragments, reducing load on frag shader, which is usually the bottleneck for performance. Likewise, if you notice there is no lag, you may want to consider increasing the zoom until the resolution is full, for a more visually appealing experience

* NOTE: If you don't like the look of the terrain, reload the page and the terrain randomly generates again

Have fun!

*/





function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// Standard Normal variate using Box-Muller transform.
function gaussianRandom(mean=0, stdev=1) {
    const u = 1 - Math.random(); // Converting [0,1) to (0,1]
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    // Transform to the desired mean and standard deviation:
    return z * stdev + mean;
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
};

function main() {
	const canvas = document.getElementById("glcanvas");
	const gl = canvas.getContext("webgl2");

	if (!gl) {
	    console.error("Unable to initialize WebGL.");
	    return;
	}

	const vertexShaderSource = document.getElementById("vertex-shader").text;
	const fragmentShaderSource = document.getElementById("fragment-shader").text;

	function createShader(gl, type, source) {
	    const shader = gl.createShader(type);
	    gl.shaderSource(shader, source);
	    gl.compileShader(shader);

	    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
	        console.error(gl.getShaderInfoLog(shader));
	        gl.deleteShader(shader);
	        return null;
	    }
	    return shader;
	}

	const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
	const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

	const program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
	    console.error(gl.getProgramInfoLog(program));
	    return;
	}

	gl.useProgram(program);

	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

	const positions = [
	    -1, -1,
	     1, -1,
	    -1,  1,
	    -1,  1,
	     1, -1,
	     1,  1,
	];

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

	const positionLocation = gl.getAttribLocation(program, "aPosition");

	gl.enableVertexAttribArray(positionLocation);
	gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

	const resolutionUniformLocation = gl.getUniformLocation(program, "iResolution");
	
	
	
	
	// Create the UBO
	var ubo = gl.createBuffer();
	gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);

	// Define the array data
	// if you edit numWaves, make sure to edit it in frag shader too!!!
	var numWaves = 10;
	var uboData = new Float32Array(numWaves * 8);
	
	for (let w = 0; w < numWaves; w++){
		
		// initializing direction of this sine wave
		var coord = w * 4;
		uboData[coord + 0] = gaussianRandom();
		uboData[coord + 1] = gaussianRandom();
		uboData[coord + 2] = gaussianRandom();
		uboData[coord + 3] = randomRange(-1, 1);
		
		var sum = 0;
		sum += Math.pow(uboData[coord + 0], 2);
		sum += Math.pow(uboData[coord + 1], 2);
		sum += Math.pow(uboData[coord + 2], 2);
		sum = Math.sqrt(sum);
		
		//normalizing direction
		uboData[coord + 0] /= sum;
		uboData[coord + 1] /= sum;
		uboData[coord + 2] /= sum;
		
		// initializing this sine wave's frequency and amplitude
		coord = numWaves * 4 + w * 4;
		uboData[coord + 0] = randomRange(-.2, .2);
		uboData[coord + 1] = randomRange(-20, 20);
	}

	// Upload the data to the UBO
	gl.bufferData(gl.UNIFORM_BUFFER, uboData, gl.STATIC_DRAW);

	// Bind the UBO to the shader's uniform block
	var blockIndex = gl.getUniformBlockIndex(program, 'WaveGroup');
	gl.uniformBlockBinding(program, blockIndex, 0);
	gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, ubo);
	
	// returns true if voxel exists at specified location
	// Almost identical to "findVoxel()" function in frag shader, we just need that function here as well to detect collisions so the player can move around realistically
	function voxelAt(p) { 
	
			var flag = false;
			
			var sum = 0;
			
			for (let wave = 0; wave < numWaves; wave++){
				var coord1 = wave * 4;
				var coord2 = numWaves * 4 + wave * 4;
				sum += uboData[coord2 + 1] * Math.sin(uboData[coord2 + 0] * (uboData[coord1 + 0] * p[0] + uboData[coord1 + 1] * p[1] + uboData[coord1 + 2] * p[2] + uboData[coord1 + 3]));
			}
			
			if (p[1] < 0){
				if (sum > 0) flag = true;
				else flag = false;
			}
			else {
				if (sum > p[1]) flag = true;
				else flag = false;
			}
			
			
			if (flag) return true;
			else return false;
			
		}
	
	
	
	
	
	var viewRotation = new Float32Array([0.0, 0.0, 0.0]);
	const viewRotationLocation = gl.getUniformLocation(program, "viewRotation");
	updateViewRotation();
	
	function updateViewRotation() {
		gl.uniform3f(viewRotationLocation, viewRotation[0], viewRotation[1], viewRotation[2]);
	}
	
	var eyePos = new Float32Array([0.0, 0.0, 0.0]); // initial player eye position
	const eyeUniformLocation = gl.getUniformLocation(program, "eyePos");
	updateEyePos();
	
	function updateEyePos() {
		gl.uniform3f(eyeUniformLocation, eyePos[0], eyePos[1], eyePos[2]);
	}

	// Movement tracking
	let moveState = { w: false, a: false, s: false, d: false, space: false, shift: false};
	const speed = 0.2; // Adjust speed for smoother movement

	function updateEyePosition() {
		
		var thisVoxel = [Math.round(eyePos[0]), Math.round(eyePos[1]), Math.round(eyePos[2])];
		
		// Update the eye position based on pressed keys
		if (moveState.w) {
			var newPos2 = eyePos[2] + Math.cos(viewRotation[1] * Math.PI / 180.0) * (speed + moveState.shift * speed);
			var newPos0 = eyePos[0] + Math.sin(viewRotation[1] * Math.PI / 180.0) * (speed + moveState.shift * speed);
			var newVoxel0 = [Math.round(newPos0), Math.round(eyePos[1]), Math.round(eyePos[2])];
			var newVoxel2 = [Math.round(eyePos[0]), Math.round(eyePos[1]), Math.round(newPos2)];
			if (!voxelAt(newVoxel0)) eyePos[0] = newPos0;
			if (!voxelAt(newVoxel2)) eyePos[2] = newPos2;
		}
		if (moveState.s) {
			var newPos2 = eyePos[2] - Math.cos(viewRotation[1] * Math.PI / 180.0) * speed;
			var newPos0 = eyePos[0] - Math.sin(viewRotation[1] * Math.PI / 180.0) * speed;
			var newVoxel0 = [Math.round(newPos0), Math.round(eyePos[1]), Math.round(eyePos[2])];
			var newVoxel2 = [Math.round(eyePos[0]), Math.round(eyePos[1]), Math.round(newPos2)];
			if (!voxelAt(newVoxel0)) eyePos[0] = newPos0;
			if (!voxelAt(newVoxel2)) eyePos[2] = newPos2;
		}
		if (moveState.a) {
			var newPos2 = eyePos[2] + Math.cos((viewRotation[1] - 90.0) * Math.PI / 180.0) * speed;
			var newPos0 = eyePos[0] + Math.sin((viewRotation[1] - 90.0) * Math.PI / 180.0) * speed;
			var newVoxel0 = [Math.round(newPos0), Math.round(eyePos[1]), Math.round(eyePos[2])];
			var newVoxel2 = [Math.round(eyePos[0]), Math.round(eyePos[1]), Math.round(newPos2)];
			if (!voxelAt(newVoxel0)) eyePos[0] = newPos0;
			if (!voxelAt(newVoxel2)) eyePos[2] = newPos2;
		}
		if (moveState.d) {
			var newPos2 = eyePos[2] - Math.cos((viewRotation[1] - 90.0) * Math.PI / 180.0) * speed;
			var newPos0 = eyePos[0] - Math.sin((viewRotation[1] - 90.0) * Math.PI / 180.0) * speed;
			var newVoxel0 = [Math.round(newPos0), Math.round(eyePos[1]), Math.round(eyePos[2])];
			var newVoxel2 = [Math.round(eyePos[0]), Math.round(eyePos[1]), Math.round(newPos2)];
			if (!voxelAt(newVoxel0)) eyePos[0] = newPos0;
			if (!voxelAt(newVoxel2)) eyePos[2] = newPos2;
		}
		if (moveState.space) {
			eyePos[1] += 0.6;
		}
		
		// gravity
		eyePos[1] -= .3;
		
		// handling collision with blocks below player
		if (voxelAt([Math.round(eyePos[0]), Math.floor(eyePos[1] - 1), Math.round(eyePos[2])])){
			if (voxelAt([Math.round(eyePos[0]), Math.floor(eyePos[1] - 0.1), Math.round(eyePos[2])])) eyePos[1] = Math.round(eyePos[1] + 1);
			else eyePos[1] = Math.round(eyePos[1]);
		}
		
		updateEyePos();
	}

	// Event listeners for key down/up
	window.addEventListener('keydown', (event) => {
		if (event.key === 'w' || event.key === 'W') moveState.w = true; // 'W' for when shift is pressed, 'w' for when it isn't
		if (event.key === 'a' || event.key === 'A') moveState.a = true;
		if (event.key === 's' || event.key === 'S') moveState.s = true;
		if (event.key === 'd' || event.key === 'D') moveState.d = true;
		if (event.key === ' ') moveState.space = true;
		if (event.key === 'Shift') moveState.shift = true;
	});

	window.addEventListener('keyup', (event) => {
		if (event.key === 'w' || event.key === 'W') moveState.w = false;
		if (event.key === 'a' || event.key === 'A') moveState.a = false;
		if (event.key === 's' || event.key === 'S') moveState.s = false;
		if (event.key === 'd' || event.key === 'D') moveState.d = false;
		if (event.key === ' ') moveState.space = false;
		if (event.key === 'Shift') moveState.shift = false;
	});
	
	
	
	canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
	document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

	// Request pointer lock when the user clicks the canvas
	canvas.addEventListener('click', function() {
		canvas.requestPointerLock();
	}, false);

	// Listen for pointer lock changes
	document.addEventListener('pointerlockchange', lockChangeAlert, false);
	document.addEventListener('mozpointerlockchange', lockChangeAlert, false);

	function lockChangeAlert() {
		if (document.pointerLockElement === canvas || document.mozPointerLockElement === canvas) {
			console.log('Pointer locked.');
			document.addEventListener("mousemove", updateView, false);
		} else {
			console.log('Pointer unlocked.');
			document.removeEventListener("mousemove", updateView, false);
		}
	}


	const sensitivity = 0.2; // Adjust to make movement faster or slower
	function updateView(e) {
		const movementX = e.movementX || e.mozMovementX || 0;
		const movementY = e.movementY || e.mozMovementY || 0;

		viewRotation[1] += movementX * sensitivity;
		viewRotation[0] += movementY * sensitivity;

		// Limit pitch to avoid flipping upside-down
		if (viewRotation[0] > 90.0) viewRotation[0] = 90.0;
		if (viewRotation[0] < -90.0) viewRotation[0] = -90.0;

		updateViewRotation();
		
	}
	

	function render() {
		
		updateEyePosition();
		
	    gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);

	    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	    gl.clearColor(0, 0, 0, 1);
	    gl.clear(gl.COLOR_BUFFER_BIT);

	    gl.drawArrays(gl.TRIANGLES, 0, 6);

	    requestAnimationFrame(render);
	}

	function resizeCanvas() {
	    canvas.width = window.innerWidth;
	    canvas.height = window.innerHeight;
	}

	window.addEventListener("resize", resizeCanvas);
	resizeCanvas();
	render();
}

main();