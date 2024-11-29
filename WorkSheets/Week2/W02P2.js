var gl;
var indexPoint = 0;
var indexTriangle = 0;
var indexCircle = 0;
const circleSegments = 100; // Number of segments for the circle   
var numberOfCircles = 0;
 
const maxPoints = 300; // Max number of points supported
const pointBufferSize = 2*4; // 2 floats per point (x, y)
const maxTriangles = 100; // Max number of triangles supported
const triangleBufferSize = 3*2*4; // 3 points per triangle, 2 floats per point (x, y)
const maxCircles = 30; // Max number of circles supported
const circleBufferSize = 2*2*4; // 100 points per circle, 2 floats per point (x, y)

var drawingMode = 0;
var tempPoints = [];
var tempColors = [];


window.onload = function init() {
    const canvas = document.getElementById("gl-canvas");

    // Initialize WebGL context
    initializeWebGL(canvas);

    // Load shaders and initialize buffers
    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Initialize buffers for position and color
    console.log("Buffer size: " + (maxPoints * pointBufferSize + maxTriangles * triangleBufferSize + maxCircles * circleSegments * circleBufferSize));
    const pBuffer = initializeBuffer(maxPoints * pointBufferSize + maxTriangles * triangleBufferSize + maxCircles * circleSegments * circleBufferSize); // 2 floats per point (x, y)
    const cBuffer = initializeBuffer((maxPoints+maxTriangles+maxCircles * circleSegments) * 4 * 4); // 4 floats per color (RGBA)

    // Associate buffers with shader variables
    associateBuffer(program, "vPosition", pBuffer, 2); // 2 floats for position
    associateBuffer(program, "vColor", cBuffer, 4);    // 4 floats for color

    // Add event listeners for canvas clicks and clearing
    setupDrawingModeListener();
    setupCanvasClickListener(canvas, pBuffer, cBuffer);
    setupClearButtonListener();

    // Start rendering loop
    render();
};

function initializeWebGL(canvas) {
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn’t available");
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0); // Cornflower blue
}

function initializeBuffer(size) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_DRAW);
    return buffer;
}

function associateBuffer(program, attribute, buffer, size) {
    const location = gl.getAttribLocation(program, attribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(location);
}

function setupDrawingModeListener() {
    const addPointsButton = document.getElementById("AddPoints");
    const addTrianglesButton = document.getElementById("AddTriangles");
    const addCirclesButton = document.getElementById("AddCircles");

    addPointsButton.addEventListener("click", () => {
        drawingMode = 0;
    });

    addTrianglesButton.addEventListener("click", () => {
        drawingMode = 1;
        tempPoints = [];
        tempColors = [];
    });

    addCirclesButton.addEventListener("click", () => {
        drawingMode = 2;
    });
}

function setupCanvasClickListener(canvas, pBuffer, cBuffer) {
    canvas.addEventListener("click", (event) => {
        const rect = canvas.getBoundingClientRect();
        const correctedX = event.clientX - rect.left;
        const correctedY = event.clientY - rect.top;

        // Convert to WebGL coordinates
        const t = vec2(
            -1 + (2 * correctedX) / canvas.width,
            -1 + (2 * (canvas.height - correctedY)) / canvas.height
        );

        // Get selected point color from the menu
        const colorMenu = document.getElementById("PointColorMenu");
        const selectedColor = getColorFromMenu(colorMenu.selectedIndex);

        // Draw according to drawing mode
        if (drawingMode === 0) {
            // Draw a point
            drawPoint(pBuffer, cBuffer, t, selectedColor);

        } else if (drawingMode === 1) {
            // Draw a triangle or a point that becomes a trianlge
            drawTriangle(pBuffer, cBuffer, t, selectedColor);
            
        } else if (drawingMode === 2) {
            // Draw a circle
            drawCircle(pBuffer, cBuffer, t, selectedColor);
        }

    });
}

function drawPoint(pBuffer, cBuffer, t, color) {

    // Update position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, sizeof["vec2"] * indexPoint, new Float32Array(t));

    // Update color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, sizeof["vec4"] * indexPoint, new Float32Array(flatten(color)));

    indexPoint++;
}

function drawTriangle(pBuffer, cBuffer, t, color) {
    tempPoints.push(t);
    tempColors.push(color);
    drawPoint(pBuffer, cBuffer, t, color);

    if (tempPoints.length === 3) {
        indexPoint -= 3;

        // We clear the 3 points just drawn as points and draw them as a triangle instead

        for (let i = 0; i < 3; i++) {
            gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
            console.log("buffer index: " + ((sizeof["vec2"] * (indexTriangle+i))+sizeof["vec2"]*maxPoints));
            console.log("vec2 size: " + sizeof["vec2"]);
            gl.bufferSubData(gl.ARRAY_BUFFER, (sizeof["vec2"] * (indexTriangle+i))+sizeof["vec2"]*maxPoints, new Float32Array(tempPoints[i]));

            // Update color buffer
            gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, (sizeof["vec4"] * (indexTriangle+i))+sizeof["vec4"]*maxPoints, new Float32Array(flatten(tempColors[i])));
        }
        tempPoints = [];
        tempColors = [];
        indexTriangle += 3;


    }

}

function drawCircle(pBuffer, cBuffer, t, color) {
    tempPoints.push(t);
    tempColors.push(color);
    drawPoint(pBuffer, cBuffer, t, color);

    if (tempPoints.length === 2) {
        indexPoint -= 2;

        var center = tempPoints[0];
        var radius = Math.sqrt(Math.pow(tempPoints[1][0] - center[0], 2) + Math.pow(tempPoints[1][1] - center[1], 2));

        // Draw the center point
        gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, sizeof["vec2"]*(indexCircle+maxPoints+maxTriangles), new Float32Array(center));
        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, sizeof["vec4"]*(indexCircle+maxPoints+maxTriangles), new Float32Array(flatten(tempColors[0])));

        for (let i = 0; i <= (circleSegments-2); i++) {
            let angle = (i * 2 * Math.PI) / (circleSegments-2); // Angle for the current segment
            let x = center[0] + radius * Math.cos(angle);
            let y = center[1] + radius * Math.sin(angle);

            gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, sizeof["vec2"]*((indexCircle+i+1)+maxPoints+maxTriangles), new Float32Array(vec2(x, y)));

            // Update color buffer
            gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, sizeof["vec4"]*((indexCircle+i+1)+maxPoints+maxTriangles), new Float32Array(flatten(color)));
        }
        

        tempPoints = [];
        tempColors = [];
        indexCircle += circleSegments;
        numberOfCircles++;


    }
}



function setupClearButtonListener() {
    const clearButton = document.getElementById("ClearButton");
    const colorMenu = document.getElementById("CanvasColorMenu");

    clearButton.addEventListener("click", () => {
        const clearColor = getColorFromMenu(colorMenu.selectedIndex);
        gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);
        indexPoint = 0;
        indexTriangle = 0;
        indexCircle = 0;
        numberOfCircles = 0;

    });
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    // Draw points
    gl.drawArrays(gl.POINTS, 0, indexPoint);
    // Draw triangles
    gl.drawArrays(gl.TRIANGLES, maxPoints, indexTriangle);
    // Draw circles
    for (let i = 0; i < numberOfCircles; i++) {
        gl.drawArrays(gl.TRIANGLE_FAN, maxPoints + maxTriangles + i*circleSegments, circleSegments);

    }   


    window.requestAnimFrame(render);
}

// Function to get the selected color based on the menu index
function getColorFromMenu(index) {
    switch (index) {
        case 0: return vec4(1.0, 0.2, 0.2, 1.0);  // Red
        case 1: return vec4(0.2, 1.0, 0.2, 1.0);  // Green
        case 2: return vec4(0.2, 0.2, 1.0, 1.0);  // Blue
        case 3: return vec4(1.0, 1.0, 0.2, 1.0);  // Yellow
        case 4: return vec4(1.0, 0.2, 1.0, 1.0);  // Magenta
        case 5: return vec4(0.2, 1.0, 1.0, 1.0);  // Cyan
        case 6: return vec4(0.98, 0.98, 0.98, 1.0);  // White
        case 7: return vec4(0.4, 0.6, 0.9, 1.0);  // Cornflower Blue
        case 8: return vec4(0.2, 0.2, 0.2, 1.0);  // Black/Grey
        default: return vec4(0.4, 0.6, 0.9, 1.0); // Default to Cornflower Blue
    }
}