"use strict";

var gl;
var texSize = 0; // set to "canvas.height" in init()

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

//
//  initShaders function not created by me, came with initShaders.js we were given in class
//

function initShaders( gl, vertexShaderId, fragmentShaderId )
{
    var vertShdr;
    var fragShdr;

    var vertElem = document.getElementById( vertexShaderId );
    if ( !vertElem ) {
        alert( "Unable to load vertex shader " + vertexShaderId );
        return -1;
    }
    else {
        vertShdr = gl.createShader( gl.VERTEX_SHADER );
        gl.shaderSource( vertShdr, vertElem.textContent.replace(/^\s+|\s+$/g, '' ));
        gl.compileShader( vertShdr );
        if ( !gl.getShaderParameter(vertShdr, gl.COMPILE_STATUS) ) {
            var msg = "Vertex shader '"
                + vertexShaderId
                + "' failed to compile.  The error log is:\n\n"
        	    + gl.getShaderInfoLog( vertShdr );
            alert( msg );
            return -1;
        }
    }

    var fragElem = document.getElementById( fragmentShaderId );
    if ( !fragElem ) {
        alert( "Unable to load vertex shader " + fragmentShaderId );
        return -1;
    }
    else {
        fragShdr = gl.createShader( gl.FRAGMENT_SHADER );
        gl.shaderSource( fragShdr, fragElem.textContent.replace(/^\s+|\s+$/g, '' ) );
        gl.compileShader( fragShdr );
        if ( !gl.getShaderParameter(fragShdr, gl.COMPILE_STATUS) ) {
            var msg = "Fragment shader '"
                + fragmentShaderId
                + "' failed to compile.  The error log is:\n\n"
        	    + gl.getShaderInfoLog( fragShdr );
            alert( msg );
            return -1;
        }
    }

    var program = gl.createProgram();
    gl.attachShader( program, vertShdr );
    gl.attachShader( program, fragShdr );
    gl.linkProgram( program );

    if ( !gl.getProgramParameter(program, gl.LINK_STATUS) ) {
        var msg = "Shader program failed to link.  The error log is:\n\n"
            + gl.getProgramInfoLog( program );
        alert( msg );
        return -1;
    }

    return program;
}


init();
async function init() {
    var canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    texSize = canvas.height;

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Set up full-screen quad vertices
    var quadVertices = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]);
    var texCoordsArray = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);

    var quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    var positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoordsArray, gl.STATIC_DRAW);

    var texCoordLoc = gl.getAttribLocation(program, "aTexCoord");
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texCoordLoc);
	
	// Example to set uPixelSize in your JavaScript
	var uPixelSizeLocation = gl.getUniformLocation(program, "uPixelSize");
	gl.uniform2f(uPixelSizeLocation, 1.0 / texSize, 1.0 / texSize); // Assuming texSize is the texture width/height


    // Initialize textures
    let initialState = new Uint8Array(texSize * texSize * 4); // RGBA
    for (let i = 0; i < initialState.length; i += 4) {
        let randState = Math.random() > 0.5 ? 255 : 0;
        initialState[i] = randState;    // R
        initialState[i + 1] = randState; // G
        initialState[i + 2] = randState; // B
        initialState[i + 3] = 255;   // A
    }

    let temp = new Uint8Array(texSize * texSize * 4);
    for (let i = 0; i < temp.length; i += 4) {
        temp[i] = 128;    // R
        temp[i + 1] = 128; // G
        temp[i + 2] = 128; // B
        temp[i + 3] = 255; // A
    }

    var texture0 = createTexture(initialState, gl.TEXTURE0);
    var texture1 = createTexture(temp, gl.TEXTURE1);

    var uTextureLocation0 = gl.getUniformLocation(program, "uTextureMap0");

    gl.uniform1i(uTextureLocation0, 0); // Bind first texture to TEXTURE0

    var framebuffer = gl.createFramebuffer();
	
	
	async function renderLoop() {
		// Bind the framebuffer and set up the rendering
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture1, 0);

		/* Commented out because upon debugging it seems this takes a lot of time apparently
		
		// Check if the framebuffer is complete
		if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
			console.error("Framebuffer is incomplete.");
			return;
		}
		*/
		
		// Render to the framebuffer
		render(texture0);
		
		// Unbind the framebuffer to render to the default framebuffer (the screen)
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		
		// Wait for a short duration if needed
		//await sleep(100); // Adjust this if you want a specific timing

		// Render the second texture to the screen
		render(texture1);
		
		// Swap the textures
		[texture0, texture1] = [texture1, texture0];

		// Request the next frame
		requestAnimationFrame(renderLoop);
	}

// Start the animation loop
renderLoop();
	
}

function createTexture(data, whichTexture) {
    var texture = gl.createTexture();
    gl.activeTexture(whichTexture);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return texture;
}

function render(texture) {
    // Bind the texture to TEXTURE0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Render the scene
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}
