var gl;
var mvpMatrixLoc, modelMatrixLoc, lightDirectionLoc;
var canvas;
var drawingInfo = null;

var currentAngle = [0.0, 0.0]; // [x-axis, y-axis] degrees    


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

    initEventHandlers(canvas, currentAngle);

    render();
};

function initEventHandlers(canvas, currentAngle) {
    var dragging = false;     // Dragging or not
    var lastX = -1, lastY = -1; // Last position of the mouse

    canvas.onmousedown = function(ev) {  // Mouse is pressed
        var x = ev.clientX, y = ev.clientY;
        // Start dragging if a mouse is in <canvas>
        var rect = ev.target.getBoundingClientRect();
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
            lastX = x; lastY = y;
            dragging = true;
        }
        
    };

    // Mouse is released
    canvas.onmouseup = function(ev) { dragging = false; };

    canvas.onmousemove = function(ev) { // Mouse is moved
        var x = ev.clientX, y = ev.clientY;
        if (dragging) {
            var factor = 100 / canvas.height; // The rotation ratio
            var dx = factor * (x - lastX);
            var dy = factor * (y - lastY);
            // Limit x-axis rotation angle to -90 to 90 degrees
            currentAngle[0] = Math.max(Math.min(currentAngle[0] + dy, 90.0), -90.0);
            currentAngle[1] = currentAngle[1] + dx;
        }
        lastX = x, lastY = y;
    };
}



function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (drawingInfo) {
        var projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 10.0);
        var viewMatrix = getRotatedViewMatrix(currentAngle);//lookAt(vec3(5, 5, 5), vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0)); // I will call a function here that makes the rotated view matrix!
        // getRotatedViewMatrix(currentAngle);
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



function getRotatedModelMatrix(currentAngle) {
    var modelMatrix = mat4(); // Identity matrix

    // Rotate around x-axis
    modelMatrix = mult(rotate(currentAngle[0], vec3(1, 0, 0)), modelMatrix);

    // Rotate around y-axis
    modelMatrix = mult(rotate(currentAngle[1], vec3(0, 1, 0)), modelMatrix);

    return modelMatrix;
}

function getRotatedViewMatrix(currentAngle) {
    // Define the target point (look-at point)
    var target = vec3(0.0, 0.0, 0.0);
    var radius = 7.0; // Distance from the camera to the target

    // Calculate the new camera position based on spherical coordinates
    var eyeX = target[0] + radius * Math.cos(radians(currentAngle[1])) * Math.cos(radians(currentAngle[0]));
    var eyeY = target[1] + radius * Math.sin(radians(currentAngle[0]));
    var eyeZ = target[2] + radius * Math.sin(radians(currentAngle[1])) * Math.cos(radians(currentAngle[0]));

    // Return the new view matrix
    return lookAt(vec3(eyeX, eyeY, eyeZ), target, vec3(0.0, 1.0, 0.0));
}


