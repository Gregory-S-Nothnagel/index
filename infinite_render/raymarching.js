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
	
	var viewRotation = new Float32Array([0.0, 0.0]);
	const viewRotationLocation = gl.getUniformLocation(program, "viewRotation");
	updateViewRotation();
	
	function updateViewRotation() {
		gl.uniform2f(viewRotationLocation, viewRotation[0], viewRotation[1]);
	}
	
	var eyePos = new Float32Array([0.0, 2.0, 0.0]); // initial player eye position
	const eyeUniformLocation = gl.getUniformLocation(program, "eyePos");
	updateEyePos();
	
	function updateEyePos() {
		gl.uniform3f(eyeUniformLocation, eyePos[0], eyePos[1], eyePos[2]);
	}

	// Movement tracking
	let moveState = { w: false, a: false, s: false, d: false, space: false, shift: false};
	const speed = 2; // Adjust speed for smoother movement

	function updateEyePosition() {
		
		// Update the eye position based on pressed keys
		if (moveState.w) {
			eyePos[2] += Math.cos(viewRotation[1]) * (speed + moveState.shift * speed);
			eyePos[0] += Math.sin(viewRotation[1]) * (speed + moveState.shift * speed);
		}
		if (moveState.s) {
			eyePos[2] -= Math.cos(viewRotation[1]) * speed;
			eyePos[0] -= Math.sin(viewRotation[1]) * speed;
		}
		
		if (moveState.a) {
			eyePos[2] += Math.cos(viewRotation[1] - Math.PI / 2) * speed;
			eyePos[0] += Math.sin(viewRotation[1] - Math.PI / 2) * speed;
		}
		if (moveState.d) {
			eyePos[2] -= Math.cos(viewRotation[1] - Math.PI / 2) * speed;
			eyePos[0] -= Math.sin(viewRotation[1] - Math.PI / 2) * speed;
		}
		
		if (moveState.space) {
			eyePos[1] += 0.6;
		}
		
		// gravity
		//eyePos[1] -= .03;
		
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


	const sensitivity = 0.002; // Adjust to make movement faster or slower
	function updateView(e) {
		const movementX = e.movementX || e.mozMovementX || 0;
		const movementY = e.movementY || e.mozMovementY || 0;

		viewRotation[1] += movementX * sensitivity;
		viewRotation[0] += movementY * sensitivity;

		// Limit pitch to avoid flipping upside-down
		if (viewRotation[0] > Math.PI / 2) viewRotation[0] = Math.PI / 2;
		if (viewRotation[0] < -Math.PI / 2) viewRotation[0] = -Math.PI / 2;

		updateViewRotation();
		
	}


	//var maxBlockSize = gl.getParameter(gl.MAX_UNIFORM_BLOCK_SIZE);
	//console.log(maxBlockSize); // Maximum block size in bytes

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