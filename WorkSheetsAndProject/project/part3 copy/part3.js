var gl;
var canvas;
var teapotProgram, groundProgram, shadowProgram;
var teapotBuffers = {};
var groundBuffers = {};
var teapotDrawingInfo = null;

var groundTexture;

var lightProjectionMatrix, lightViewMatrix; 

var shadowFBO;

var modelModelMatrix, groundModelMatrix, projectionMatrix, viewMatrix;

var mvpMatrixTeapotLoc, modelMatrixTeapotLoc, lightPosTeapotLoc;
var textureLoc, mvpMatrixGroundLoc;

var lightPos;

var jumping = true;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    

    // Initialize WebGL context
    gl = canvas.getContext("webgl", { stencil: true });
    if (!gl) {
        console.error("WebGL isn’t available");
        return;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);


    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); 


    // Enable the OES_element_index_uint extension
    var ext = gl.getExtension('OES_element_index_uint');
    if (!ext) {
        console.log('Warning: Unable to use OES_element_index_uint. High-poly models may not render correctly.');
    }

    // Load shaders and create programs
    teapotProgram = initShaders(gl, "vertex-shader-teapot", "fragment-shader-teapot");
    groundProgram = initShaders(gl, "vertex-shader-ground", "fragment-shader-ground");
    shadowProgram = initShaders(gl, "vertex-shader-shadow", "fragment-shader-shadow");

   
    document.getElementById("toggleJumping").addEventListener("click", function () {
        jumping = !jumping; // Toggle the boolean
    });

    // Initialize the ground quad
    initQuadBuffers();

    // Load texture for the ground
    loadTexture("../textures/xamp23.png");

    // Load the teapot model
    loadTeapotModel("../models/teapot/teapot.obj", 0.25, true);

    setupShadowMapping()

    setupMatricies()

    setUniforms()

    render();
};

function setUniforms() {
    mvpMatrixTeapotLoc = gl.getUniformLocation(teapotProgram, "mvpMatrix");
    modelMatrixTeapotLoc = gl.getUniformLocation(teapotProgram, "modelMatrix");
    lightPosTeapotLoc = gl.getUniformLocation(teapotProgram, "lightPosition");

    mvpMatrixGroundLoc = gl.getUniformLocation(groundProgram, "mvpMatrix");
    textureLoc = gl.getUniformLocation(groundProgram, "texture");
    
}


function setupMatricies() {

    groundModelMatrix = mat4();

    projectionMatrix = perspective(65, canvas.width / canvas.height, 0.1, 20.0);
    viewMatrix = lookAt(vec3(0, 0, 1), vec3(0.0, -1.0, -2.5), vec3(0.0, 1.0, 0.0));

    
}


function setupShadowMapping() {
    shadowFBO = initFramebufferObject(gl, 1024, 1024);

    lightProjectionMatrix = perspective(90, canvas.width / canvas.height, 1.0, 7.0);
    lightViewMatrix = lookAt(vec3(3, 3, 0), vec3(0.0, -1.0, -3.0), vec3(0.0, 1.0, 0.0)); // Light POV
}

function updatelightViewMatrix(t, rMatrix){
    if (!t) t = 0; // Fallback if not provided
    lpn = vec4(Math.sin(t/500)*2.0, 3.0, 2.0*Math.cos(t/500)-3.0,1);

    lightPosv4 = mult(rMatrix, lpn);
    lightPos = vec3(lightPosv4[0], lightPosv4[1], lightPosv4[2]);
    lightViewMatrix = lookAt(lightPos, vec3(0.0, -0.5, -2.0), vec3(0.0, 1.0, 0.0)); // Light POV
}

function updateModelMatrix(t){
    if (jumping)
        modelModelMatrix = translate(0.0, Math.cos(t/300)*0.5-0.5, -3.0);
    else
        modelModelMatrix = translate(0.0, -1.0, -3.0);


}

function render(currentTimestamp) {

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    updatelightViewMatrix(currentTimestamp, mat4());
    updateModelMatrix(currentTimestamp);

    ///// Render teapot to FBO /////
    if (teapotDrawingInfo) {        


        // Setup matricies
        var mvpMatrix = mult(projectionMatrix, mult(viewMatrix, modelModelMatrix));
        var lightMVPMatrix = mult(lightProjectionMatrix, mult(lightViewMatrix,modelModelMatrix));

        // Set light, mvp and model matrix in the teapot program
        gl.useProgram(teapotProgram);
        gl.uniformMatrix4fv(mvpMatrixTeapotLoc, false, flatten(mvpMatrix));
        gl.uniformMatrix4fv(modelMatrixTeapotLoc, false, flatten(modelModelMatrix));
        gl.uniform3fv(lightPosTeapotLoc, flatten(lightPos));

        // Set shadow program mvp from light.
        gl.useProgram(shadowProgram);
        gl.uniformMatrix4fv(gl.getUniformLocation(shadowProgram, "mvpMatrix"), false, flatten(lightMVPMatrix));

        // Draw on FBO
        gl.disable(gl.BLEND);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFBO);
        gl.viewport(0, 0, shadowFBO.width, shadowFBO.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        drawTeapot(shadowProgram);

        gl.enable(gl.BLEND);
        
        gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        
    }

    ///// Mask ground /////

    // Ready stencil buffer
    gl.clear(gl.STENCIL_BUFFER_BIT);
    gl.enable(gl.STENCIL_TEST); // Enable stencil testing

    gl.stencilFunc(gl.ALWAYS, 1, 0xFF); // Always pass the stencil test
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE); // Replace stencil value with 1

    // Render ground quad
    var modelMatrix = mat4() // Place the ground below
    var mvpMatrix = mult(projectionMatrix, mult(viewMatrix, modelMatrix));
    var lightMVPMatrix = mult(lightProjectionMatrix, mult(lightViewMatrix, modelMatrix));
    
    // Set in ground program
    gl.useProgram(groundProgram);
    // Texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, groundTexture);
    gl.uniform1i(textureLoc, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, shadowFBO.texture);
    gl.uniform1i(gl.getUniformLocation(groundProgram, "uShadowMap"), 1);

    // mvp matrix
    gl.uniformMatrix4fv(mvpMatrixGroundLoc, false, flatten(mvpMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(groundProgram, "uLightMVP"), false, flatten(lightMVPMatrix));

    // Shadow program mvp
    gl.useProgram(shadowProgram);
    gl.uniformMatrix4fv(gl.getUniformLocation(shadowProgram, "mvpMatrix"), false, flatten(lightMVPMatrix));

    
    drawGround(groundProgram);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Render reflection and actual teapot
    if (teapotDrawingInfo){

        ///// Draw reflection /////

        // Restrict drawing to stencil marked region:
        gl.stencilFunc(gl.EQUAL, 1, 0xFF); // Pass only where stencil value == 1
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP); // Keep the stencil value

        const P = [0, -1, 0]; // A point on the plane
        const V = [0, 1, 0]; // Normal vector (z-axis plane)
        var rMatrix = getReflectionMatrix(P,V);
        var teapotR = mult(rMatrix, modelModelMatrix);

        // Setup matricies
        var mvpMatrix = mult(projectionMatrix, mult(viewMatrix, teapotR));
        updatelightViewMatrix(currentTimestamp, rMatrix);
        var lightMVPMatrix = mult(lightProjectionMatrix, mult(lightViewMatrix,teapotR));
        
        // Set light, mvp and model matrix in the teapot program
        gl.useProgram(teapotProgram);
        gl.uniformMatrix4fv(mvpMatrixTeapotLoc, false, flatten(mvpMatrix));
        gl.uniformMatrix4fv(modelMatrixTeapotLoc, false, flatten(teapotR));
        gl.uniform3fv(lightPosTeapotLoc, flatten(lightPos));
        gl.uniformMatrix4fv(gl.getUniformLocation(teapotProgram, "uLightMVP"), false, flatten(lightMVPMatrix));


        drawTeapot(teapotProgram);

        updatelightViewMatrix(currentTimestamp, mat4());
        
        // Disable stencil test
        gl.disable(gl.STENCIL_TEST);

        ///// Render actual teapot /////

        // Setup matricies
        var mvpMatrix = mult(projectionMatrix, mult(viewMatrix, modelModelMatrix));
        var lightMVPMatrix = mult(lightProjectionMatrix, mult(lightViewMatrix,modelModelMatrix));

        // Set light, mvp and model matrix in the teapot program
        gl.useProgram(teapotProgram);
        gl.uniformMatrix4fv(mvpMatrixTeapotLoc, false, flatten(mvpMatrix));
        gl.uniformMatrix4fv(modelMatrixTeapotLoc, false, flatten(modelModelMatrix));
        gl.uniform3fv(lightPosTeapotLoc, flatten(lightPos));

        gl.useProgram(teapotProgram);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, shadowFBO.texture);
        gl.uniform1i(gl.getUniformLocation(teapotProgram, "uShadowMap"), 1);

        gl.uniformMatrix4fv(gl.getUniformLocation(teapotProgram, "uLightMVP"), false, flatten(lightMVPMatrix));
        
        // Draw teapot
        drawTeapot(teapotProgram);


        ///// Render ground quad /////

        var modelMatrix = mat4() // Place the ground below
        var mvpMatrix = mult(projectionMatrix, mult(viewMatrix, modelMatrix));
        var lightMVPMatrix = mult(lightProjectionMatrix, mult(lightViewMatrix, modelMatrix));
        
        // Set in ground program
        gl.useProgram(groundProgram);
        // Texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, groundTexture);
        gl.uniform1i(textureLoc, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, shadowFBO.texture);
        gl.uniform1i(gl.getUniformLocation(groundProgram, "uShadowMap"), 1);

        // mvp matrix
        gl.uniformMatrix4fv(mvpMatrixGroundLoc, false, flatten(mvpMatrix));
        gl.uniformMatrix4fv(gl.getUniformLocation(groundProgram, "uLightMVP"), false, flatten(lightMVPMatrix));

        // Shadow program mvp
        gl.useProgram(shadowProgram);
        gl.uniformMatrix4fv(gl.getUniformLocation(shadowProgram, "mvpMatrix"), false, flatten(lightMVPMatrix));

        
        drawGround(groundProgram);

    }

    window.requestAnimFrame(render);
}

function drawTeapot(program) {
    gl.useProgram(program);
    // Bind and enable vertex buffer, Relevant for all
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotBuffers.vertexBuffer);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Bind and enable normal buffer, relevant for all
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotBuffers.normalBuffer);
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    // Bind and draw element buffer, relevant for all
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotBuffers.indexBuffer);
    gl.drawElements(gl.TRIANGLES, teapotDrawingInfo.indices.length, gl.UNSIGNED_INT, 0);
}

function drawGround(program) {
        gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffers.vertexBuffer);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffers.texCoordBuffer);
    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

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



function getReflectionMatrix(P, V) {
    // P is the point on the plane: [Px, Py, Pz]
    // V is the normal vector to the plane: [Vx, Vy, Vz]

    const [Px, Py, Pz] = P; // Coordinates of the point on the plane
    const [Vx, Vy, Vz] = V; // Components of the normal vector

    // Normalize the normal vector
    const length = Math.sqrt(Vx * Vx + Vy * Vy + Vz * Vz);
    const nx = Vx / length;
    const ny = Vy / length;
    const nz = Vz / length;

    // Compute the dot product of P and normalized V
    const dotPV = Px * nx + Py * ny + Pz * nz;

    // Create the reflection matrix R
    let R = mat4(); // Initialize an identity matrix (assuming mat4() gives a 4x4 identity matrix)

    // Fill in the matrix according to the formula
    R[0][0] = 1 - 2 * nx * nx;
    R[0][1] = -2 * nx * ny;
    R[0][2] = -2 * nx * nz;
    R[0][3] = 2 * dotPV * nx;

    R[1][0] = -2 * nx * ny;
    R[1][1] = 1 - 2 * ny * ny;
    R[1][2] = -2 * ny * nz;
    R[1][3] = 2 * dotPV * ny;

    R[2][0] = -2 * nx * nz;
    R[2][1] = -2 * ny * nz;
    R[2][2] = 1 - 2 * nz * nz;
    R[2][3] = 2 * dotPV * nz;

    R[3][0] = 0;
    R[3][1] = 0;
    R[3][2] = 0;
    R[3][3] = 1;

    return R;
}