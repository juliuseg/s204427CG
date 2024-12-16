var mvpMatrixLoc_mp;
var drawingInfo = null;
var program_mp;

var modelBuffers_mp = [];
var modelBuffers = [];


var models = [];
var model_index = 0;

function initModelPicker(){
    gl_mp.clearColor(1.0, 1.0, 1.0, 1.0);

    gl_mp.clear(gl_mp.COLOR_BUFFER_BIT);

    gl_mp.viewport(0, 0, canvas_mp.width, canvas_mp.height);
    gl_mp.enable(gl_mp.DEPTH_TEST);

    // Enable the OES_element_index_uint extension
    var ext = gl_mp.getExtension('OES_element_index_uint');
    if (!ext) {
        console.log('Warning: Unable to use OES_element_index_uint. High-poly models may not render correctly.');
    }

    // Load shaders and initialize attribute buffers
    program_mp = initShaders(gl_mp, "vertex-shader-mp", "fragment-shader-mp");
    gl_mp.useProgram(program_mp);

    mvpMatrixLoc_mp = gl_mp.getUniformLocation(program_mp, "mvpMatrix");

    const lightDir = vec3(1.0, 1.0, 1.0);
    // Set initial lighting and material properties
    gl_mp.uniform3fv(gl_mp.getUniformLocation(program_mp, "lightDir"), flatten(lightDir));
    


    loadOBJFiles("../models/teapot/teapot.obj", 0.25, true, "teapot", -1, 0.35);
    loadOBJFiles("../models/suzanne/suzanne.obj", 0.6, true, "suzanne", -0.4, 0.1);
    loadOBJFiles("../models/stanford-bunny/stanford-bunny.obj", 7.0, true, "stanford-bunny", -1.25, 0.8);

    // Buttons:

    // Display the initial model
    if (models.length>0) 
        document.getElementById("currentModel").innerText = models[model_index];
     

    // Event listeners for buttons
    document.getElementById("prevModel").addEventListener("click", function () {
        updateModelIndex(-1); // Go to the previous model
    });

    document.getElementById("nextModel").addEventListener("click", function () {
        updateModelIndex(1); // Go to the next model
    });

    document.getElementById("selectModel").addEventListener("click", function () {
        bufferAndInfo = modelBuffers[models[model_index]];
        console.log(models.length);
    });

    render_mp();
}


function render_mp(currentTimestamp) {
    if (!currentTimestamp) currentTimestamp = 0.1;
    gl_mp.useProgram(program_mp);

    gl_mp.clear(gl_mp.COLOR_BUFFER_BIT | gl_mp.DEPTH_BUFFER_BIT);

    
    model = models[model_index];
    if (modelBuffers_mp[model]){
        const projectionMatrix = perspective(60, canvas_mp.width / canvas_mp.height, 0.1, 10.0);
        const viewMatrix = lookAt(
            vec3(Math.sin(currentTimestamp / 1000) * 2, 1, 2 * Math.cos(currentTimestamp / 1000)),
            vec3(0.0, modelBuffers_mp[model].height, 0.0),
            vec3(0.0, 1.0, 0.0)
        );
        lightDir = vec3(Math.sin(currentTimestamp / 1000), 1, Math.cos(currentTimestamp / 1000))
        gl_mp.uniform3fv(gl_mp.getUniformLocation(program_mp, "lightDir"), flatten(lightDir));

        const buffers = modelBuffers_mp[model];
        const modelMatrix = mat4(); // Customize per model if needed
        const mvpMatrix = mult(projectionMatrix, mult(viewMatrix, modelMatrix));

        // Bind buffers and set attributes
        gl_mp.bindBuffer(gl_mp.ARRAY_BUFFER, buffers.vertexBuffer);
        const vPosition = gl_mp.getAttribLocation(program_mp, "vPosition");
        gl_mp.vertexAttribPointer(vPosition, 4, gl_mp.FLOAT, false, 0, 0);
        gl_mp.enableVertexAttribArray(vPosition);

        gl_mp.bindBuffer(gl_mp.ARRAY_BUFFER, buffers.normalBuffer);
        const vNormal = gl_mp.getAttribLocation(program_mp, "vNormal");
        gl_mp.vertexAttribPointer(vNormal, 3, gl_mp.FLOAT, false, 0, 0);
        gl_mp.enableVertexAttribArray(vNormal);

        gl_mp.bindBuffer(gl_mp.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);

        // Set uniforms
        gl_mp.uniformMatrix4fv(gl_mp.getUniformLocation(program_mp, "modelMatrix"), false, flatten(modelMatrix));
        gl_mp.uniformMatrix4fv(mvpMatrixLoc_mp, false, flatten(mvpMatrix));

        // Draw model
        gl_mp.drawElements(gl_mp.TRIANGLES, buffers.indexCount, gl_mp.UNSIGNED_INT, 0);
        
    }
    window.requestAnimFrame(render_mp);
}


async function loadOBJFiles(fileName, scale, reverse, modelName, height_world, height_selecter) {
    const drawingInfo = await readOBJFile(fileName, scale, reverse);
    console.log('trying to load', modelName)

    if (drawingInfo) {
        modelBuffers_mp[modelName] = initModelBuffers(drawingInfo, height_selecter, gl_mp);
        modelBuffers[modelName] = initModelBuffers(drawingInfo, height_world, gl);
        models.push(modelName);

        if (models.length==1){
            bufferAndInfo = modelBuffers[models[model_index]];
            document.getElementById("currentModel").innerText = "suzanne";
        }
    }
}



function initModelBuffers(drawingInfo, height, gl) {
    const recalculatedNormals = calculateNormals(drawingInfo.vertices, drawingInfo.indices);

    // Create buffers object
    const buffers = {};

    // Create and set up the position buffer
    buffers.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);

    // Create and set up the normal buffer
    buffers.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, recalculatedNormals, gl.STATIC_DRAW);

    // Create and set up the index buffer
    buffers.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

    // Store metadata
    buffers.indexCount = drawingInfo.indices.length;

    buffers.height = height;

    // Add to global modelBuffers array

    return buffers;

}


// Function to update the model index and wrap around
function updateModelIndex(change) {
    model_index = (model_index + change + models.length) % models.length; // Wrap around
    document.getElementById("currentModel").innerText = models[model_index];
    console.log("Current Model:", models[model_index]); // Debug output
}