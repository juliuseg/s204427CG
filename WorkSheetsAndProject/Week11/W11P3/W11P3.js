var gl;
var mvpMatrixLoc, modelMatrixLoc, lightDirectionLoc;
var canvas;
var drawingInfo = null;


var currentMode;


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
    modelMatrixLoc = gl.getUniformLocation(program, "modelMatrix");
    lightDirectionLoc = gl.getUniformLocation(program, "lightDirection");

    loadOBJFile("../res/suzanne.obj", 1, true);


    currentMode = 'orbit'; // Switch to dolly mode
    setupModeSwitching();

    initEventHandlers(canvas);

    render();
};


function setupModeSwitching() {
    // Get button elements
    const orbitButton = document.getElementById('orbit-btn');
    const dollyButton = document.getElementById('dolly-btn');
    const panButton = document.getElementById('pan-btn');
    const spinButton = document.getElementById('spin-btn');


    // Attach click event listeners to the buttons
    orbitButton.addEventListener('click', () => {
        currentMode = 'orbit';
        sharedState.spinActive = false;
    });

    dollyButton.addEventListener('click', () => {
        currentMode = 'dolly';
        sharedState.spinActive = false;
    });

    panButton.addEventListener('click', () => {
        currentMode = 'pan';
        sharedState.spinActive = false;
    });
    spinButton.addEventListener('click', () => {
        currentMode = 'spin';
    });
}

function initEventHandlers(canvas) {
    canvas.onmousedown = function(ev) {
        if (handlers[currentMode]?.onMouseDown) {
            handlers[currentMode].onMouseDown(ev, sharedState);
        }
    };

    canvas.onmousemove = function(ev) {
        if (handlers[currentMode]?.onMouseMove) {
            handlers[currentMode].onMouseMove(ev, sharedState);
        }
    };

    canvas.onmouseup = function(ev) {
        if (handlers[currentMode]?.onMouseUp) {
            handlers[currentMode].onMouseUp(ev, sharedState);
        }
    };
}

// Helper function to map mouse position to arcball sphere
function getArcballVector(x, y, canvas) {
    var rect = canvas.getBoundingClientRect();
    var nx = -(2.0 * (x - rect.left) / canvas.width - 1.0);
    var ny = -(1.0 - 2.0 * (y - rect.top) / canvas.height);

    var vec = vec3(nx, ny, 0.0);
    var lengthSquared = nx * nx + ny * ny;
    if (lengthSquared <= 1.0) {
        vec[2] = Math.sqrt(1.0 - lengthSquared); // Project to sphere
    } else {
        vec = normalize(vec); // Use your custom normalize function here
    }
    return vec;
}



function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (sharedState.spinActive) {
        // Apply the last incremental rotation to current quaternion
        sharedState.currentQuat.multiply(sharedState.lastIncrementalQuat)

        const q = sharedState.lastIncrementalQuat.elements;

    }

    if (drawingInfo) {
        var nearClip = Math.max(0.1, sharedState.cameraSettings.distance - 5);
        var farClip = sharedState.cameraSettings.distance + 5;
        var projectionMatrix = perspective(45, canvas.width / canvas.height, nearClip, farClip);
        var viewMatrix = getRotatedViewMatrix(sharedState);
        var modelMatrix = mat4();

        var lightDirection = vec3(1.0, 1.0, 1.0);
        gl.uniform3fv(lightDirectionLoc, flatten(lightDirection));

        var mvpMatrix = mult(projectionMatrix, mult(viewMatrix, modelMatrix));
        gl.uniformMatrix4fv(mvpMatrixLoc, false, flatten(mvpMatrix));
        gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix));

        gl.drawElements(gl.TRIANGLES, drawingInfo.indices.length, gl.UNSIGNED_INT, 0);
    }

    window.requestAnimFrame(render);
}


async function loadOBJFile(fileName, scale, reverse) {
    drawingInfo = await readOBJFile(fileName, scale, reverse);
    if (drawingInfo) {
        initBuffers(drawingInfo);
    }
}


function getRotatedViewMatrix(sharedState) {
    const { currentQuat, cameraSettings } = sharedState;
    const { look, distance, panOffset } = cameraSettings;

    const adjustedEye = vec3(0.0, 0.0, distance); // Eye starts at the given distance along the z-axis
    const rotatedEye = currentQuat.apply(adjustedEye); // Rotate the eye using the quaternion

    const adjustedLookAt = vec3(
        look[0] + panOffset[0],
        look[1] + panOffset[1],
        look[2] + panOffset[2],
    );

    const upVector = [0, 1, 0]; // Default "up" vector
    const rotatedUp = currentQuat.apply(upVector);

    const finalEye = vec3(
        rotatedEye[0] + adjustedLookAt[0],
        rotatedEye[1] + adjustedLookAt[1],
        rotatedEye[2] + adjustedLookAt[2]
    );

    return lookAt(finalEye, adjustedLookAt, rotatedUp);
}



