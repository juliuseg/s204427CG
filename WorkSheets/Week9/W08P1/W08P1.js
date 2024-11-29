var gl;
var mvpMatrixLoc, texture, redTexture;
var canvas;

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

    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Vertex positions for the ground and two smaller quads
    var vertices = [
        // Ground quad
        vec4(-2, -1, -1, 1.0), vec4(2, -1, -1, 1.0),
        vec4(2, -1, -5, 1.0), vec4(-2, -1, -5, 1.0),

        // Parallel red quad
        vec4(0.25, -0.5, -1.25, 1.0), vec4(0.75, -0.5, -1.25, 1.0),
        vec4(0.75, -0.5, -1.75, 1.0), vec4(0.25, -0.5, -1.75, 1.0),

        // Perpendicular red quad
        vec4(-1, -1, -2.5, 1.0), vec4(-1, 0, -2.5, 1.0),
        vec4(-1, 0, -3, 1.0), vec4(-1, -1, -3, 1.0)
    ];

    // Texture coordinates for the ground and dummy coordinates for red quads
    var texCoords = [
        // Ground quad
        vec2(0.0, 0.0), vec2(1.0, 0.0),
        vec2(1.0, 1.0), vec2(0.0, 1.0),

        // Parallel red quad (dummy values)
        vec2(0.0, 0.0), vec2(0.0, 0.0),
        vec2(0.0, 0.0), vec2(0.0, 0.0),

        // Perpendicular red quad (dummy values)
        vec2(0.0, 0.0), vec2(0.0, 0.0),
        vec2(0.0, 0.0), vec2(0.0, 0.0)
    ];

    // Create and bind buffer for vertices
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Create and bind buffer for texture coordinates
    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);

    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    mvpMatrixLoc = gl.getUniformLocation(program, "mvpMatrix");

    // Initialize textures
    initTextures();

    render();
};

function initTextures() {
    // Load the xamp23.png texture for the ground quad
    var image = new Image();
    image.onload = function () {
        texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        render();
    };
    image.src = "../textures/xamp23.png";

    // Create a 1x1 red texture for the red quads
    var redPixel = new Uint8Array([255, 0, 0, 255]);
    redTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, redTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, redPixel);
}
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set up the perspective and view matrices
    var projectionMatrix = perspective(90, canvas.width / canvas.height, 0.1, 50.0);
    var viewMatrix = lookAt(vec3(0.0, 0.0, 0.0), vec3(0.0, -1.0, -2.5), vec3(0.0, 1.0, 0.0));
    var modelMatrix = mat4();

    // Compute MVP matrix
    var mvpMatrix = mult(projectionMatrix, mult(viewMatrix, modelMatrix));
    gl.uniformMatrix4fv(mvpMatrixLoc, false, flatten(mvpMatrix));

    // Draw ground quad with texture 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "texture"), 0);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    // Draw red quads with texture 1
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, redTexture);
    gl.uniform1i(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "texture"), 1);
    gl.drawArrays(gl.TRIANGLE_FAN, 4, 4); // Parallel quad
    gl.drawArrays(gl.TRIANGLE_FAN, 8, 4); // Perpendicular quad

    window.requestAnimFrame(render);
}
