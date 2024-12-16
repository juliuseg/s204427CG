
// In this code i needed to have a projection matrix aswell otherwise the cube would be outside the default orthographic view.


var gl;

window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");

    // Initialize WebGL context
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        console.error("WebGL isn’t available");
        return;
    }
    
    // Set the viewport and clear the canvas
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);  // Sky blue background

    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Define vertices for the cube (8 vertices)
    var vertices = [
        vec3(0.0, 0.0, 1.0),
        vec3(0.0, 1.0, 1.0),
        vec3(1.0, 1.0, 1.0),
        vec3(1.0, 0.0, 1.0),
        vec3(0.0, 0.0, 0.0),
        vec3(0.0, 1.0, 0.0),
        vec3(1.0, 1.0, 0.0),
        vec3(1.0, 0.0, 0.0)
    ];

    // Define wireframe indices
    var wire_indices = new Uint16Array([
        0, 1, 1, 2, 2, 3, 3, 0,  // front
        2, 3, 3, 7, 7, 6, 6, 2,  // right
        0, 3, 3, 7, 7, 4, 4, 0,  // down
        1, 2, 2, 6, 6, 5, 5, 1,  // up
        4, 5, 5, 6, 6, 7, 7, 4,  // back
        0, 1, 1, 5, 5, 4, 4, 0   // left
    ]);

    // Create a buffer for the vertices
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    // Link the vertex data to the shader's vPosition attribute
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Create an element array buffer for the wireframe indices
    var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, wire_indices, gl.STATIC_DRAW);

    // Set up the model-view matrix (camera view)
    var modelViewMatrix = lookAt(vec3(3.0, 3.0, 3.0), vec3(0.5, 0.5, 0.5), vec3(0.0, 1.0, 0.0));

    // Set up a larger orthographic projection matrix
    var projectionMatrix = ortho(-3.0, 3.0, -3.0, 3.0, -10.0, 10.0);

    // Combine the projection and model-view matrices
    var mvpMatrix = mult(projectionMatrix, modelViewMatrix);

    // Send the combined MVP matrix to the shader
    var mvpMatrixLoc = gl.getUniformLocation(program, "mvpMatrix");
    gl.uniformMatrix4fv(mvpMatrixLoc, false, flatten(mvpMatrix));

    render();
};

function render() {
    // Clear the canvas and depth buffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Draw the wireframe cube
    gl.drawElements(gl.LINES, 48, gl.UNSIGNED_SHORT, 0);

    requestAnimFrame(render);
}

