var gl;
var mvpMatrixLoc;
var canvas;


var index = 0;

numSubdivs = 3;

time = 0.0;

let lastTimestamp = null;
let animSpeed = 2.0;

var modelMatrixLoc;
var VLoc;

var lightDirLoc, LdLoc, LaLoc, LsLoc;
var kdLoc, kaLoc, ksLoc, sLoc;

var lightDir = vec3(0.0, 0.0, -1.0); // Default light direction
var Ld = vec3(0.9,0.9,0.9);        // Default diffuse light intensity
var La = vec3(0.15,0.15,0.15);        // Default ambient light intensity
var Ls = vec3(0.9,0.9,0.9);        // Default specular light intensity

var kd = vec3(1.0, 0.5, 0.31);       // Default diffuse reflection coefficient
var ka = vec3(1.0, 0.5, 0.31);       // Default ambient reflection coefficient
var ks = vec3(1.0, 1.0, 1.0);        // Default specular reflection coefficient
var s = 32.0;                        // Default shininess

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

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.vBuffer = vBuffer; // Store buffer globally for later updates
    gl.enableVertexAttribArray(gl.getAttribLocation(program, "vPosition"));

    mvpMatrixLoc = gl.getUniformLocation(program, "mvpMatrix");
    VLoc = gl.getUniformLocation(program, "V");

    lightDirLoc = gl.getUniformLocation(program, "lightDir");
    LdLoc = gl.getUniformLocation(program, "Ld");
    LaLoc = gl.getUniformLocation(program, "La");
    LsLoc = gl.getUniformLocation(program, "Ls");

    kdLoc = gl.getUniformLocation(program, "kd");
    kaLoc = gl.getUniformLocation(program, "ka");
    ksLoc = gl.getUniformLocation(program, "ks");
    sLoc = gl.getUniformLocation(program, "s");

    // Add or remove subdivisions with buttons
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

    // Adjust animation speed
    document.getElementById("spdSlider").oninput = function(event) {
        animSpeed = parseFloat(event.target.value);
    };

    // Adjust sliders for material and light parameters
    document.getElementById("kdSlider").oninput = function(event) {
        kd = vec3(event.target.value, 0.5, 0.31); 
        ka = vec3(event.target.value, 0.5, 0.31); 
    };  
    
    document.getElementById("ksSlider").oninput = function(event) {
        ks = vec3(event.target.value, event.target.value, event.target.value); // Adjust all components equally
    };
    
    
    document.getElementById("shininessSlider").oninput = function(event) {
        s = parseFloat(event.target.value);
    };
    
    document.getElementById("leSlider").oninput = function(event) {
        Ld = vec3(event.target.value, event.target.value, event.target.value); // Adjust all components equally
        Ls = vec3(event.target.value, event.target.value, event.target.value); // Keep Ls same as Ld
    };
    
    document.getElementById("laSlider").oninput = function(event) {
        La = vec3(event.target.value, event.target.value, event.target.value); // Adjust all components equally
    };



    initSphere(gl);

    window.requestAnimFrame(render);
};

function render(currentTimestamp) {
    // Initialize lastTimestamp on the first frame
    if (!lastTimestamp) lastTimestamp = currentTimestamp;

    // Calculate time difference between frames
    let deltaTime = (currentTimestamp - lastTimestamp) / 1000; // Convert from milliseconds to seconds
    lastTimestamp = currentTimestamp; // Update lastTimestamp to the current time

    // Update the time based on elapsed time
    time += deltaTime*animSpeed;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create perspective and view matrices
    var projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 20.0);
    
    var radius = 10.0;
    var eye = vec3(radius * Math.cos(time), 2.0, radius * Math.sin(time));
    var viewMatrix = lookAt(eye, vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 0.0));

    // No model matrix translation needed for sphere
    var modelMatrix = mat4();

    // Compute MVP matrix
    var mvpMatrix = mult(projectionMatrix, mult(viewMatrix, modelMatrix));
    gl.uniformMatrix4fv(mvpMatrixLoc, false, flatten(mvpMatrix));

    // Set the camera position as the V uniform
    gl.uniform3fv(VLoc, flatten(eye));

    // Send light and material parameters to the GPU
    gl.uniform3fv(lightDirLoc, flatten(lightDir));
    gl.uniform3fv(LdLoc, flatten(Ld));
    gl.uniform3fv(LaLoc, flatten(La));
    gl.uniform3fv(LsLoc, flatten(Ls));

    gl.uniform3fv(kdLoc, flatten(kd));
    gl.uniform3fv(kaLoc, flatten(ka));
    gl.uniform3fv(ksLoc, flatten(ks));
    gl.uniform1f(sLoc, s);

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
    normalsArray = [];
    index = 0;

    // Subdivide the tetrahedron into triangles to form a sphere
    tetrahedron(va, vb, vc, vd, numSubdivs);

    // Send the vertices to the GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    var vPosition = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Send the normals to the GPU
    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    var vNormal = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);
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

function triangle(a, b, c) {
    // For a unit sphere, the normals are the same as the positions
    normalsArray.push(vec3(a[0], a[1], a[2]));
    normalsArray.push(vec3(b[0], b[1], b[2]));
    normalsArray.push(vec3(c[0], c[1], c[2]));
    
    pointsArray.push(a);
    pointsArray.push(b);
    pointsArray.push(c);
    
    index += 3;
}