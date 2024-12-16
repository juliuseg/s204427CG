var gl;
var indexPoint = 0;

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

    // Create buffer
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    var maxPoints = 1000; // Max number of points you want to support
    gl.bufferData(gl.ARRAY_BUFFER, maxPoints * 2 * 4, gl.DYNAMIC_DRAW); // Allocate memory (2 floats per point, 4 bytes per float)

    // Associate the shader variable vPosition with the vertex data
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    canvas.addEventListener("click", function () {

        var rect = event.target.getBoundingClientRect();
    
        // Correct the mouse coordinates
        var correctedX = event.clientX - rect.left;
        var correctedY = event.clientY - rect.top;

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        var t = vec2(
            -1 + 2 * correctedX / canvas.width,
            -1 + 2 * (canvas.height - correctedY) / canvas.height);
        // Convert vec2 to a Float32Array
        var tArray = new Float32Array(t);

        // Update buffer data
        gl.bufferSubData(gl.ARRAY_BUFFER, sizeof['vec2'] * indexPoint, tArray);
        
        indexPoint++;

    });

    // Clear canvas:
    var clearButton = document.getElementById("ClearButton");
    var colorMenu = document.getElementById("ColorMenu");
    clearButton.addEventListener("click", function () {
        switch (colorMenu.selectedIndex) {
            case 0:
                gl.clearColor(1, 0, 0, 1.0);
                break;
            case 1:
                gl.clearColor(0.0, 1.0, 0.0, 1.0);
                break;
            case 2:
                gl.clearColor(0.0, 0.0, 1.0, 1.0);
                break;
        }

        gl.clear(gl.COLOR_BUFFER_BIT);
        indexPoint = 0;
    });

    render();

}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, indexPoint);
    window.requestAnimFrame(render);
}

