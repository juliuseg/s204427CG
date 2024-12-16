var gl;
var thetaLoc;
var theta;
var numSegments;

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

    // Define the number of segments for the circle (the more, the smoother)
    numSegments = 100;
    var radius = 0.5;

    // Array to store the vertices
    var vertices = [];

    // Add the center point (0, 0) as the first vertex
    vertices.push(0.0, 0.0); // Center of the circle

    // Add points around the circumference
    for (let i = 0; i <= numSegments; i++) {
        let angle = (i * 2 * Math.PI) / numSegments; // Angle for the current segment
        let x = radius * Math.cos(angle);
        let y = radius * Math.sin(angle);
        vertices.push(x, y);
    }
    // Convert the array to a Float32Array
    var verticesArray = new Float32Array(vertices);

    // Create a buffer to store vertex data
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, verticesArray, gl.STATIC_DRAW);

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
    theta += 0.02;
    if (theta >1){
        theta = 0.0;
    }
    gl.uniform1f(thetaLoc, theta);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, numSegments + 2);
    requestAnimationFrame(render);
}

