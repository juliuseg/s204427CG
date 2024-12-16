var gl;
var mvpMatrixLoc, modelMatrixLoc, lightDirectionLoc;
var canvas;
var drawingInfo = null;

var currentQuat;




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

    currentQuat = new Quaternion();


    initEventHandlers(canvas, currentQuat);

    render();
};

function initEventHandlers(canvas, currentQuat) {
    var dragging = false; // Dragging state
    var lastPos = null;   // Last position on the arcball sphere

    canvas.onmousedown = function(ev) {
        var x = ev.clientX, y = ev.clientY;
        var rect = ev.target.getBoundingClientRect();
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
            lastPos = getArcballVector(x, y, canvas); // Map mouse position to sphere
            dragging = true;
        }
    };

    canvas.onmouseup = function(ev) {
        dragging = false;
        lastPos = null; // Reset last position
    };

    canvas.onmousemove = function(ev) {
        if (dragging) {
            var currPos = getArcballVector(ev.clientX, ev.clientY, canvas);
            if (lastPos && currPos) {
                // Compute the quaternion representing rotation from lastPos to currPos
                var q = new Quaternion();
                q.make_rot_vec2vec(lastPos, currPos); // Quaternion rotation between vectors
                currentQuat.set(q.multiply(currentQuat)); // Reverse the multiplication order
            }
            lastPos = currPos; // Update last position
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

    if (drawingInfo) {
        var projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 10.0);
        var viewMatrix = getRotatedViewMatrix(currentQuat);
        var modelMatrix = mat4(); // Make a function i will call here that rotates by currentangle!

        var lightDirection = vec3(0.5, 1.0, 0.5); // Example light direction
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




function getRotatedViewMatrix(currentQuat) {
    var target = vec3(0.0, 0.0, 0.0);
    var radius = 7.0; // Distance from the camera to the target

    // Initial eye position and up vector
    var eye = vec3(0.0, 0.0, radius);
    var up = vec3(0.0, 1.0, 0.0);

    // Rotate the eye position and up vector using the current quaternion
    eye = currentQuat.apply(eye);
    up = currentQuat.apply(up);

    // Return the new view matrix
    return lookAt(vec3(eye[0], eye[1], eye[2]), target, up);
}

