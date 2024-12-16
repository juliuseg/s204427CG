var gl;
var canvas;
var teapotProgram, groundProgram;
var teapotBuffers = {};
var groundBuffers = {};
var teapotDrawingInfo = null;

var groundTexture;

jumpSpeed = 3.0;
jumping = true;



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

    // Load shaders and create programs
    teapotProgram = initShaders(gl, "vertex-shader-teapot", "fragment-shader-teapot");
    groundProgram = initShaders(gl, "vertex-shader-ground", "fragment-shader-ground");

    document.getElementById("toggleJumping").addEventListener("click", function () {
        jumping = !jumping; // Toggle the boolean
    });

    // Initialize the ground quad
    initQuadBuffers();

    // Load texture for the ground
    loadTexture("../textures/xamp23.png");

    // Load the teapot model
    loadTeapotModel("../models/teapot/teapot.obj", 0.25, true);

    render();
};


function render(currentTimestamp) {

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var projectionMatrix = perspective(90, canvas.width / canvas.height, 0.1, 50.0);
    var viewMatrix = lookAt(vec3(0, 0, 0), vec3(0.0, -1.0, -2.5), vec3(0.0, 1.0, 0.0));

    // Render the teapot
    if (teapotDrawingInfo) {
        gl.useProgram(teapotProgram);

        // Get uniform locations
        var mvpMatrixLoc = gl.getUniformLocation(teapotProgram, "mvpMatrix");
        var modelMatrixLoc = gl.getUniformLocation(teapotProgram, "modelMatrix");
        var lightDirectionLoc = gl.getUniformLocation(teapotProgram, "lightDirection");

        // Update the light direction
        var lightDirection = vec3(0.5, 1.0, 0.5); // Example light direction
        gl.uniform3fv(lightDirectionLoc, flatten(lightDirection));

        // Compute transformation matrices
        var h = -1;
        if (jumping) h = (-0.25 + 0.75 * Math.cos(currentTimestamp / 1000 * jumpSpeed));

        var modelMatrix = translate(0.0, h, -3);
        var mvpMatrix = mult(projectionMatrix, mult(viewMatrix, modelMatrix));

        // Send matrices to the shader
        gl.uniformMatrix4fv(mvpMatrixLoc, false, flatten(mvpMatrix));
        gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix));

        // Bind and enable vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, teapotBuffers.vertexBuffer);
        var vPosition = gl.getAttribLocation(teapotProgram, "vPosition");
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

        // Bind and enable normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, teapotBuffers.normalBuffer);
        var vNormal = gl.getAttribLocation(teapotProgram, "vNormal");
        gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vNormal);

        // Bind and draw element buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotBuffers.indexBuffer);
        gl.drawElements(gl.TRIANGLES, teapotDrawingInfo.indices.length, gl.UNSIGNED_INT, 0);
    }


    // Render the ground quad
    gl.useProgram(groundProgram);

    var mvpMatrixLoc = gl.getUniformLocation(groundProgram, "mvpMatrix");
    var textureLoc = gl.getUniformLocation(groundProgram, "texture");

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, groundTexture);
    gl.uniform1i(textureLoc, 0);

    var modelMatrix = mat4() // Place the ground below
    var mvpMatrix = mult(projectionMatrix, mult(viewMatrix, modelMatrix));
    gl.uniformMatrix4fv(mvpMatrixLoc, false, flatten(mvpMatrix));

    // Bind quad buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffers.vertexBuffer);
    var vPosition = gl.getAttribLocation(groundProgram, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffers.texCoordBuffer);
    var vTexCoord = gl.getAttribLocation(groundProgram, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundBuffers.indexBuffer);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    window.requestAnimFrame(render);
}

async function loadTeapotModel(fileName, scale, reverse) {
    teapotDrawingInfo = await readOBJFile(fileName, scale, reverse);
    if (teapotDrawingInfo) {
        initTeapotBuffers(teapotDrawingInfo);
    }
}

function initTeapotBuffers(drawingInfo) {
    // Recalculate normals in case they are misaligned
    const recalculatedNormals = calculateNormals(drawingInfo.vertices, drawingInfo.indices);

    // Create and set up the position buffer
    teapotBuffers.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotBuffers.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Create and set up the normal buffer
    teapotBuffers.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotBuffers.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, recalculatedNormals, gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    // Create and set up the index buffer
    teapotBuffers.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotBuffers.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);
}

function initQuadBuffers() {
    // Quad vertices and texture coordinates
    var vertices = new Float32Array([
        -2, -1, -1, 1.0, // Bottom-left
        2, -1, -1, 1.0, // Bottom-right
        2, -1, -5, 1.0, // Top-right
        -2, -1, -5, 1.0  // Top-left
    ]);

    var texCoords = new Float32Array([
        0.0, 0.0, // Bottom-left
        1.0, 0.0, // Bottom-right
        1.0, 1.0, // Top-right
        0.0, 1.0  // Top-left
    ]);

    var indices = new Uint16Array([
        0, 1, 2, 
        0, 2, 3
    ]);

    // Create buffers specific to the ground quad
    groundBuffers.vertexBuffer = gl.createBuffer();
    groundBuffers.texCoordBuffer = gl.createBuffer();
    groundBuffers.indexBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffers.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffers.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundBuffers.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
}

function loadTexture(imagePath) {
    groundTexture = gl.createTexture();
    var image = new Image();
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, groundTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    };
    image.src = imagePath;
}






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