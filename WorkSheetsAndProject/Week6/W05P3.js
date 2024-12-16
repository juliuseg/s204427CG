var gl;
var mvpMatrixLoc;
var canvas;
var drawingInfo = null;

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

    // Enable the OES_element_index_uint extension
    var ext = gl.getExtension('OES_element_index_uint');
    if (!ext) {
        console.log('Warning: Unable to use OES_element_index_uint. High-poly models may not render correctly.');
    }

    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    mvpMatrixLoc = gl.getUniformLocation(program, "mvpMatrix");

    loadOBJFile("suzanne.obj", 1, true);

    render();
};

async function loadOBJFile(fileName, scale, reverse) {
    drawingInfo = await readOBJFile(fileName, scale, reverse);
    if (drawingInfo) {
        initBuffers(drawingInfo);
    }
}

function initBuffers(drawingInfo) {
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (drawingInfo) {
        var projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 10.0);
        var viewMatrix = lookAt(vec3(5, 5, 5), vec3(0.5, 0.5, 0.5), vec3(0.0, 1.0, 0.0));
        var modelMatrix = mat4();

        var mvpMatrix = mult(projectionMatrix, mult(viewMatrix, modelMatrix));
        gl.uniformMatrix4fv(mvpMatrixLoc, false, flatten(mvpMatrix));

        gl.drawElements(gl.TRIANGLES, drawingInfo.indices.length, gl.UNSIGNED_INT, 0);
    }

    window.requestAnimFrame(render);
}