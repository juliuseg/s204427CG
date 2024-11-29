var gl, program;
var mvpMatrixLoc, lightDirLoc;
var canvas;
const TEXTUREPATH = "../textures/"


var index = 0;
var numSubdivs = 5;

let camera;


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
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    SetUniformLocations();

    // Camera
    camera = new Camera(
        height = 0.0, // Camera height
        radius = 3.0, // Camera radius
        speed = 0.5,  // Camera speed
        lookAtCenter = vec3(0.0, 0.0, 0.0), // The center the camera looks at
        lightFollowFactor = 1.0,
    );

    // Initialize the cube map texture
    initCubeMapTexture();


    // Add buttons to control subdivisions
    document.getElementById("AddSubdivision").onclick = function() {
        numSubdivs++;
        initSphere();
    };
    document.getElementById("RemoveSubdivision").onclick = function() {
        if (numSubdivs > 0) {
            numSubdivs--;
            initSphere();
        }
    };

    initSphere();

    window.requestAnimFrame(render);
};

function SetUniformLocations () {
    mvpMatrixLoc = gl.getUniformLocation(program, "mvpMatrix");
    lightDirLoc = gl.getUniformLocation(program, "lightDir");
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
    // gl.uniform3fv(eyePositionLoc, flatten(eyePos));
    gl.uniformMatrix4fv(mvpMatrixLoc, false, flatten(mvpMatrix));


    // Set light direction for fragment shader

    gl.drawArrays(gl.TRIANGLES, 0, index);
    window.requestAnimFrame(render);
}
