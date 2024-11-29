var gl;
var mvpMatrixLoc;
var canvas;

var modelMatrixLoc;



window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    // Initialize WebGL context
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        console.error("WebGL isn’t available");
        return;
    }

    // Set the viewport and clear the canvas
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.95,0.95,0.95, 1.0);  // Sky blue background

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


    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");

    mvpMatrixLoc = gl.getUniformLocation(program, "mvpMatrix");

    render();
};

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // First cube 1 point perspective
    var projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 10.0);
    var viewMatrix = lookAt(vec3(0.5, 0.5, 8.0), vec3(0.5, 0.5, 0.5), vec3(0.0, 1.0, 0.0));
    var modelMatrix = translate(0.0, 0.0, 0.0);  

    var mvpMatrix = mult(projectionMatrix, mult(viewMatrix, modelMatrix));

    gl.uniformMatrix4fv(mvpMatrixLoc, false, flatten(mvpMatrix));
    gl.drawElements(gl.LINES, 48, gl.UNSIGNED_SHORT, 0);

    // Second cube 2 point perspective
    var projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 10.0);
    var viewMatrix = lookAt(vec3(9, 0.5, 6), vec3(0.5, 0.5, 0.5), vec3(0.0, 1.0, 0.0));
    var modelMatrix = translate(3, 0.0, 0.0);  

    var mvpMatrix = mult(projectionMatrix, mult(viewMatrix, modelMatrix));

    gl.uniformMatrix4fv(mvpMatrixLoc, false, flatten(mvpMatrix));
    gl.drawElements(gl.LINES, 48, gl.UNSIGNED_SHORT, 0);

    // Third cube 3 point perspective
    var projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 10.0);
    var viewMatrix = lookAt(vec3(9, 7, 6), vec3(0.5, 0.5, 0.5), vec3(0.0, 1.0, 0.0));
    var modelMatrix = translate(2.0, 2.0, 3.1);  

    var mvpMatrix = mult(projectionMatrix, mult(viewMatrix, modelMatrix));

    gl.uniformMatrix4fv(mvpMatrixLoc, false, flatten(mvpMatrix));
    gl.drawElements(gl.LINES, 48, gl.UNSIGNED_SHORT, 0);


}