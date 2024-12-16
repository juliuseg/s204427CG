var gl, program;
var M_texLoc, mvpMatrixLoc, lightDirLoc, reflectiveLoc, isBackgroundLoc, eyePositionLoc;
var canvas;
const TEXTUREPATH = "../textures/"


var pointsArray = [];
var normalsArray = [];
var index = 0;
var numSubdivs = 5; // Controls level of subdivision for sphere
var backgroundIndex = 0;

let camera;


window.onload = function init() {
    console.log("time")
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
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Uniform locations
    SetUniformLocations();

    // Camera
    camera = new Camera(
        height = 1.0, // Camera height
        radius = 3.0, // Camera radius
        speed = 0.5,  // Camera speed
        lookAtCenter = vec3(0.0, 0.0, 0.0), // The center the camera looks at
        lightFollowFactor = 1.0 // Light follows halfway the camera
    );

    // Initialize the cube map texture
    initCubeMapTexture();

    // Initialize the background quad and the sphere geometry
    initBackgroundQuad();
    initSphere();


    window.requestAnimFrame(render);
};


function SetUniformLocations () {
    M_texLoc = gl.getUniformLocation(program, "M_tex");
    mvpMatrixLoc = gl.getUniformLocation(program, "mvpMatrix");
    lightDirLoc = gl.getUniformLocation(program, "lightDir");
    isBackgroundLoc = gl.getUniformLocation(program, "isBackground");
    eyePositionLoc = gl.getUniformLocation(program, "eyePosition");
    reflectiveLoc = gl.getUniformLocation(program, "reflective");

}


function render(currentTimestamp) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Update the camera
    camera.update(currentTimestamp);

    // Get positions and matrices
    const eyePos = camera.getCameraPosition();
    const lightPos = camera.getLightPosition();
    const mvpMatrix = camera.getMVPMatrix(canvas.width, canvas.height);

    // Pass uniforms to shaders
    gl.uniform3fv(lightDirLoc, flatten(lightPos));
    gl.uniform3fv(eyePositionLoc, flatten(eyePos));
    gl.uniformMatrix4fv(mvpMatrixLoc, false, flatten(mvpMatrix));

    // Render the background
    gl.uniform1i(isBackgroundLoc, 1); // Background mode
    gl.uniform1i(reflectiveLoc, 0);   // Non-reflective
    setM_texBackground(eyePos);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.backgroundBuffer);
    gl.vertexAttribPointer(gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "vPosition"), 4, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, backgroundIndex);

    // Render the sphere
    gl.uniform1i(isBackgroundLoc, 0); // Sphere mode
    gl.uniform1i(reflectiveLoc, 1);   // Reflective
    setM_texSphere();

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.sphereBuffer);
    gl.vertexAttribPointer(gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "vPosition"), 4, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.sphereNormalBuffer);
    gl.vertexAttribPointer(gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "vNormal"), 3, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, index);

    window.requestAnimFrame(render);
}


