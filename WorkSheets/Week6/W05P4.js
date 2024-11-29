var gl;
var mvpMatrixLoc;
var canvas;

var time = 0.0;
var animSpeed = 2.0;
let lastTimestamp = null;

var VLoc;
var lightDirLoc, LdLoc, LaLoc, LsLoc;
var kdLoc, kaLoc, ksLoc, sLoc;

var lightDir = vec3(1.0, 1.0, 1.0); // Light direction
var Ld = vec3(0.9, 0.9, 0.9);        // Diffuse light intensity
var La = vec3(0.3, 0.3, 0.3);     // Ambient light intensity
var Ls = vec3(0.9, 0.9, 0.9);        // Specular light intensity

var kd = vec3(0.6, 0.1, 0.1);       // Diffuse reflection coefficient
var ka = vec3(0.6, 0.1, 0.1);       // Ambient reflection coefficient
var ks = vec3(0.5, 0.5, 0.5);        // Specular reflection coefficient
var s = 32.0;                        // Shininess

window.onload = async function init() {
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
    
    // Enable the OES_element_index_uint extension
    var ext = gl.getExtension('OES_element_index_uint');
    if (!ext) {
        console.log('Warning: Unable to use OES_element_index_uint. High-poly models may not render correctly.');
    }

    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Set up uniform locations
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

    // Set initial lighting and material properties
    gl.uniform3fv(lightDirLoc, flatten(lightDir));
    gl.uniform3fv(LdLoc, flatten(Ld));
    gl.uniform3fv(LaLoc, flatten(La));
    gl.uniform3fv(LsLoc, flatten(Ls));
    gl.uniform3fv(kdLoc, flatten(kd));
    gl.uniform3fv(kaLoc, flatten(ka));
    gl.uniform3fv(ksLoc, flatten(ks));
    gl.uniform1f(sLoc, s);

    // Load the OBJ file
    drawingInfo = await readOBJFile("stanford-bunny.obj", 15.0, true);
    //drawingInfo = await readOBJFile("suzanne.obj", 1.0, true);
    if (drawingInfo) {
        initBuffers(drawingInfo);
    }

    window.requestAnimFrame(render);
};

function calculateNormals(vertices, indices) {
    const normals = new Float32Array(vertices.length / 4 * 3);
    
    // Loop through each triangle defined by indices
    for (let i = 0; i < indices.length; i += 3) {
        const idx0 = indices[i];
        const idx1 = indices[i + 1];
        const idx2 = indices[i + 2];

        const v0 = vec3(vertices[idx0 * 4], vertices[idx0 * 4 + 1], vertices[idx0 * 4 + 2]);
        const v1 = vec3(vertices[idx1 * 4], vertices[idx1 * 4 + 1], vertices[idx1 * 4 + 2]);
        const v2 = vec3(vertices[idx2 * 4], vertices[idx2 * 4 + 1], vertices[idx2 * 4 + 2]);

        // Compute the normal for this triangle
        const edge1 = subtract(v1, v0);
        const edge2 = subtract(v2, v0);
        const normal = normalize(cross(edge1, edge2));

        // Accumulate the normal for each vertex
        for (const idx of [idx0, idx1, idx2]) {
            normals[idx * 3] += normal[0];
            normals[idx * 3 + 1] += normal[1];
            normals[idx * 3 + 2] += normal[2];
        }
    }

    // Normalize the accumulated normals
    for (let i = 0; i < normals.length; i += 3) {
        const normal = vec3(normals[i], normals[i + 1], normals[i + 2]);
        const normalized = normalize(normal);
        normals[i] = normalized[0];
        normals[i + 1] = normalized[1];
        normals[i + 2] = normalized[2];
    }

    return normals;
}

function initBuffers(drawingInfo) {
    // Position buffer
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Recalculate normals if they are misaligned
    const recalculatedNormals = calculateNormals(drawingInfo.vertices, drawingInfo.indices);

    // Normal buffer
    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, recalculatedNormals, gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    // Index buffer
    var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);
}

function render(currentTimestamp) {
    if (!lastTimestamp) lastTimestamp = currentTimestamp;

    let deltaTime = (currentTimestamp - lastTimestamp) / 1000; // Convert ms to s
    lastTimestamp = currentTimestamp;
    time += deltaTime * animSpeed;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (drawingInfo) {
        // Set up the projection and view matrices with an orbiting camera
        var projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 20.0);
        
        var radius = 10.0;
        var eye = vec3(radius * Math.cos(time), 4.0, radius * Math.sin(time));
        var viewMatrix = lookAt(eye, vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 0.0));

        // Model matrix (identity for now)
        var modelMatrix = mat4();

        // Compute MVP matrix
        var mvpMatrix = mult(projectionMatrix, mult(viewMatrix, modelMatrix));
        gl.uniformMatrix4fv(mvpMatrixLoc, false, flatten(mvpMatrix));

        // Set the camera position as the V uniform
        gl.uniform3fv(VLoc, flatten(eye));

        // Draw the model
        gl.drawElements(gl.TRIANGLES, drawingInfo.indices.length, gl.UNSIGNED_INT, 0);
    }

    window.requestAnimFrame(render);
}