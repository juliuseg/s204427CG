var gl;
var mvpMatrixLoc, texture;
var canvas;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    // Initialize WebGL context
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        console.error("WebGL isn’t available");
        return;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var vertices = [
        vec4(-4, -1, -1, 1.0), vec4(4, -1, -1, 1.0),
        vec4(4, -1, -21, 1.0), vec4(-4, -1, -21, 1.0)
    ];

    var texCoords = [
        vec2(-1.5, 0.0), vec2(2.5, 0.0),
        vec2(2.5, 10.0), vec2(-1.5, 10.0)
    ];

    // Create and bind buffer for vertices
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Create and bind buffer for texture coordinates
    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);

    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    mvpMatrixLoc = gl.getUniformLocation(program, "mvpMatrix");

    document.getElementById("wrappingMode").addEventListener("change", function() {
        updateWrappingMode(event.target.value);
    });

    document.getElementById("filteringMode").addEventListener("change", function() {
        updateFilteringMode(event.target.value);
    });

    // Initialize texture
    initTexture();

    render();
};

function initTexture() {
    var texSize = 64;         // Texture size (64x64)
    var numRows = 8;          // Number of rows in checkerboard pattern
    var numCols = 8;          // Number of columns in checkerboard pattern
    var myTexels = new Uint8Array(texSize * texSize * 4); // RGBA array for texture data

    // Generate checkerboard pattern using the provided code snippet
    for (var i = 0; i < texSize; ++i) {
        for (var j = 0; j < texSize; ++j) {
            var patchx = Math.floor(i / (texSize / numRows));
            var patchy = Math.floor(j / (texSize / numCols));
            var c = (patchx % 2 !== patchy % 2) ? 255 : 0;
            var idx = 4 * (i * texSize + j);
            myTexels[idx] = myTexels[idx + 1] = myTexels[idx + 2] = c;
            myTexels[idx + 3] = 255; // Alpha channel
        }
    }

    // Create texture and bind it
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, myTexels);

    // Set default texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    // Set uniform for sampler
    gl.uniform1i(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "texture"), 0);
}

// Update wrapping mode based on user selection
function updateWrappingMode(wrapMode) {
    gl.bindTexture(gl.TEXTURE_2D, texture);

    var glWrapMode = wrapMode === "REPEAT" ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, glWrapMode);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, glWrapMode);

    render();
}

// Update filtering mode based on user selection
function updateFilteringMode(filterMode) {
    gl.bindTexture(gl.TEXTURE_2D, texture);

    var glFilterMode;
    switch (filterMode) {
        case "NEAREST":
            glFilterMode = gl.NEAREST;
            break;
        case "LINEAR":
            glFilterMode = gl.LINEAR;
            break;
        case "NEAREST_MIPMAP_NEAREST":
            glFilterMode = gl.NEAREST_MIPMAP_NEAREST;
            break;
        case "LINEAR_MIPMAP_NEAREST":
            glFilterMode = gl.LINEAR_MIPMAP_NEAREST;
            break;
        case "NEAREST_MIPMAP_LINEAR":
            glFilterMode = gl.NEAREST_MIPMAP_LINEAR;
            break;
        case "LINEAR_MIPMAP_LINEAR":
            glFilterMode = gl.LINEAR_MIPMAP_LINEAR;
            break;
    }

    // Set both min and mag filters (for magnification, mipmap options are not relevant)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, glFilterMode);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filterMode === "NEAREST" ? gl.NEAREST : gl.LINEAR);

    if (filterMode.includes("MIPMAP")) {
        gl.generateMipmap(gl.TEXTURE_2D);
    }

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set up the perspective and view matrices
    var projectionMatrix = perspective(90, canvas.width / canvas.height, 0.1, 50.0);
    var viewMatrix = lookAt(vec3(0.0, 0.0, 0.0), vec3(0.0, -1.0, -10.0), vec3(0.0, 1.0, 0.0));
    var modelMatrix = mat4();

    // Compute MVP matrix
    var mvpMatrix = mult(projectionMatrix, mult(viewMatrix, modelMatrix));
    gl.uniformMatrix4fv(mvpMatrixLoc, false, flatten(mvpMatrix));

    // Draw the rectangle
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    window.requestAnimFrame(render);
}