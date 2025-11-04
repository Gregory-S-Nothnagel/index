"use strict";

var gl;
var positions = [];
var colors = [];
var scale = 1;

const G = 0.00001;
function gForce(p1, p2) {
	
	var distance = Math.pow(p1.traits[0] - p2.traits[0], 2) + Math.pow(p1.traits[2] - p2.traits[2], 2);
	distance = Math.sqrt(distance);
	
	var deltaV = G / Math.pow(distance, 2); // magnitude
	
	var xDeltaV = (p2.traits[0] - p1.traits[0]) * Math.min(deltaV / distance, .001);
	var yDeltaV = (p2.traits[2] - p1.traits[2]) * Math.min(deltaV / distance, .001);
	
	
	
	p1.traits[1] += xDeltaV;
	p2.traits[1] -= xDeltaV;
	
	p1.traits[3] += yDeltaV;
	p2.traits[3] -= yDeltaV;
	
}

class Particle {
    constructor(traits) {
        this.traits = traits; // traits is an array: [position_x, -velocity_x, position_y, -velocity_y]
    }

    individualChanges() {
		
        this.traits[0] += this.traits[1];

        this.traits[2] += this.traits[3];

    }
}


let system = [];

colors = []

function init() {
	
	for (let i = 0; i < 3; i++){
		system.push(new Particle([(Math.random() - .5) * scale, 0, (Math.random() - .5) * scale, 0]));
		colors.push(vec4(.1 + (Math.random() * .9), .1 + (Math.random() * .9), .1 + (Math.random() * .9), 1));
	}
	
    var canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    //
    //  Configure WebGL
    //
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    //  Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Load the data into the GPU for positions
    var positionBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferId);
    var positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);
    
    // Load the data into the GPU for colors
    var colorBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferId);
    var colorLoc = gl.getAttribLocation(program, "aColor");
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLoc);

	// Add event listener for resizing the window
    window.addEventListener('resize', resizeCanvas);

    // Start the animation loop
    update(positionBufferId, colorBufferId);
}

function resizeCanvas() {
    var canvas = document.getElementById("gl-canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Adjust the viewport to match the new canvas dimensions
    gl.viewport(0, 0, canvas.width, canvas.height);
}

function update(positionBufferId, colorBufferId) {
    // Run the simulation and render a frame
	for(let innerRep = 0; innerRep < 1; innerRep++){
		
		for (let i = 0; i < system.length; i++) {
			for (let j = 0; j < i; j++) {
				gForce(system[i], system[j]);
			}
		}
		
		for (let i = 0; i < system.length; i++) system[i].individualChanges();
		
	}

    // Prepare positions for rendering
    positions = [];
    for (let i = 0; i < system.length; i++) {
        positions.push(vec2(system[i].traits[0], system[i].traits[2]));
    }

    // Update the buffer with the new positions
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);
	
	// Update the buffer with the colors (no change in colors here, but this is where you could update them if needed)
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
	

    // Render the frame
    render();

    //console.log(systemEnergy(system));

    requestAnimationFrame(() => update(positionBufferId, colorBufferId));  // Request the next animation frame
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, positions.length);
}

init();
