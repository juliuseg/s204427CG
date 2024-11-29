var gl;
var canvas;
var teapotProgram, groundProgram;
var teapotBuffers = {};
var groundBuffers = {};
var teapotDrawingInfo = null;

var groundTexture;

var lightMVPMatrix; // Define this variable globally at the top of the script


window.onload = function init() {
    // Get the canvas element
    canvas = document.getElementById("gl-canvas");

    // Initialize WebGL context
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        console.error("WebGL isn’t available");
        return;
    }

    // Set up WebGL context properties
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // Enable OES_element_index_uint extension for high-poly models
    var ext = gl.getExtension('OES_element_index_uint');
    if (!ext) {
        console.log('Warning: Unable to use OES_element_index_uint. High-poly models may not render correctly.');
    }

    // Load and initialize shader programs
    teapotProgram = initShaders(gl, "vertex-shader-teapot", "fragment-shader-teapot");
    groundProgram = initShaders(gl, "vertex-shader-ground", "fragment-shader-ground");

    // Initialize buffers for the ground
    initQuadBuffers();

    // Load texture for the ground
    loadTexture("../textures/xamp23.png");

    // Load the teapot model
    loadTeapotModel("../models/teapot/teapot.obj", 0.25, true);

    // Set up shadow mapping
    setupShadowMapping();

    // Start rendering
    render();
};


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


async function loadTeapotModel(fileName, scale, reverse) {
    teapotDrawingInfo = await readOBJFile(fileName, scale, reverse);
    if (teapotDrawingInfo) {
        initTeapotBuffers(teapotDrawingInfo);
    }
}

function initTeapotBuffers(drawingInfo) {
    gl.useProgram(teapotProgram);

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



function setupShadowMapping() {
    // Create a framebuffer for shadow mapping
    shadowFBO = initFramebufferObject(gl, 1024, 1024);

    // Define light's projection and view matrices
    const lightProjectionMatrix = ortho(-10, 10, -10, 10, 1.0, 50.0); // Orthographic projection
    const lightViewMatrix = lookAt(vec3(5, 10, 5), vec3(0, 0, 0), vec3(0, 1, 0)); // Light POV

    // Compute the light's MVP matrix
    lightMVPMatrix = mult(lightProjectionMatrix, lightViewMatrix);

    // Pass shadow map-related matrices to shaders
    gl.useProgram(groundProgram);
    gl.uniformMatrix4fv(gl.getUniformLocation(groundProgram, "lightMVPMatrix"), false, flatten(lightMVPMatrix));

    gl.useProgram(teapotProgram);
    gl.uniform3fv(gl.getUniformLocation(teapotProgram, "lightDirection"), flatten(vec3(5, 10, 5)));
}



function initFramebufferObject(gl, width, height)
{
    var framebuffer = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    var renderbuffer = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
    var shadowMap = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, shadowMap);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    framebuffer.texture = shadowMap;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, shadowMap, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) { console.log('Framebuffer object is incomplete: ' + status.toString()); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    framebuffer.width = width; framebuffer.height = height;
    return framebuffer;
}



function render() {
    // Clear the screen and depth buffer for the new frame
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Compute light's MVP matrix
    gl.useProgram(teapotProgram);
    const lightMVPMatrixLoc = gl.getUniformLocation(teapotProgram, "lightMVPMatrix");
    if (lightMVPMatrixLoc) {
        gl.uniformMatrix4fv(lightMVPMatrixLoc, false, flatten(lightMVPMatrix));
    }
    // Step 1: Render the shadow map (to the FBO)
    renderToFBO(gl, shadowFBO, lightMVPMatrix);

    // Step 2: Render the teapot with shadow mapping applied
    const cameraProjectionMatrix = perspective(90, canvas.width / canvas.height, 0.1, 50.0);
    const cameraViewMatrix = lookAt(vec3(0, 0, 0), vec3(0.0, -1.0, -2.5), vec3(0.0, 1.0, 0.0));
    if (teapotDrawingInfo) renderTeapot(gl, teapotProgram, cameraProjectionMatrix, cameraViewMatrix, lightMVPMatrix);

    // Step 3: Render the ground with shadow mapping applied
    renderGround(gl, groundProgram, cameraProjectionMatrix, cameraViewMatrix, lightMVPMatrix);

    // Request the next frame
    window.requestAnimFrame(render);
}


function renderToFBO(gl, shadowFBO, lightMVPMatrix) {
    // Bind the FBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFBO);

    // Set the viewport to match the shadow map resolution
    gl.viewport(0, 0, shadowFBO.width, shadowFBO.height);

    // Clear the FBO
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Use the shadow mapping shader program
    gl.useProgram(groundProgram);

    // Pass the light's MVP matrix to the shader
    gl.uniformMatrix4fv(gl.getUniformLocation(groundProgram, "mvpMatrix"), false, flatten(lightMVPMatrix));

    // Render the teapot
    if (teapotDrawingInfo) {
        gl.bindBuffer(gl.ARRAY_BUFFER, teapotBuffers.vertexBuffer);
        const vPosition = gl.getAttribLocation(groundProgram, "vPosition");
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotBuffers.indexBuffer);
        gl.drawElements(gl.TRIANGLES, teapotDrawingInfo.indices.length, gl.UNSIGNED_INT, 0);
    }

    // Unbind the FBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function renderTeapot(gl, teapotProgram, projectionMatrix, viewMatrix, lightMVPMatrix) {
    // Use the teapot shader program
    gl.useProgram(teapotProgram);

    // Compute transformation matrices
    const modelMatrix = translate(0.0, -1.0, -3.0); // Teapot position
    const mvpMatrix = mult(projectionMatrix, mult(viewMatrix, modelMatrix));

    // Pass matrices and light data to the shader
    gl.uniformMatrix4fv(gl.getUniformLocation(teapotProgram, "mvpMatrix"), false, flatten(mvpMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(teapotProgram, "modelMatrix"), false, flatten(modelMatrix));
    gl.uniform3fv(gl.getUniformLocation(teapotProgram, "lightDirection"), flatten(vec3(5, 10, 5)));
    gl.uniformMatrix4fv(gl.getUniformLocation(teapotProgram, "lightMVPMatrix"), false, flatten(lightMVPMatrix));

    // Bind and enable vertex attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotBuffers.vertexBuffer);
    const vPosition = gl.getAttribLocation(teapotProgram, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, teapotBuffers.normalBuffer);
    const vNormal = gl.getAttribLocation(teapotProgram, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    // Bind and draw element buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotBuffers.indexBuffer);
    gl.drawElements(gl.TRIANGLES, teapotDrawingInfo.indices.length, gl.UNSIGNED_INT, 0);
}

function renderGround(gl, groundProgram, projectionMatrix, viewMatrix, lightMVPMatrix) {
    // Use the ground shader program
    gl.useProgram(groundProgram);

    // Compute the ground's transformation matrices
    const modelMatrix = mat4(); // Identity matrix for ground at default position
    const mvpMatrix = mult(projectionMatrix, mult(viewMatrix, modelMatrix));

    // Pass matrices and shadow map data to the shader
    gl.uniformMatrix4fv(gl.getUniformLocation(groundProgram, "mvpMatrix"), false, flatten(mvpMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(groundProgram, "lightMVPMatrix"), false, flatten(lightMVPMatrix));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, shadowFBO.texture);
    gl.uniform1i(gl.getUniformLocation(groundProgram, "shadowMap"), 0);

    // Bind the ground texture
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, groundTexture);
    gl.uniform1i(gl.getUniformLocation(groundProgram, "texture"), 1);

    // Bind and enable vertex attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffers.vertexBuffer);
    const vPosition = gl.getAttribLocation(groundProgram, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffers.texCoordBuffer);
    const vTexCoord = gl.getAttribLocation(groundProgram, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    // Bind and draw element buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundBuffers.indexBuffer);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
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
