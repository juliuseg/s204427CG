var gl;
var mvpMatrixLoc;
var canvas;

var modelMatrixLoc;

var index = 0;

numSubdivs = 3;

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

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.vBuffer = vBuffer; // Store buffer globally for later updates
    gl.enableVertexAttribArray(gl.getAttribLocation(program, "vPosition"));

    mvpMatrixLoc = gl.getUniformLocation(program, "mvpMatrix");

    // Add or remove subdivisions with buttons
    document.getElementById("AddSubdivision").onclick = function() {
        numSubdivs++;
        render();
        initSphere(gl);

    };

    document.getElementById("RemoveSubdivision").onclick = function() {
        if (numSubdivs > 0){
            numSubdivs--;
            initSphere(gl);
            render();
        }
    };
    initSphere(gl);

    render();
};

function render() {

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create perspective and view matrices
    var projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 10.0);
    var viewMatrix = lookAt(vec3(5, 5, 5), vec3(0.5, 0.5, 0.5), vec3(0.0, 1.0, 0.0));

    // No model matrix translation needed for sphere
    var modelMatrix = mat4();

    // Compute MVP matrix
    var mvpMatrix = mult(projectionMatrix, mult(viewMatrix, modelMatrix));
    gl.uniformMatrix4fv(mvpMatrixLoc, false, flatten(mvpMatrix));

    // Draw the sphere (using the number of vertices in pointsArray)
    gl.drawArrays(gl.TRIANGLES, 0, index);

    window.requestAnimFrame(render);
}

function initSphere(gl) {

    // Define the vertices for a tetrahedron
    var va = vec4(0.0, 0.0, 1.0, 1);
    var vb = vec4(0.0, 0.942809, -0.333333, 1);
    var vc = vec4(-0.816497, -0.471405, -0.333333, 1);
    var vd = vec4(0.816497, -0.471405, -0.333333, 1);

    pointsArray = [];
    index = 0;

    // Subdivide the tetrahedron into triangles to form a sphere
    tetrahedron(va, vb, vc, vd, numSubdivs);

    // Send the generated vertices to the GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    // Link the buffer to the shader's vPosition attribute
    var vPosition = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
}


function tetrahedron(a, b, c, d, n)
{
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
}

function divideTriangle(a, b, c, count)
{
    if (count > 0) {
        var ab = normalize(mix(a, b, 0.5), true);
        var ac = normalize(mix(a, c, 0.5), true);
        var bc = normalize(mix(b, c, 0.5), true);
        divideTriangle(a, ab, ac, count - 1);
        divideTriangle(ab, b, bc, count - 1);
        divideTriangle(bc, c, ac, count - 1);
        divideTriangle(ab, bc, ac, count - 1);
    }
    else {
        triangle(a, b, c);
    }
}

function triangle(a, b, c){
    pointsArray.push(a);
    pointsArray.push(b);
    pointsArray.push(c);
    index += 3;
}