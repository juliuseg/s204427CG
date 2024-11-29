var gl;
var thetaLoc;
var theta;

window.onload = function init() {
    // Get the canvas element
    var canvas = document.getElementById("gl-canvas");

    // Initialize WebGL context
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn’t available");
    }

    // Set the viewport and clear the canvas
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);

    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Define the vertex positions for three dots
    var vertices = new Float32Array([
        0.5, -0.5,
        -0.5, -0.5,
        0.5, 0.5,
        -0.5, 0.5
    ]);

    // Create a buffer to store vertex data
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Associate the shader variable vPosition with the vertex data
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Clear the canvas and draw the points
    gl.clear(gl.COLOR_BUFFER_BIT);

    theta = 0.0;
    thetaLoc = gl.getUniformLocation(program, "theta");
    render();

}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    theta += 0.04;
    gl.uniform1f(thetaLoc, theta);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
}

