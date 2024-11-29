var gl;
var mvpMatrixLoc, texture, lightDirLoc, timeLoc;
var canvas;

var index = 0;
var numSubdivs = 5;
var time = 0.0;
var animSpeed = 0.5;
let lastTimestamp = null;

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
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);

    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    mvpMatrixLoc = gl.getUniformLocation(program, "mvpMatrix");
    lightDirLoc = gl.getUniformLocation(program, "lightDir");
    timeLoc = gl.getUniformLocation(program, "time");  // Uniform for time

    // Load Earth texture
    initTexture();

    // Add buttons to control subdivisions
    document.getElementById("AddSubdivision").onclick = function() {
        numSubdivs++;
        initSphere(gl);
    };
    document.getElementById("RemoveSubdivision").onclick = function() {
        if (numSubdivs > 0) {
            numSubdivs--;
            initSphere(gl);
        }
    };

    initSphere(gl);
    window.requestAnimFrame(render);
};

function initTexture() {
    texture = gl.createTexture();
    var image = new Image();
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.generateMipmap(gl.TEXTURE_2D);
    };
    image.src = "earth.jpg"; // Load Earth texture from file
}

function render(currentTimestamp) {
    if (!lastTimestamp) lastTimestamp = currentTimestamp;
    let deltaTime = (currentTimestamp - lastTimestamp) / 1000;
    lastTimestamp = currentTimestamp;
    time += deltaTime * animSpeed;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Perspective and view matrices
    var projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 20.0);
    var viewMatrix = lookAt(vec3(0.0, 0.0, 4.0), vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
    var modelMatrix = mat4();  // Model matrix remains static

    // Model-view-projection matrix
    var mvpMatrix = mult(projectionMatrix, viewMatrix);
    gl.uniformMatrix4fv(mvpMatrixLoc, false, flatten(mvpMatrix));

    // Set light direction for fragment shader
    gl.uniform3fv(lightDirLoc, flatten(vec3(0.0, 0.0, 1.0)));

    // Pass time to the fragment shader for texture rotation
    gl.uniform1f(timeLoc, time);

    gl.drawArrays(gl.TRIANGLES, 0, index);
    window.requestAnimFrame(render);
}

function initSphere(gl) {
    var va = vec4(0.0, 0.0, 1.0, 1);
    var vb = vec4(0.0, 0.942809, -0.333333, 1);
    var vc = vec4(-0.816497, -0.471405, -0.333333, 1);
    var vd = vec4(0.816497, -0.471405, -0.333333, 1);

    pointsArray = [];
    normalsArray = [];
    index = 0;

    tetrahedron(va, vb, vc, vd, numSubdivs);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    var vPosition = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    var vNormal = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);
}

function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
}

function divideTriangle(a, b, c, count) {
    if (count > 0) {
        var ab = normalize(mix(a, b, 0.5), true);
        var ac = normalize(mix(a, c, 0.5), true);
        var bc = normalize(mix(b, c, 0.5), true);
        divideTriangle(a, ab, ac, count - 1);
        divideTriangle(ab, b, bc, count - 1);
        divideTriangle(bc, c, ac, count - 1);
        divideTriangle(ab, bc, ac, count - 1);
    } else {
        triangle(a, b, c);
    }
}

function triangle(a, b, c) {
    normalsArray.push(vec3(a[0], a[1], a[2]));
    normalsArray.push(vec3(b[0], b[1], b[2]));
    normalsArray.push(vec3(c[0], c[1], c[2]));

    pointsArray.push(a);
    pointsArray.push(b);
    pointsArray.push(c);

    index += 3;
}